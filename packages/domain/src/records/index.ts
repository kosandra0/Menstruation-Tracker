import { addDays, type IsoDate } from "../dates";
import type { PeriodRecord } from "../cycle";

/** `none` = the day was recorded as having no bleeding (distinct from a blank day, which is simply not recorded). */
export type FlowLevel = "none" | "spotting" | "light" | "medium" | "heavy";
export const FLOW_LEVELS: readonly FlowLevel[] = ["none", "spotting", "light", "medium", "heavy"];
/** Levels that mean the person is bleeding (`none` is excluded). */
export const BLEEDING_LEVELS: readonly FlowLevel[] = ["spotting", "light", "medium", "heavy"];

export type DischargeType = "dry" | "sticky" | "creamy" | "watery" | "egg-white";
export const DISCHARGE_TYPES: readonly DischargeType[] = ["dry", "sticky", "creamy", "watery", "egg-white"];

/** One day of optional observations. Every field is optional: logging must never be forced. */
export interface DailyLog {
  date: IsoDate;
  flow?: FlowLevel;
  /** 1 (very low) ... 5 (very good) */
  mood?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  /** 0 none ... 4 severe */
  pain?: 0 | 1 | 2 | 3 | 4;
  sleepHours?: number;
  symptoms: string[];
  hydrationGlasses?: number;
  exerciseMinutes?: number;
  medications: string[];
  notes?: string;
  /** 1 (very calm) ... 5 (very stressed). */
  stress?: 1 | 2 | 3 | 4 | 5;
  /** Body temperature in degrees Celsius (34-42), for example a morning reading. */
  temperatureC?: number;
  /** Body weight in kilograms (20-400). */
  weightKg?: number;
  /** Cervical fluid observation. */
  discharge?: DischargeType;
  /** Whether intimacy was logged that day (a private note, never used for predictions). */
  intimacy?: boolean;
  /** ISO timestamp of the last edit. */
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  date: IsoDate;
  title: string;
  body: string;
  category: string;
  tags: string[];
  updatedAt: string;
}

export type ReminderKind = "period" | "checkin" | "medication" | "custom";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  /** User-visible name inside the app. Notifications use neutral wording unless the user opts out. */
  label: string;
  /** Local time of day, `HH:MM`. */
  time: string;
  /** Days of week 0 (Sunday) ... 6. Empty means every day. Ignored for `period`. */
  days: number[];
  /** For `period` reminders: how many days before the estimated start. */
  leadDays: number;
  enabled: boolean;
}

/** Everything stored in the encrypted vault. `version` enables future migrations. */
export interface RecordsData {
  version: 1;
  periods: PeriodRecord[];
  logs: Record<string, DailyLog>;
  journal: JournalEntry[];
  reminders: Reminder[];
  customSymptoms: string[];
}

export const emptyRecords = (): RecordsData => ({
  version: 1,
  periods: [],
  logs: {},
  journal: [],
  reminders: [],
  customSymptoms: [],
});

/** Built-in symptom ids. Labels live in the presentation layer. */
export const COMMON_SYMPTOMS = [
  "cramps", "headache", "bloating", "back pain", "breast tenderness", "nausea",
  "fatigue", "acne", "cravings", "irritability", "anxiety", "insomnia",
] as const;

const inRange = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** Drops out-of-range or wrongly typed values from the optional fields (older files simply lack them). */
export function cleanLog(l: DailyLog): DailyLog {
  const out: DailyLog = { ...l };
  if (!(FLOW_LEVELS as readonly unknown[]).includes(out.flow)) delete out.flow;
  if (!inRange(out.stress, 1, 5)) delete out.stress;
  if (!inRange(out.temperatureC, 34, 42)) delete out.temperatureC;
  if (!inRange(out.weightKg, 20, 400)) delete out.weightKg;
  if (!(DISCHARGE_TYPES as readonly unknown[]).includes(out.discharge)) delete out.discharge;
  if (typeof out.intimacy !== "boolean") delete out.intimacy;
  return out;
}

