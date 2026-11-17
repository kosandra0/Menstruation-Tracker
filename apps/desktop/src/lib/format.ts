import type { IsoDate } from "@mt/domain";

/** Local Date for an ISO calendar date (no timezone shifting). */
export function parseIso(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export const fmtLong = (d: string) => parseIso(d).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtShort = (d: string) => parseIso(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const fmtMedium = (d: string) => parseIso(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const fmtMonthYear = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const monthKey = (d: IsoDate | string) => d.slice(0, 7);

/** Triggers a browser download of a text file (user-initiated exports only). */
export function downloadText(filename: string, text: string, type = "text/plain"): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** CSV cell escaping, including protection against spreadsheet formula injection. */
export function csvCell(v: unknown): string {
  let s = v === undefined || v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
