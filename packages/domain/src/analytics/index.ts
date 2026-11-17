import { addDays, daysBetween, type IsoDate } from "../dates";
import { cycleDay, cycleLengths, periodDuration, type PeriodRecord } from "../cycle";
import { average, type DailyLog, type NumericField } from "../records";

/** Extra analytics. Everything is computed from logged data only and reports its sample size `n`. */

/** Minimum samples before a comparison is shown (avoids conclusions from one or two days). */
export const MIN_SAMPLES = 3;

export interface LoggingStats {
  loggedDays: number;
  rangeDays: number;
  /** 0-1 share of days in range that have any log. */
  consistency: number;
  currentStreak: number;
  longestStreak: number;
}

export function loggingStats(logs: Record<string, DailyLog>, from: IsoDate, to: IsoDate): LoggingStats {
  const rangeDays = Math.max(1, daysBetween(from, to) + 1);
  let logged = 0, longest = 0, run = 0;
  for (let i = 0; i < rangeDays; i++) {
    if (logs[addDays(from, i)]) { logged++; run++; longest = Math.max(longest, run); } else run = 0;
  }
  // Current streak: consecutive logged days ending today (or yesterday, so an unlogged morning does not reset it).
  let streak = 0;
  let d = logs[to] ? to : addDays(to, -1);
  while (d >= from && logs[d]) { streak++; d = addDays(d, -1); }
  return { loggedDays: logged, rangeDays, consistency: logged / rangeDays, currentStreak: streak, longestStreak: longest };
}

export const STAGES = [
  { id: "early", label: "Days 1-5", from: 1, to: 5 },
  { id: "mid", label: "Days 6-13", from: 6, to: 13 },
  { id: "late", label: "Days 14-21", from: 14, to: 21 },
  { id: "pre", label: "Day 22 onward", from: 22, to: 60 },
] as const;

export interface StageAverages {
  id: string;
  label: string;
  n: number;
  mood: number | null;
  energy: number | null;
  pain: number | null;
}

/** Averages of logged values by day of the recorded cycle (counting from each period start). Not a phase prediction. */
export function averagesByCycleDay(periods: readonly PeriodRecord[], logs: readonly DailyLog[]): StageAverages[] {
  return STAGES.map((s) => {
    const inStage = logs.filter((l) => {
      const d = cycleDay(periods, l.date);
      return d !== null && d >= s.from && d <= s.to;
    });
    const vals = (f: NumericField) => inStage.map((l) => l[f]).filter((v): v is number => typeof v === "number");
    return { id: s.id, label: s.label, n: inStage.length, mood: average(vals("mood")), energy: average(vals("energy")), pain: average(vals("pain")) };
  });
}

export interface SymptomByStage { symptom: string; counts: number[]; total: number }