/** Defensive parse of vault JSON: unknown shapes become empty collections instead of crashing. */
export function parseRecords(raw: unknown): RecordsData {
  const out = emptyRecords();
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Partial<RecordsData>;
  if (Array.isArray(r.periods)) out.periods = r.periods.filter((p) => p && typeof p.id === "string" && typeof p.start === "string");
  if (r.logs && typeof r.logs === "object") {
    for (const [k, v] of Object.entries(r.logs)) {
      if (v && typeof v === "object" && Array.isArray(v.symptoms) && Array.isArray(v.medications)) out.logs[k] = cleanLog(v);
    }
  }
  if (Array.isArray(r.journal)) out.journal = r.journal.filter((j) => j && typeof j.id === "string");
  if (Array.isArray(r.reminders)) out.reminders = r.reminders.filter((x) => x && typeof x.id === "string");
  if (Array.isArray(r.customSymptoms)) out.customSymptoms = r.customSymptoms.filter((s) => typeof s === "string");
  return out;
}

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export function lastNDays(today: IsoDate, n: number): DateRange {
  return { from: addDays(today, -(n - 1)), to: today };
}

export function logsInRange(logs: Record<string, DailyLog>, range: DateRange): DailyLog[] {
  return Object.values(logs)
    .filter((l) => l.date >= range.from && l.date <= range.to)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface SymptomCount {
  symptom: string;
  days: number;
  /** Share of *logged* days in range on which the symptom appeared (0-1). */
  share: number;
}

/** Symptom frequency over the days the user actually logged (never over unlogged days). */
export function symptomFrequency(logs: readonly DailyLog[]): SymptomCount[] {
  const counts = new Map<string, number>();
  for (const l of logs) for (const s of new Set(l.symptoms)) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .map(([symptom, days]) => ({ symptom, days, share: logs.length ? days / logs.length : 0 }))
    .sort((a, b) => b.days - a.days || a.symptom.localeCompare(b.symptom));
}

export type NumericField = "mood" | "energy" | "pain" | "sleepHours" | "stress" | "temperatureC" | "weightKg" | "hydrationGlasses" | "exerciseMinutes";

/** Points for a numeric field; days without a value are omitted rather than invented. */
export function fieldSeries(logs: readonly DailyLog[], field: NumericField): { date: IsoDate; value: number }[] {
  const out: { date: IsoDate; value: number }[] = [];
  for (const l of logs) {
    const v = l[field];
    if (typeof v === "number" && Number.isFinite(v)) out.push({ date: l.date, value: v });
  }
  return out;
}

export function average(values: readonly number[]): number | null {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  loggedDays: number;
  flowDays: number;
  averageMood: number | null;
  averageEnergy: number | null;
  averagePain: number | null;
  averageSleep: number | null;
}

export function monthSummary(logs: Record<string, DailyLog>, month: string): MonthSummary {
  const inMonth = Object.values(logs).filter((l) => l.date.startsWith(month));
  const nums = (f: NumericField) => fieldSeries(inMonth, f).map((p) => p.value);
  return {
    month,
    loggedDays: inMonth.length,
    flowDays: inMonth.filter((l) => l.flow && l.flow !== "none").length,
    averageMood: average(nums("mood")),
    averageEnergy: average(nums("energy")),
    averagePain: average(nums("pain")),
    averageSleep: average(nums("sleepHours")),
  };
}

/** Flow-level distribution over all logs in range (only days with a recorded flow value, `none` included). */
export function flowDistribution(logs: readonly DailyLog[]): Record<FlowLevel, number> {
  const out: Record<FlowLevel, number> = { none: 0, spotting: 0, light: 0, medium: 0, heavy: 0 };
  for (const l of logs) if (l.flow && l.flow in out) out[l.flow] += 1;
  return out;
}
