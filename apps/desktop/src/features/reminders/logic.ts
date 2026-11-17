import { addDays, toIsoDate, type IsoDate, type Reminder } from "@mt/domain";

/** Pure reminder scheduling rules (no timers, no OS access) so they can be unit-tested. */

export interface QuietHours { enabled: boolean; from: string; to: string }

const MAX_LATE_MS = 60 * 60 * 1000; // a reminder missed by more than an hour is dropped, not fired late
const MAX_SLEEP_MS = 15 * 60 * 1000; // always re-evaluate at least this often (covers sleep/resume, DST, timezone change)
const MIN_SLEEP_MS = 1000;

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** True when `now` falls inside quiet hours (supports ranges that wrap past midnight). */
export function inQuietHours(now: Date, q: QuietHours): boolean {
  if (!q.enabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = minutes(q.from), to = minutes(q.to);
  if (from === to) return false;
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

/** The local Date at which `r` should fire on calendar day `day`, or null if it does not fire that day. */
export function scheduledAt(r: Reminder, day: IsoDate, nextPeriod: IsoDate | null): Date | null {
  if (!r.enabled || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) return null;
  const [y, mo, d] = day.split("-").map(Number);
  if (r.kind === "period") {
    if (!nextPeriod || addDays(nextPeriod, -Math.max(0, r.leadDays)) !== day) return null;
  } else if (r.days.length > 0 && !r.days.includes(new Date(y, mo - 1, d).getDay())) {
    return null;
  }
  const [h, m] = r.time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

export const occurrenceKey = (r: Reminder, at: Date): string => `${r.id}@${toIsoDate(at)}T${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;

export interface DueContext {
  now: Date;
  reminders: readonly Reminder[];
  nextPeriod: IsoDate | null;
  fired: ReadonlySet<string>;
  quiet: QuietHours;
}

/** Reminders that should fire right now: scheduled time passed (but not by > 1 h), not yet fired, outside quiet hours. */
export function dueNow(ctx: DueContext): { reminder: Reminder; key: string; suppressed: boolean }[] {
  const out: { reminder: Reminder; key: string; suppressed: boolean }[] = [];
  const day = toIsoDate(ctx.now);
  for (const r of ctx.reminders) {
    const at = scheduledAt(r, day, ctx.nextPeriod);
    if (!at) continue;
    const late = ctx.now.getTime() - at.getTime();
    if (late < 0 || late > MAX_LATE_MS) continue;
    const key = occurrenceKey(r, at);
    if (ctx.fired.has(key)) continue;
    out.push({ reminder: r, key, suppressed: inQuietHours(ctx.now, ctx.quiet) });
  }
  return out;
}

/** Milliseconds until the scheduler should look again (next scheduled time today/tomorrow, capped). */
export function nextWake(ctx: Omit<DueContext, "fired" | "quiet">): number {
  const today = toIsoDate(ctx.now);
  let best = MAX_SLEEP_MS;
  for (const day of [today, addDays(today, 1)]) {
    for (const r of ctx.reminders) {
      const at = scheduledAt(r, day, ctx.nextPeriod);
      if (!at) continue;
      const diff = at.getTime() - ctx.now.getTime();
      if (diff > 0 && diff < best) best = diff;
    }
  }
  return Math.max(MIN_SLEEP_MS, best + 250);
}

/** Notification wording. Neutral by default so nothing sensitive appears on a lock screen. */
export function notificationText(r: Reminder, neutral: boolean): { title: string; body: string } {
  if (neutral) return { title: "Reminder", body: "You have a reminder in your app." };
  return { title: "Menstruation Tracker", body: r.label };
}
