/** Calendar dates are stored as local `YYYY-MM-DD` strings — never as timestamps with timezones. */
export type IsoDate = string & { readonly __brand: "IsoDate" };

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` as IsoDate;
}

/** Whole days from `a` to `b` (positive when b is later). DST-safe via UTC. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Adds whole days (negative allowed) to an ISO date. DST-safe via UTC. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = String(dt.getUTCFullYear()).padStart(4, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}` as IsoDate;
}

/** Today's local calendar date. */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}