/** For the most frequent symptoms, how many logged days in each cycle-day stage included them. */
export function symptomsByStage(periods: readonly PeriodRecord[], logs: readonly DailyLog[], top = 5): SymptomByStage[] {
  const totals = new Map<string, number[]>();
  for (const l of logs) {
    const d = cycleDay(periods, l.date);
    if (d === null) continue;
    const si = STAGES.findIndex((s) => d >= s.from && d <= s.to);
    if (si < 0) continue;
    for (const sym of new Set(l.symptoms)) {
      const arr = totals.get(sym) ?? STAGES.map(() => 0);
      arr[si] += 1;
      totals.set(sym, arr);
    }
  }
  return [...totals.entries()]
    .map(([symptom, counts]) => ({ symptom, counts, total: counts.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total || a.symptom.localeCompare(b.symptom))
    .slice(0, top);
}

export interface WeekdayAverage { weekday: number; n: number; value: number | null }

/** Average of a logged field by weekday (0 = Sunday). */
export function weekdayAverages(logs: readonly DailyLog[], field: NumericField): WeekdayAverage[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const l of logs) {
    const v = l[field];
    if (typeof v !== "number") continue;
    const [y, m, d] = l.date.split("-").map(Number);
    buckets[new Date(y, m - 1, d).getDay()].push(v);
  }
  return buckets.map((b, weekday) => ({ weekday, n: b.length, value: average(b) }));
}

export interface SleepMood {
  threshold: number;
  better: { n: number; mood: number | null };
  worse: { n: number; mood: number | null };
  /** Only true when both groups have at least MIN_SAMPLES days. */
  enough: boolean;
}

/** Average mood on days with at least `threshold` hours of sleep vs fewer. Descriptive only, not causal. */
export function sleepAndMood(logs: readonly DailyLog[], threshold = 7): SleepMood {
  const hi: number[] = [], lo: number[] = [];
  for (const l of logs) {
    if (typeof l.sleepHours !== "number" || typeof l.mood !== "number") continue;
    (l.sleepHours >= threshold ? hi : lo).push(l.mood);
  }
  return {
    threshold,
    better: { n: hi.length, mood: average(hi) },
    worse: { n: lo.length, mood: average(lo) },
    enough: hi.length >= MIN_SAMPLES && lo.length >= MIN_SAMPLES,
  };
}

export interface CycleTrend {
  recent: number | null;
  previous: number | null;
  /** recent - previous in days; null unless both windows have at least 2 cycles. */
  change: number | null;
  window: number;
}

/** Compares the average of the latest `window` cycles with the `window` before them. */
export function cycleLengthTrend(periods: readonly PeriodRecord[], window = 3): CycleTrend {
  const lens = cycleLengths(periods);
  const recentArr = lens.slice(-window);
  const prevArr = lens.slice(-2 * window, -window);
  const recent = average(recentArr);
  const previous = average(prevArr);
  const ok = recentArr.length >= 2 && prevArr.length >= 2 && recent !== null && previous !== null;
  return { recent, previous, change: ok ? Math.round((recent! - previous!) * 10) / 10 : null, window };
}

/** Day-of-month spread of period starts, e.g. to show how predictable starts are (sample sd in days). */
export function startRegularity(periods: readonly PeriodRecord[]): { n: number; sdDays: number | null } {
  const lens = cycleLengths(periods);
  if (lens.length < 3) return { n: lens.length, sdDays: null };
  const m = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, x) => a + (x - m) ** 2, 0) / (lens.length - 1));
  return { n: lens.length, sdDays: Math.round(sd * 10) / 10 };
}

/* ---------------------------------------------------------------- v0.3.0 additions */

/** Pearson correlation coefficient, or null when it cannot be computed (fewer than 2 pairs or zero variance). */
export function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100;
}

/** Correlations need more days than simple averages before they are worth showing. */
export const MIN_CORRELATION_SAMPLES = 10;

export interface FieldRelation {
  a: NumericField;
  b: NumericField;
  n: number;
  r: number | null;
  /** Only true with at least MIN_CORRELATION_SAMPLES days that have both values and some variation. */
  enough: boolean;
  strength: "none" | "weak" | "moderate" | "strong";
}

/** How two logged values move together across the days that have both. Descriptive only; never proves a cause. */
export function fieldRelation(logs: readonly DailyLog[], a: NumericField, b: NumericField): FieldRelation {
  const xs: number[] = [], ys: number[] = [];
  for (const l of logs) {
    const x = l[a], y = l[b];
    if (typeof x === "number" && typeof y === "number") { xs.push(x); ys.push(y); }
  }
  const r = xs.length >= MIN_CORRELATION_SAMPLES ? pearson(xs, ys) : null;
  const m = r === null ? 0 : Math.abs(r);
  return { a, b, n: xs.length, r, enough: r !== null, strength: m < 0.2 ? "none" : m < 0.4 ? "weak" : m < 0.7 ? "moderate" : "strong" };
}

export interface CoSymptom { a: string; b: string; days: number }

