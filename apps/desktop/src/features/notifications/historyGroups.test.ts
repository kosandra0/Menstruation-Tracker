import { describe, expect, it } from "vitest";
import type { NotificationItem } from "../../stores/notifications";
import { dayLabel, groupByDay } from "./historyGroups";

const item = (id: string, at: string): NotificationItem => ({ id, category: "daily-log", at, read: false });

describe("history day groups", () => {
  // A fixed local "now" so the labels do not depend on the day the test runs.
  const now = new Date(2026, 10, 16, 10, 30); // 16 Nov 2026, local time

  it("labels today and yesterday, and dates older entries", () => {
    expect(dayLabel(new Date(2026, 10, 16, 8).toISOString(), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 10, 15, 23).toISOString(), now)).toBe("Yesterday");
    const older = dayLabel(new Date(2026, 10, 2, 9).toISOString(), now);
    expect(older).not.toBe("Today");
    expect(older).not.toBe("Yesterday");
    expect(older).toMatch(/2026/);
  });

  it("groups newest-first entries by calendar day and keeps their order", () => {
    const list = [
      item("a", new Date(2026, 10, 16, 9).toISOString()),
      item("b", new Date(2026, 10, 16, 7).toISOString()),
      item("c", new Date(2026, 10, 15, 21).toISOString()),
      item("d", new Date(2026, 10, 2, 12).toISOString()),
    ];
    const groups = groupByDay(list, now);
    expect(groups.map((g) => g.label)[0]).toBe("Today");
    expect(groups.map((g) => g.label)[1]).toBe("Yesterday");
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["c"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["d"]);
  });

  it("returns no groups for an empty history", () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
