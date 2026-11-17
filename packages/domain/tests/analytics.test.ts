import { describe, expect, it } from "vitest";
import {
  averagesByCycleDay, cycleLengthTrend, loggingStats, sleepAndMood, symptomsByStage, weekdayAverages,
  type DailyLog, type IsoDate, type PeriodRecord,
} from "../src";

const d = (s: string) => s as IsoDate;
const log = (date: string, x: Partial<DailyLog> = {}): DailyLog => ({ date: d(date), symptoms: [], medications: [], updatedAt: "", ...x });
const per = (id: string, start: string): PeriodRecord => ({ id, start: d(start), end: null });

describe("loggingStats", () => {
  const logs = Object.fromEntries(["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-05", "2025-01-06"].map((x) => [x, log(x)]));
  it("counts days, consistency and streaks", () => {
    const s = loggingStats(logs, d("2025-01-01"), d("2025-01-06"));
    expect(s).toMatchObject({ loggedDays: 5, rangeDays: 6, longestStreak: 3, currentStreak: 2 });
    expect(s.consistency).toBeCloseTo(5 / 6);
  });
  it("keeps the streak alive when today is not logged yet", () => {
    expect(loggingStats(logs, d("2025-01-01"), d("2025-01-07")).currentStreak).toBe(2);
  });
});

describe("cycle-day stage analytics", () => {
  const periods = [per("a", "2025-01-01"), per("b", "2025-01-29")];
  const logs = [log("2025-01-01", { mood: 2, pain: 4, symptoms: ["cramps"] }), log("2025-01-03", { mood: 3, pain: 2, symptoms: ["cramps", "headache"] }), log("2025-01-10", { mood: 5, pain: 0 }), log("2025-01-31", { mood: 1, pain: 3, symptoms: ["cramps"] })];
  it("averages by day of the recorded cycle", () => {
    const r = averagesByCycleDay(periods, logs);
    expect(r[0]).toMatchObject({ id: "early", n: 3, mood: 2, pain: 3 }); // Jan 1, Jan 3, Jan 31 (day 3 of cycle 2)
    expect(r[1]).toMatchObject({ id: "mid", n: 1, mood: 5 });
    expect(r[2].n).toBe(0);
    expect(r[2].mood).toBeNull();
  });
  it("counts symptoms per stage, once per logged day", () => {
    const r = symptomsByStage(periods, logs);
    expect(r[0]).toMatchObject({ symptom: "cramps", total: 3 });
    expect(r[0].counts[0]).toBe(3);
  });
  it("ignores logs before the first recorded period", () => {
    expect(averagesByCycleDay(periods, [log("2024-12-20", { mood: 5 })]).every((s) => s.n === 0)).toBe(true);
  });
});

describe("weekdayAverages, sleep and mood, trend", () => {
  it("averages by weekday (2025-01-01 is a Wednesday = 3)", () => {
    const r = weekdayAverages([log("2025-01-01", { mood: 4 }), log("2025-01-08", { mood: 2 }), log("2025-01-02", { mood: 5 })], "mood");
    expect(r[3]).toEqual({ weekday: 3, n: 2, value: 3 });
    expect(r[4].value).toBe(5);
    expect(r[0].value).toBeNull();
  });
  it("only reports a sleep/mood comparison with enough days on both sides", () => {
    const few = sleepAndMood([log("2025-01-01", { sleepHours: 8, mood: 4 }), log("2025-01-02", { sleepHours: 5, mood: 2 })]);
    expect(few.enough).toBe(false);
    const many = sleepAndMood(Array.from({ length: 6 }, (_, i) => log(`2025-01-0${i + 1}`, { sleepHours: i < 3 ? 8 : 5, mood: i < 3 ? 4 : 2 })));
    expect(many).toMatchObject({ enough: true, better: { n: 3, mood: 4 }, worse: { n: 3, mood: 2 } });
  });
  it("cycle length trend needs two cycles in each window", () => {
    expect(cycleLengthTrend([per("a", "2025-01-01"), per("b", "2025-01-29")]).change).toBeNull();
    const starts = ["2025-01-01", "2025-01-29", "2025-02-26", "2025-03-26", "2025-04-23", "2025-05-24", "2025-06-24", "2025-07-25"]; // 28,28,28,28,31,31,31
    expect(cycleLengthTrend(starts.map((s, i) => per(String(i), s)), 3).change).toBe(3);
  });
});