/** Symptom pairs that were logged together on the same day, most frequent first (pairs seen on fewer than MIN_SAMPLES days are omitted). */
export function symptomPairs(logs: readonly DailyLog[], top = 5): CoSymptom[] {
  const counts = new Map<string, number>();
  for (const l of logs) {
    const s = [...new Set(l.symptoms)].sort();
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
      const k = `${s[i]}\u0000${s[j]}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= MIN_SAMPLES)
    .map(([k, days]) => { const [a, b] = k.split("\u0000"); return { a, b, days }; })
    .sort((x, y) => y.days - x.days || x.a.localeCompare(y.a) || x.b.localeCompare(y.b))
    .slice(0, top);
}

/** Everything a daily log can hold, so "how complete is this day" has one definition. */
export const TRACKED_FIELDS = ["flow", "mood", "energy", "pain", "sleep", "symptoms", "water", "exercise", "medication", "notes", "stress", "temperature", "weight", "discharge", "intimacy"] as const;
export type TrackedField = (typeof TRACKED_FIELDS)[number];

export function fieldsLogged(l: DailyLog): TrackedField[] {
  const out: TrackedField[] = [];
  if (l.flow) out.push("flow");
  if (l.mood !== undefined) out.push("mood");
  if (l.energy !== undefined) out.push("energy");
  if (l.pain !== undefined) out.push("pain");
  if (l.sleepHours !== undefined) out.push("sleep");
  if (l.symptoms.length) out.push("symptoms");
  if (l.hydrationGlasses) out.push("water");
  if (l.exerciseMinutes) out.push("exercise");
  if (l.medications.length) out.push("medication");
  if (l.notes?.trim()) out.push("notes");
  if (l.stress !== undefined) out.push("stress");
  if (l.temperatureC !== undefined) out.push("temperature");
  if (l.weightKg !== undefined) out.push("weight");
  if (l.discharge) out.push("discharge");
  if (l.intimacy !== undefined) out.push("intimacy");
  return out;
}

export interface CoverageDay { date: IsoDate; fields: number }

/** One cell per day for the last `days` days (oldest first): how many different things were recorded that day. */
export function coverage(logs: Record<string, DailyLog>, today: IsoDate, days = 84): CoverageDay[] {
  const out: CoverageDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const l = logs[date];
    out.push({ date, fields: l ? fieldsLogged(l).length : 0 });
  }
  return out;
}

export interface FieldUse { field: TrackedField; days: number; share: number }

/** For each thing the app can record, on how many of the logged days in range it was recorded. */
export function fieldUsage(logs: readonly DailyLog[]): FieldUse[] {
  const counts = new Map<TrackedField, number>();
  for (const l of logs) for (const f of fieldsLogged(l)) counts.set(f, (counts.get(f) ?? 0) + 1);
  return TRACKED_FIELDS.map((field) => ({ field, days: counts.get(field) ?? 0, share: logs.length ? (counts.get(field) ?? 0) / logs.length : 0 }))
    .sort((a, b) => b.days - a.days);
}

export interface PeriodLengthStats { n: number; average: number | null; shortest: number | null; longest: number | null }

/** Length of the bleeding part of each recorded period (only periods with an end date). */
export function periodLengthStats(periods: readonly PeriodRecord[]): PeriodLengthStats {
  const lens = periods.map(periodDuration).filter((v): v is number => v !== null);
  return { n: lens.length, average: average(lens), shortest: lens.length ? Math.min(...lens) : null, longest: lens.length ? Math.max(...lens) : null };
}

export interface DayValue { day: number; n: number; value: number }

/** Average of a logged value for each day of the recorded cycle (day 1 = first day of a period). Not an ovulation detector. */
export function valueByCycleDay(periods: readonly PeriodRecord[], logs: readonly DailyLog[], field: NumericField, maxDay = 35): DayValue[] {
  const buckets = new Map<number, number[]>();
  for (const l of logs) {
    const v = l[field];
    if (typeof v !== "number") continue;
    const d = cycleDay(periods, l.date);
    if (d === null || d < 1 || d > maxDay) continue;
    const arr = buckets.get(d) ?? [];
    arr.push(v);
    buckets.set(d, arr);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([day, vals]) => ({ day, n: vals.length, value: average(vals)! }));
}

export interface WindowChange { n: number; recent: number | null; previous: number | null; change: number | null }

/** Average over the last `days` days compared with the `days` before (needs MIN_SAMPLES values in both windows). */
export function recentChange(logs: Record<string, DailyLog>, field: NumericField, today: IsoDate, days = 30): WindowChange {
  const cur: number[] = [], prev: number[] = [];
  for (let i = 0; i < days * 2; i++) {
    const l = logs[addDays(today, -i)];
    const v = l?.[field];
    if (typeof v !== "number") continue;
    (i < days ? cur : prev).push(v);
  }
  const recent = average(cur), previous = average(prev);
  const ok = cur.length >= MIN_SAMPLES && prev.length >= MIN_SAMPLES && recent !== null && previous !== null;
  return { n: cur.length + prev.length, recent, previous, change: ok ? Math.round((recent! - previous!) * 10) / 10 : null };
}
