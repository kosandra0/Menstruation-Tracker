import type { Estimate } from "../calculations";
import { addDays, daysBetween, type IsoDate } from "../dates";

/** A period the user actually recorded. Users may edit or delete any entry. */
export interface PeriodRecord {
  id: string;
  start: IsoDate;
  /** Inclusive last day of bleeding; `null` while the period is still ongoing / unknown. */
  end: IsoDate | null;
}

export interface CycleSummary {
  /** Number of completed cycles (gaps between two recorded period starts). */
  recordedCycles: number;
  averageLengthDays: number | null;
  medianLengthDays: number | null;
  /** Sample standard deviation of cycle length (null with fewer than 2 cycles). */
  stdDevDays: number | null;
  shortestDays: number | null;
  longestDays: number | null;
  averagePeriodDays: number | null;
  /** True when recorded cycles vary a lot (longest-shortest > 9 days, or sd > 4.5). */
  irregular: boolean;
}

export type DataQuality = "none" | "limited" | "fair" | "good";

export interface CycleEstimator {
  summarize(periods: readonly PeriodRecord[]): CycleSummary;
  estimateNextPeriodStart(periods: readonly PeriodRecord[]): Estimate<IsoDate> | null;
}

/** How many most-recent cycles feed the estimate. Older cycles are less representative. */
export const ESTIMATE_WINDOW = 6;

export function sortPeriods(periods: readonly PeriodRecord[]): PeriodRecord[] {
  return [...periods].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/** Days between consecutive period starts, oldest first. */
export function cycleLengths(periods: readonly PeriodRecord[]): number[] {
  const sorted = sortPeriods(periods);
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) out.push(daysBetween(sorted[i - 1].start, sorted[i].start));
  return out.filter((n) => n > 0);
}

/** Inclusive duration in days of a period with a known end. */
export function periodDuration(p: PeriodRecord): number | null {
  return p.end ? daysBetween(p.start, p.end) + 1 : null;
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stdDev(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function summarize(periods: readonly PeriodRecord[]): CycleSummary {
  const lengths = cycleLengths(periods);
  const durations = periods.map(periodDuration).filter((d): d is number => d !== null && d > 0);
  const sd = lengths.length >= 2 ? stdDev(lengths) : null;
  const shortest = lengths.length ? Math.min(...lengths) : null;
  const longest = lengths.length ? Math.max(...lengths) : null;
  return {
    recordedCycles: lengths.length,
    averageLengthDays: lengths.length ? round1(mean(lengths)) : null,
    medianLengthDays: lengths.length ? median(lengths) : null,
    stdDevDays: sd === null ? null : round1(sd),
    shortestDays: shortest,
    longestDays: longest,
    averagePeriodDays: durations.length ? round1(mean(durations)) : null,
    irregular: lengths.length >= 3 && shortest !== null && longest !== null && (longest - shortest > 9 || (sd ?? 0) > 4.5),
  };
}

export function dataQuality(periods: readonly PeriodRecord[]): DataQuality {
  const n = cycleLengths(periods).length;
  if (n === 0) return "none";
  if (n < 3) return "limited";
  if (n < 6) return "fair";
  return "good";
}

/**
 * Deterministic next-period estimate from recorded history only.
 *
 * Method (documented in docs/ARCHITECTURE.md): take the most recent {@link ESTIMATE_WINDOW} cycle lengths,
 * use their median as the central value (robust to one-off outliers), and build a range from the observed
 * spread. The half-width is max(2, ceil(1.5 * sd)) days, widened to at least 3 days with fewer than 3 cycles
 * because a small sample says little about variability. Needs at least one completed cycle (two starts).
 */
export function estimateNextPeriodStart(periods: readonly PeriodRecord[]): Estimate<IsoDate> | null {
  const sorted = sortPeriods(periods);
  const lengths = cycleLengths(sorted).slice(-ESTIMATE_WINDOW);
  if (!sorted.length || !lengths.length) return null;
  const last = sorted[sorted.length - 1].start;
  const central = Math.round(median(lengths));
  const sd = lengths.length >= 2 ? stdDev(lengths) : 0;
  let half = Math.max(2, Math.ceil(1.5 * sd));
  if (lengths.length < 3) half = Math.max(half, 3);
  const note =
    lengths.length < 3
      ? `Based on only ${lengths.length} recorded cycle${lengths.length === 1 ? "" : "s"}; the range is wide on purpose and will narrow as you record more.`
      : sd > 4.5
        ? `Your recorded cycles vary (${Math.min(...lengths)}-${Math.max(...lengths)} days), so this estimate is rough.`
        : `Based on your last ${lengths.length} recorded cycles (typically ${Math.min(...lengths)}-${Math.max(...lengths)} days).`;
  return {
    value: addDays(last, central),
    range: { earliest: addDays(last, central - half), latest: addDays(last, central + half) },
    basedOnCycles: lengths.length,
    uncertaintyNote: note,
  };
}

/** 1-based cycle day for `today`, or null if there is no period started on/before today. */
export function cycleDay(periods: readonly PeriodRecord[], today: IsoDate): number | null {
  const started = sortPeriods(periods).filter((p) => p.start <= today);
  if (!started.length) return null;
  return daysBetween(started[started.length - 1].start, today) + 1;
}

/** Returns an error message if the period is invalid or overlaps another, else null. */
export function validatePeriod(candidate: PeriodRecord, others: readonly PeriodRecord[]): string | null {
  if (candidate.end && candidate.end < candidate.start) return "The end date cannot be before the start date.";
  if (candidate.end && daysBetween(candidate.start, candidate.end) > 20) return "A period longer than 21 days looks like a mistake. Please check the dates.";
  const cEnd = candidate.end ?? candidate.start;
  for (const o of others) {
    if (o.id === candidate.id) continue;
    const oEnd = o.end ?? o.start;
    if (candidate.start <= oEnd && o.start <= cEnd) return "This period overlaps one you already recorded.";
  }
  return null;
}

export const defaultEstimator: CycleEstimator = {
  summarize,
  estimateNextPeriodStart,
};
