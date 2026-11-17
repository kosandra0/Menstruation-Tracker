import { describe, expect, it } from "vitest";
import { daysBetween, isIsoDate, toIsoDate, type IsoDate } from "../src";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2025-02-28")).toBe(true);
    expect(isIsoDate("2025-02-30")).toBe(false);
    expect(isIsoDate("25-2-3")).toBe(false);
  });
  it("formats local dates", () => {
    expect(toIsoDate(new Date(2024, 0, 5))).toBe("2024-01-05");
  });
  it("counts days across DST and leap years", () => {
    expect(daysBetween("2024-02-28" as IsoDate, "2024-03-01" as IsoDate)).toBe(2);
    expect(daysBetween("2025-03-01" as IsoDate, "2025-02-01" as IsoDate)).toBe(-28);
  });
});
