import { describe, expect, it } from "vitest";
import {
  addDays, cycleDay, cycleLengths, dataQuality, estimateNextPeriodStart, summarize, validatePeriod,
  type IsoDate, type PeriodRecord,
} from "../src";

const d = (s: string) => s as IsoDate;
const p = (id: string, start: string, end: string | null = null): PeriodRecord => ({ id, start: d(start), end: end ? d(end) : null });

const regular = [p("a", "2025-01-01", "2025-01-05"), p("b", "2025-01-29", "2025-02-02"), p("c", "2025-02-26", "2025-03-02"), p("d", "2025-03-26", "2025-03-30")];

describe("cycle summary", () => {
  it("returns nulls with no history", () => {
    const s = summarize([]);
    expect(s.recordedCycles).toBe(0);
    expect(s.averageLengthDays).toBeNull();
    expect(dataQuality([])).toBe("none");
  });
  it("computes lengths, average and period duration", () => {
    expect(cycleLengths(regular)).toEqual([28, 28, 28]);
    const s = summarize(regular);
    expect(s.averageLengthDays).toBe(28);
    expect(s.stdDevDays).toBe(0);
    expect(s.averagePeriodDays).toBe(5);
    expect(s.irregular).toBe(false);
    expect(dataQuality(regular)).toBe("fair");
  });
  it("is independent of input order", () => {
    expect(cycleLengths([...regular].reverse())).toEqual([28, 28, 28]);
  });
  it("flags irregular history", () => {
    const irregular = [p("a", "2025-01-01"), p("b", "2025-01-22"), p("c", "2025-03-01"), p("d", "2025-03-20")];
    expect(summarize(irregular).irregular).toBe(true);
  });
});

describe("estimate", () => {
  it("needs at least one completed cycle", () => {
    expect(estimateNextPeriodStart([])).toBeNull();
    expect(estimateNextPeriodStart([p("a", "2025-01-01")])).toBeNull();
  });
  it("is wide with a single cycle and says why", () => {
    const e = estimateNextPeriodStart([p("a", "2025-01-01"), p("b", "2025-01-29")])!;
    expect(e.value).toBe("2025-02-26");
    expect(e.range.earliest).toBe("2025-02-23");
    expect(e.range.latest).toBe("2025-03-01");
    expect(e.basedOnCycles).toBe(1);
    expect(e.uncertaintyNote).toMatch(/only 1 recorded cycle/);
  });
  it("narrows for regular history and widens for variable history", () => {
    const reg = estimateNextPeriodStart(regular)!;
    expect(reg.value).toBe("2025-04-23");
    expect(reg.range.earliest).toBe("2025-04-21");
    expect(reg.range.latest).toBe("2025-04-25");
    const varied = estimateNextPeriodStart([p("a", "2025-01-01"), p("b", "2025-01-25"), p("c", "2025-02-27"), p("d", "2025-03-21")])!;
    const width = (e: typeof reg) => e.range.latest.localeCompare(e.range.earliest);
    expect(width(varied)).toBeGreaterThanOrEqual(width(reg));
    expect(varied.range.latest > reg.value || varied.value).toBeTruthy();
  });
  it("uses only the most recent cycles (old outlier ignored)", () => {
    let start = d("2024-01-01");
    const periods = [p("0", start)];
    [50, 28, 28, 28, 28, 28, 28].forEach((len, i) => {
      start = addDays(start, len);
      periods.push(p(String(i + 1), start));
    });
    const e = estimateNextPeriodStart(periods)!;
    expect(e.basedOnCycles).toBe(6);
    expect(e.value).toBe(addDays(start, 28));
  });
  it("is deterministic", () => {
    expect(estimateNextPeriodStart(regular)).toEqual(estimateNextPeriodStart(regular));
  });
});

describe("cycle day and validation", () => {
  it("computes cycle day from the latest start", () => {
    expect(cycleDay(regular, d("2025-03-26"))).toBe(1);
    expect(cycleDay(regular, d("2025-04-05"))).toBe(11);
    expect(cycleDay(regular, d("2024-12-31"))).toBeNull();
  });
  it("rejects bad or overlapping periods", () => {
    expect(validatePeriod(p("x", "2025-01-10", "2025-01-05"), [])).toMatch(/before/);
    expect(validatePeriod(p("x", "2025-01-03", "2025-01-06"), regular)).toMatch(/overlaps/);
    expect(validatePeriod(p("x", "2025-01-10", "2025-01-14"), regular)).toBeNull();
    expect(validatePeriod(p("a", "2025-01-01", "2025-01-06"), regular)).toBeNull(); // editing itself
  });
});
