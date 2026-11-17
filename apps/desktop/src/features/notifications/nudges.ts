import { addDays, daysBetween, toIsoDate, type DailyLog, type IsoDate, type PeriodRecord } from "@mt/domain";
import { inQuietHours, type QuietHours } from "../reminders/logic";

/**
 * "Remember to record" prompts. Pure functions (no timers, no OS access) so they can be unit-tested.
 * Every prompt is optional, gentle, and says estimates can be wrong; none of them claims to know your health.
 */

export type NudgeKind = "daily-log" | "period-soon" | "period-late" | "period-end";

export interface NudgeConfig {
  dailyLog: boolean;
  dailyLogTime: string;
  periodSoon: boolean;
  periodLeadDays: number;
  periodLate: boolean;
  periodEnd: boolean;
  periodTime: string;
}

export interface NudgeContext {
  now: Date;
  config: NudgeConfig;
  logs: Record<string, DailyLog>;
  periods: readonly PeriodRecord[];
  nextPeriod: IsoDate | null;
  fired: ReadonlySet<string>;
  quiet: QuietHours;
}

export interface DueNudge {
  kind: NudgeKind;
  key: string;
  /** Inside quiet hours: consumed silently instead of being shown late. */
  suppressed: boolean;
  /** For the daily prompt: whole days since the latest entry (null if there is no entry at all). */
  daysSinceLastEntry?: number | null;
}

/** A prompt missed by more than this is dropped rather than shown at a strange time. */
const MAX_LATE_MS = 3 * 60 * 60 * 1000;
/** Prompts about a late period are shown on at most this many days after the 3rd. */
const LATE_FROM_DAYS = 3;
const LATE_UNTIL_DAYS = 9;
const END_FROM_DAYS = 6;
const END_UNTIL_DAYS = 9;

const atTime = (day: IsoDate, hhmm: string): Date => {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi, 0, 0);
};

export function latestEntryDate(logs: Record<string, DailyLog>): IsoDate | null {
  let best: string | null = null;
  for (const k of Object.keys(logs)) if (best === null || k > best) best = k;
  return best as IsoDate | null;
}

/** Prompts that should be shown right now. */
export function dueNudges(ctx: NudgeContext): DueNudge[] {
  const out: DueNudge[] = [];
  const today = toIsoDate(ctx.now);
  const quiet = inQuietHours(ctx.now, ctx.quiet);
  const lateness = (at: Date) => ctx.now.getTime() - at.getTime();
  const within = (at: Date) => lateness(at) >= 0 && lateness(at) <= MAX_LATE_MS;
  const push = (n: Omit<DueNudge, "suppressed">) => { if (!ctx.fired.has(n.key)) out.push({ ...n, suppressed: quiet }); };

  // 1. Nothing logged today yet.
  if (ctx.config.dailyLog && within(atTime(today, ctx.config.dailyLogTime)) && !ctx.logs[today]) {
    const last = latestEntryDate(ctx.logs);
    push({ kind: "daily-log", key: `daily-log@${today}`, daysSinceLastEntry: last ? daysBetween(last, today) : null });
  }

  const periodAt = atTime(today, ctx.config.periodTime);
  const sorted = [...ctx.periods].sort((a, b) => (a.start < b.start ? -1 : 1));
  const latest = sorted[sorted.length - 1];

  if (ctx.nextPeriod) {
    // 2. The estimated start is a few days away.
    if (ctx.config.periodSoon && within(periodAt) && addDays(ctx.nextPeriod, -Math.max(0, ctx.config.periodLeadDays)) === today) {
      push({ kind: "period-soon", key: `period-soon@${ctx.nextPeriod}` });
    }
    // 3. The estimated start passed a few days ago and no new period was recorded.
    const late = daysBetween(ctx.nextPeriod, today);
    if (ctx.config.periodLate && within(periodAt) && late >= LATE_FROM_DAYS && late <= LATE_UNTIL_DAYS && (!latest || latest.start < ctx.nextPeriod)) {
      push({ kind: "period-late", key: `period-late@${today}` });
    }
  }

  // 4. A recorded period still has no end date after about a week.
  if (ctx.config.periodEnd && latest && !latest.end && within(periodAt)) {
    const age = daysBetween(latest.start, today);
    if (age >= END_FROM_DAYS && age <= END_UNTIL_DAYS) push({ kind: "period-end", key: `period-end@${latest.id}@${today}` });
  }
  return out;
}

/** Milliseconds until the next prompt time (today or tomorrow), or null if every prompt is switched off. */
export function nextNudgeWake(now: Date, config: NudgeConfig): number | null {
  const times: string[] = [];
  if (config.dailyLog) times.push(config.dailyLogTime);
  if (config.periodSoon || config.periodLate || config.periodEnd) times.push(config.periodTime);
  if (!times.length) return null;
  const today = toIsoDate(now);
  let best: number | null = null;
  for (const day of [today, addDays(today, 1)]) {
    for (const t of times) {
      const diff = atTime(day, t).getTime() - now.getTime();
      if (diff > 0 && (best === null || diff < best)) best = diff;
    }
  }
  return best;
}

/* ---------------------------------------------------------------- welcome back */

export interface WelcomeInfo {
  /** Whole days since the app was last used. */
  daysAway: number;
  /** Whole days since the latest log entry (null: none yet). */
  daysSinceLog: number | null;
}

/** Days away at which the "welcome back" message appears. */
export const WELCOME_AFTER_DAYS = 2;

export function wholeDaysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

/** Returns the welcome-back details, or null when the user was away less than `minDays` (or the time is unknown/invalid). */
export function welcomeBack(lastActive: string | null, logs: Record<string, DailyLog>, now: Date, minDays = WELCOME_AFTER_DAYS): WelcomeInfo | null {
  if (!lastActive) return null;
  const t = Date.parse(lastActive);
  if (!Number.isFinite(t) || t > now.getTime()) return null;
  const daysAway = wholeDaysBetween(new Date(t), now);
  if (daysAway < minDays) return null;
  const last = latestEntryDate(logs);
  return { daysAway, daysSinceLog: last ? daysBetween(last, toIsoDate(now)) : null };
}
