import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, PeriodRecord } from "@mt/domain";
import { dueNudges, nextNudgeWake, welcomeBack, type NudgeConfig } from "./nudges";
import { describeNotification, timeAgo } from "./templates";

const d = (s: string) => s as IsoDate;
const config: NudgeConfig = { dailyLog: true, dailyLogTime: "20:00", periodSoon: true, periodLeadDays: 2, periodLate: true, periodEnd: true, periodTime: "09:00" };
const quiet = { enabled: false, from: "22:00", to: "07:00" };
const log = (date: string): DailyLog => ({ date: d(date), symptoms: [], medications: [], updatedAt: "" });
const base = { config, logs: {} as Record<string, DailyLog>, periods: [] as PeriodRecord[], nextPeriod: null as IsoDate | null, fired: new Set<string>(), quiet };

describe("daily log prompt", () => {
  it("fires after the chosen time when nothing is logged today, and says how long it has been", () => {
    const r = dueNudges({ ...base, now: new Date(2026, 10, 16, 20, 5), logs: { "2026-11-12": log("2026-11-12") } });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: "daily-log", key: "daily-log@2026-11-16", daysSinceLastEntry: 4, suppressed: false });
  });
  it("does not fire before the time, after being logged today, twice, or more than 3 hours late", () => {
    expect(dueNudges({ ...base, now: new Date(2026, 10, 16, 19, 59) })).toHaveLength(0);
    expect(dueNudges({ ...base, now: new Date(2026, 10, 16, 20, 30), logs: { "2026-11-16": log("2026-11-16") } })).toHaveLength(0);
    expect(dueNudges({ ...base, now: new Date(2026, 10, 16, 20, 30), fired: new Set(["daily-log@2026-11-16"]) })).toHaveLength(0);
    expect(dueNudges({ ...base, now: new Date(2026, 10, 16, 23, 30) })).toHaveLength(0);
  });
  it("is consumed silently inside quiet hours", () => {
    const r = dueNudges({ ...base, now: new Date(2026, 10, 16, 20, 5), quiet: { enabled: true, from: "20:00", to: "07:00" } });
    expect(r[0].suppressed).toBe(true);
  });
  it("can be switched off", () => {
    expect(dueNudges({ ...base, config: { ...config, dailyLog: false }, now: new Date(2026, 10, 16, 20, 5) })).toHaveLength(0);
  });
});

describe("period prompts", () => {
  const periods: PeriodRecord[] = [{ id: "a", start: d("2026-10-01"), end: d("2026-10-05") }];
  it("warns a few days ahead of the estimate, once", () => {
    const r = dueNudges({ ...base, periods, nextPeriod: d("2026-11-16"), now: new Date(2026, 10, 14, 9, 10), logs: { "2026-11-14": log("2026-11-14") } });
    expect(r.map((x) => x.kind)).toEqual(["period-soon"]);
    expect(r[0].key).toBe("period-soon@2026-11-16");
    expect(dueNudges({ ...base, periods, nextPeriod: d("2026-11-16"), now: new Date(2026, 10, 14, 9, 10), logs: { "2026-11-14": log("2026-11-14") }, fired: new Set([r[0].key]) })).toHaveLength(0);
  });
  it("reminds about a late estimate only from day 3 to day 9 and only while no newer period exists", () => {
    const at = (day: number) => new Date(2026, 10, day, 9, 5);
    const run = (day: number, ps = periods) => dueNudges({ ...base, periods: ps, nextPeriod: d("2026-11-01"), now: at(day), logs: { [`2026-11-${String(day).padStart(2, "0")}`]: log(`2026-11-${String(day).padStart(2, "0")}`) } }).map((x) => x.kind);
    expect(run(3)).toEqual([]);
    expect(run(4)).toEqual(["period-late"]);
    expect(run(10)).toEqual(["period-late"]);
    expect(run(11)).toEqual([]);
    expect(run(5, [...periods, { id: "b", start: d("2026-11-03"), end: null }])).not.toContain("period-late");
  });
  it("asks about the end of a period that has run about a week without an end date", () => {
    const open: PeriodRecord[] = [{ id: "o", start: d("2026-11-10"), end: null }];
    const run = (day: number) => dueNudges({ ...base, periods: open, now: new Date(2026, 10, day, 9, 5), logs: { [`2026-11-${day}`]: log(`2026-11-${day}`) } }).map((x) => x.kind);
    expect(run(15)).toEqual([]);
    expect(run(16)).toEqual(["period-end"]);
    expect(run(19)).toEqual(["period-end"]);
    expect(run(20)).toEqual([]);
  });
});

describe("nextNudgeWake", () => {
  it("returns the time to the next prompt time, tomorrow if today's have passed, and null when everything is off", () => {
    expect(nextNudgeWake(new Date(2026, 10, 16, 19, 0), config)).toBe(60 * 60 * 1000);
    expect(nextNudgeWake(new Date(2026, 10, 16, 21, 0), config)).toBe(12 * 60 * 60 * 1000);
    expect(nextNudgeWake(new Date(2026, 10, 16, 21, 0), { ...config, dailyLog: false, periodSoon: false, periodLate: false, periodEnd: false })).toBeNull();
  });
});

describe("welcomeBack", () => {
  const now = new Date(2026, 10, 16, 12, 0);
  it("appears only after the user has been away for 2 or more days", () => {
    expect(welcomeBack(new Date(2026, 10, 15, 12, 0).toISOString(), {}, now)).toBeNull();
    const w = welcomeBack(new Date(2026, 10, 11, 8, 0).toISOString(), { "2026-11-10": log("2026-11-10") }, now);
    expect(w).toEqual({ daysAway: 5, daysSinceLog: 6 });
  });
  it("ignores unknown, invalid or future timestamps and reports no log gap when nothing was ever logged", () => {
    expect(welcomeBack(null, {}, now)).toBeNull();
    expect(welcomeBack("garbage", {}, now)).toBeNull();
    expect(welcomeBack(new Date(2027, 0, 1).toISOString(), {}, now)).toBeNull();
    expect(welcomeBack(new Date(2026, 9, 1).toISOString(), {}, now)?.daysSinceLog).toBeNull();
  });
});

describe("wording", () => {
  it("greets by name and says how long it has been", () => {
    expect(describeNotification("daily-log", { daysSinceEntry: 5, name: "Asha" }).title).toBe("It has been 5 days since your last entry, Asha");
    expect(describeNotification("daily-log", {}).title).toBe("Time to log today");
    expect(describeNotification("welcome", { name: "Asha" }).title).toBe("Welcome back, Asha");
  });
  it("never states period timing as a fact", () => {
    expect(describeNotification("period-soon").body).toMatch(/estimate/i);
    expect(describeNotification("period-late").body).toMatch(/estimate/i);
  });
  it("formats relative times", () => {
    const now = new Date("2026-11-16T12:00:00Z");
    expect(timeAgo("2026-11-16T11:59:40Z", now)).toBe("Just now");
    expect(timeAgo("2026-11-16T11:30:00Z", now)).toBe("30 min ago");
    expect(timeAgo("2026-11-16T09:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2026-11-14T12:00:00Z", now)).toBe("2 days ago");
  });
});
