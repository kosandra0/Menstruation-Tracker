import { describe, expect, it } from "vitest";
import type { IsoDate, Reminder } from "@mt/domain";
import { dueNow, inQuietHours, nextWake, notificationText, occurrenceKey, scheduledAt } from "./logic";

const r = (over: Partial<Reminder> = {}): Reminder => ({ id: "r1", kind: "checkin", label: "Check in", time: "20:00", days: [], leadDays: 0, enabled: true, ...over });
const noQuiet = { enabled: false, from: "22:00", to: "07:00" };
const D = (s: string) => s as IsoDate;

describe("quiet hours", () => {
  it("handles ranges that wrap midnight", () => {
    const q = { enabled: true, from: "22:00", to: "07:00" };
    expect(inQuietHours(new Date(2025, 0, 1, 23, 0), q)).toBe(true);
    expect(inQuietHours(new Date(2025, 0, 1, 6, 59), q)).toBe(true);
    expect(inQuietHours(new Date(2025, 0, 1, 7, 0), q)).toBe(false);
    expect(inQuietHours(new Date(2025, 0, 1, 12, 0), q)).toBe(false);
  });
  it("is off when disabled", () => {
    expect(inQuietHours(new Date(2025, 0, 1, 23, 0), noQuiet)).toBe(false);
  });
});

describe("scheduling", () => {
  it("respects weekdays (Wed 2025-01-01 is day 3)", () => {
    expect(scheduledAt(r({ days: [3] }), D("2025-01-01"), null)).not.toBeNull();
    expect(scheduledAt(r({ days: [1] }), D("2025-01-01"), null)).toBeNull();
  });
  it("period reminders fire lead days before the estimate", () => {
    expect(scheduledAt(r({ kind: "period", leadDays: 2 }), D("2025-03-03"), D("2025-03-05"))).not.toBeNull();
    expect(scheduledAt(r({ kind: "period", leadDays: 2 }), D("2025-03-04"), D("2025-03-05"))).toBeNull();
    expect(scheduledAt(r({ kind: "period" }), D("2025-03-05"), null)).toBeNull();
  });
  it("disabled or malformed reminders never fire", () => {
    expect(scheduledAt(r({ enabled: false }), D("2025-01-01"), null)).toBeNull();
    expect(scheduledAt(r({ time: "25:99" }), D("2025-01-01"), null)).toBeNull();
  });
});

describe("dueNow", () => {
  const base = { reminders: [r()], nextPeriod: null, quiet: noQuiet };
  it("fires once, shortly after the scheduled time", () => {
    const now = new Date(2025, 0, 1, 20, 0, 30);
    const [d] = dueNow({ ...base, now, fired: new Set() });
    expect(d.reminder.id).toBe("r1");
    expect(dueNow({ ...base, now, fired: new Set([d.key]) })).toHaveLength(0); // no duplicates
  });
  it("does not fire early or more than an hour late", () => {
    expect(dueNow({ ...base, now: new Date(2025, 0, 1, 19, 59), fired: new Set() })).toHaveLength(0);
    expect(dueNow({ ...base, now: new Date(2025, 0, 1, 21, 5), fired: new Set() })).toHaveLength(0);
  });
  it("marks occurrences inside quiet hours as suppressed", () => {
    const now = new Date(2025, 0, 1, 23, 0, 10);
    const [d] = dueNow({ reminders: [r({ time: "23:00" })], nextPeriod: null, now, fired: new Set(), quiet: { enabled: true, from: "22:00", to: "07:00" } });
    expect(d.suppressed).toBe(true);
  });
  it("keys differ per day", () => {
    expect(occurrenceKey(r(), new Date(2025, 0, 1, 20, 0))).not.toBe(occurrenceKey(r(), new Date(2025, 0, 2, 20, 0)));
  });
});

describe("nextWake and wording", () => {
  it("sleeps until the next occurrence but never longer than 15 minutes", () => {
    const now = new Date(2025, 0, 1, 19, 55, 0);
    expect(nextWake({ now, reminders: [r()], nextPeriod: null })).toBeLessThanOrEqual(5 * 60 * 1000 + 250);
    expect(nextWake({ now: new Date(2025, 0, 1, 8, 0), reminders: [r()], nextPeriod: null })).toBe(15 * 60 * 1000 + 250);
    expect(nextWake({ now, reminders: [], nextPeriod: null })).toBe(15 * 60 * 1000 + 250);
  });
  it("uses neutral wording by default", () => {
    expect(notificationText(r({ label: "Take pill" }), true).body).not.toMatch(/pill/);
    expect(notificationText(r({ label: "Take pill" }), false).body).toBe("Take pill");
  });
});
