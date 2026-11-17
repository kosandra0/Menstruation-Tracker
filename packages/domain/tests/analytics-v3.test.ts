import { describe, expect, it } from "vitest";
import {
  cleanLog, coverage, fieldRelation, fieldUsage, fieldsLogged, parseRecords, pearson, periodLengthStats, recentChange,
  symptomPairs, valueByCycleDay, type DailyLog, type IsoDate, type PeriodRecord,
} from "../src";

const d = (s: string) => s as IsoDate;
const log = (date: string, x: Partial<DailyLog> = {}): DailyLog => ({ date: d(date), symptoms: [], medications: [], updatedAt: "", ...x });
const day = (i: number) => `2025-03-${String(i).padStart(2, "0")}`;

describe("pearson / fieldRelation", () => {
  it("is 1 for a perfect line, -1 for a perfect inverse and null without variation", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBe(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBe(-1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(pearson([1], [1])).toBeNull();
  });
  it("refuses to report a relation from fewer than 10 days", () => {
    const logs = Array.from({ length: 9 }, (_, i) => log(day(i + 1), { stress: ((i % 5) + 1) as 1, pain: (i % 5) as 0 }));
    const r = fieldRelation(logs, "stress", "pain");
    expect(r.enough).toBe(false);
    expect(r.r).toBeNull();
  });
  it("reports strength once there are enough days", () => {
    const logs = Array.from({ length: 12 }, (_, i) => log(day(i + 1), { stress: ((i % 5) + 1) as 1, pain: (i % 5) as 0 }));
    const r = fieldRelation(logs, "stress", "pain");
    expect(r.enough).toBe(true);
    expect(r.r).toBe(1);
    expect(r.strength).toBe("strong");
  });
});

describe("symptomPairs", () => {
  it("lists pairs seen together on at least 3 days, never fewer", () => {
    const logs = [
      ...[1, 2, 3].map((i) => log(day(i), { symptoms: ["cramps", "bloating"] })),
      log(day(4), { symptoms: ["cramps", "headache"] }),
    ];
    expect(symptomPairs(logs)).toEqual([{ a: "bloating", b: "cramps", days: 3 }]);
  });
});

describe("coverage / fieldUsage / fieldsLogged", () => {
  it("counts recorded fields including the new ones", () => {
    const l = log(day(2), { mood: 4, stress: 2, temperatureC: 36.6, weightKg: 60, discharge: "creamy", intimacy: false, notes: "  ", symptoms: ["x"] });
    expect(fieldsLogged(l).sort()).toEqual(["discharge", "intimacy", "mood", "stress", "symptoms", "temperature", "weight"].sort());
  });
  it("builds one cell per day, oldest first, with zero for unlogged days", () => {
    const logs = { [day(3)]: log(day(3), { mood: 3, energy: 3 }) };
    const c = coverage(logs, d(day(5)), 5);
    expect(c.map((x) => x.date)).toEqual([day(1), day(2), day(3), day(4), day(5)]);
    expect(c.map((x) => x.fields)).toEqual([0, 0, 2, 0, 0]);
  });
  it("reports usage as a share of logged days", () => {
    const u = fieldUsage([log(day(1), { mood: 3 }), log(day(2), { mood: 4, pain: 1 })]);
    expect(u[0]).toMatchObject({ field: "mood", days: 2, share: 1 });
    expect(u.find((x) => x.field === "pain")).toMatchObject({ days: 1, share: 0.5 });
  });
});

describe("periodLengthStats", () => {
  it("uses only periods that have an end date", () => {
    const ps: PeriodRecord[] = [
      { id: "a", start: d("2025-01-01"), end: d("2025-01-05") },
      { id: "b", start: d("2025-01-29"), end: d("2025-02-01") },
      { id: "c", start: d("2025-02-26"), end: null },
    ];
    expect(periodLengthStats(ps)).toEqual({ n: 2, average: 4.5, shortest: 4, longest: 5 });
  });
});

describe("valueByCycleDay / recentChange", () => {
  it("averages by day since the last recorded period start", () => {
    const ps: PeriodRecord[] = [{ id: "a", start: d("2025-03-01"), end: null }];
    const logs = [log("2025-03-01", { temperatureC: 36.4 }), log("2025-03-02", { temperatureC: 36.6 }), log("2025-03-02", { temperatureC: 36.8 })];
    const v = valueByCycleDay(ps, logs, "temperatureC");
    expect(v[0]).toEqual({ day: 1, n: 1, value: 36.4 });
    expect(v[1]).toMatchObject({ day: 2, n: 2 });
  });
  it("needs 3 values in both windows before reporting a change", () => {
    const logs: Record<string, DailyLog> = {};
    for (let i = 0; i < 4; i++) logs[day(20 - i)] = log(day(20 - i), { weightKg: 60 });
    expect(recentChange(logs, "weightKg", d(day(20)), 7).change).toBeNull();
    for (let i = 7; i < 10; i++) logs[day(20 - i)] = log(day(20 - i), { weightKg: 59 });
    expect(recentChange(logs, "weightKg", d(day(20)), 7).change).toBe(1);
  });
});

describe("cleanLog / parseRecords with the new fields", () => {
  it("drops out-of-range or wrongly typed new values and keeps valid ones", () => {
    const c = cleanLog(log(day(1), { stress: 9 as 5, temperatureC: 12, weightKg: 70, discharge: "bogus" as "dry", intimacy: "yes" as unknown as boolean }));
    expect(c.stress).toBeUndefined();
    expect(c.temperatureC).toBeUndefined();
    expect(c.weightKg).toBe(70);
    expect(c.discharge).toBeUndefined();
    expect(c.intimacy).toBeUndefined();
  });
  it("reads files written before these fields existed", () => {
    const r = parseRecords({ version: 1, periods: [], logs: { [day(1)]: log(day(1), { mood: 3 }) }, journal: [], reminders: [], customSymptoms: [] });
    expect(r.logs[day(1)].mood).toBe(3);
  });
});
