import { emptyRecords, parseRecords, periodDuration, type DailyLog, type JournalEntry, type RecordsData } from "@mt/domain";
import { APP_VERSION } from "@mt/config";
import { sanitizeAppearance, type AppearanceData } from "../stores/appearance";
import { sanitizeSettings, type NotificationSettings } from "../stores/notifications";

/**
 * Complete backup of everything the user entered, in three file types:
 *  - `.json`: the data itself.
 *  - `.md` / `.txt`: a human-readable report of everything, plus the same data in one clearly marked block so the file can
 *    be imported again. (The readable part is for people; only the marked block is read on import.)
 * The files are NOT encrypted. The background image is not included (it can be large); the rest of the settings are.
 */

export type BackupFormat = "json" | "md" | "txt";
export const BACKUP_EXTENSIONS: Record<BackupFormat, string> = { json: "json", md: "md", txt: "txt" };
export const BACKUP_MIME: Record<BackupFormat, string> = { json: "application/json", md: "text/markdown", txt: "text/plain" };
/** Same ceiling as the encrypted vault. */
export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;

const MD_MARK = "<!-- MT-BACKUP-DATA -->";
const TXT_BEGIN = "-----BEGIN MENSTRUATION TRACKER DATA-----";
const TXT_END = "-----END MENSTRUATION TRACKER DATA-----";

export interface BackupCounts { periods: number; logs: number; journal: number; reminders: number }

export interface BackupFile {
  app: "menstruation-tracker";
  kind: "backup";
  formatVersion: 1;
  appVersion: string;
  exportedAt: string;
  /** The last time the app was used on the computer that made the file (drives the "welcome back" message). */
  lastActiveAt: string | null;
  counts: BackupCounts;
  profile: { userName: string };
  records: RecordsData;
  settings?: { appearance: AppearanceData; notifications: NotificationSettings };
}

export const countRecords = (r: RecordsData): BackupCounts => ({
  periods: r.periods.length, logs: Object.keys(r.logs).length, journal: r.journal.length, reminders: r.reminders.length,
});

export function buildBackup(input: {
  records: RecordsData;
  appearance: AppearanceData;
  notifications: NotificationSettings;
  lastActiveAt: string | null;
  includeSettings?: boolean;
  now?: Date;
}): BackupFile {
  const appearance = sanitizeAppearance(input.appearance);
  appearance.background = { ...appearance.background, hasImage: false };
  return {
    app: "menstruation-tracker",
    kind: "backup",
    formatVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: (input.now ?? new Date()).toISOString(),
    lastActiveAt: input.lastActiveAt,
    counts: countRecords(input.records),
    profile: { userName: appearance.userName },
    records: input.records,
    ...(input.includeSettings === false ? {} : { settings: { appearance, notifications: sanitizeSettings(input.notifications) } }),
  };
}

/* ---------------------------------------------------------------- writing */

const cell = (v: string | number | undefined): string => (v === undefined || v === "" ? "" : String(v).replace(/\|/g, "\\|").replace(/\r?\n/g, " "));
const list = (a: readonly string[]): string => (a.length ? a.join(", ") : "");

function logLines(l: DailyLog): string[] {
  const out: string[] = [];
  const add = (k: string, v: string | number | boolean | undefined) => { if (v !== undefined && v !== "") out.push(`${k}: ${typeof v === "boolean" ? (v ? "yes" : "no") : v}`); };
  add("Flow", l.flow);
  add("Mood (1-5)", l.mood);
  add("Energy (1-5)", l.energy);
  add("Pain (0-4)", l.pain);
  add("Stress (1-5)", l.stress);
  add("Sleep (hours)", l.sleepHours);
  add("Water (glasses)", l.hydrationGlasses);
  add("Exercise (minutes)", l.exerciseMinutes);
  add("Temperature (°C)", l.temperatureC);
  add("Weight (kg)", l.weightKg);
  add("Cervical fluid", l.discharge);
  add("Intimacy", l.intimacy);
  add("Symptoms", list(l.symptoms));
  add("Medication or supplements", list(l.medications));
  add("Notes", l.notes?.trim());
  return out;
}

const sortedLogs = (r: RecordsData): DailyLog[] => Object.values(r.logs).sort((a, b) => (a.date < b.date ? -1 : 1));
const sortedJournal = (r: RecordsData): JournalEntry[] => [...r.journal].sort((a, b) => (a.date < b.date ? -1 : 1));

function readableSummary(b: BackupFile): { heading: string; lines: string[] }[] {
  const r = b.records;
  const periods = [...r.periods].sort((a, c) => (a.start < c.start ? -1 : 1)).map((p) => {
    const d = periodDuration(p);
    return `${p.start} to ${p.end ?? "(not ended)"}${d ? ` (${d} days)` : ""}`;
  });
  return [
    { heading: "Periods", lines: periods },
    { heading: "Daily logs", lines: sortedLogs(r).map((l) => `${l.date} | ${logLines(l).join(" | ")}`) },
    {
      heading: "Journal",
      lines: sortedJournal(r).map((j) => `${j.date} | ${j.title || "(untitled)"} [${j.category}${j.tags.length ? `; ${j.tags.join(", ")}` : ""}]\n${j.body}`),
    },
    { heading: "Reminders", lines: r.reminders.map((x) => `${x.label} | ${x.kind} | ${x.time} | ${x.days.length ? `days ${x.days.join(",")}` : "every day"}${x.kind === "period" ? ` | ${x.leadDays} day(s) before` : ""} | ${x.enabled ? "on" : "off"}`) },
    { heading: "Your own symptoms", lines: r.customSymptoms },
  ];
}

export function serializeBackup(b: BackupFile, format: BackupFormat): string {
  if (format === "json") return JSON.stringify(b, null, 2);
  const data = JSON.stringify(b); // one line: newlines inside text are escaped, so the block cannot be broken
  const r = b.records;
  const when = new Date(b.exportedAt).toLocaleString();
  const sections = readableSummary(b);

  if (format === "md") {
    const o: string[] = [
      "# Menstruation Tracker: backup",
      "",
      `> Exported ${when} (${b.exportedAt}) · app version ${b.appVersion}`,
      "> **This file contains private health information and is not encrypted.** Keep it somewhere safe.",
      "",
      "## Summary",
      "",
      `- Name: ${b.profile.userName || "(not set)"}`,
      `- Periods: ${b.counts.periods}`,
      `- Daily logs: ${b.counts.logs}`,
      `- Journal entries: ${b.counts.journal}`,
      `- Reminders: ${b.counts.reminders}`,
      `- Settings included: ${b.settings ? "yes (appearance, notifications, clock)" : "no"}`,
      "",
      "## Periods",
      "",
      "| Start | End | Days |",
      "|---|---|---|",
      ...[...r.periods].sort((a, c) => (a.start < c.start ? -1 : 1)).map((p) => `| ${p.start} | ${cell(p.end ?? "")} | ${cell(periodDuration(p) ?? "")} |`),
      "",
      "## Daily logs",
      "",
    ];
    for (const l of sortedLogs(r)) o.push(`### ${l.date}`, "", ...logLines(l).map((x) => `- ${x.replace(/\r?\n/g, " ")}`), "");
    o.push("## Journal", "");
    for (const j of sortedJournal(r)) o.push(`### ${j.date}: ${j.title || "(untitled)"}`, "", `Category: ${j.category}${j.tags.length ? ` · Tags: ${j.tags.join(", ")}` : ""}`, "", ...j.body.split(/\r?\n/).map((x) => `> ${x}`), "");
    o.push("## Reminders", "", ...(sections[3].lines.length ? sections[3].lines.map((x) => `- ${x}`) : ["(none)"]), "");
    o.push("---", "", "## Data for restoring this backup (do not edit)", "", "The readable sections above are for you. Only the block below is read when you import this file.", "", MD_MARK, "```json", data, "```", "");
    return o.join("\n");
  }

  const o: string[] = [
    "MENSTRUATION TRACKER - BACKUP",
    `Exported: ${when} (${b.exportedAt}), app version ${b.appVersion}`,
    "This file contains private health information and is NOT encrypted. Keep it somewhere safe.",
    "",
    `Name: ${b.profile.userName || "(not set)"}`,
    `Periods: ${b.counts.periods}   Daily logs: ${b.counts.logs}   Journal entries: ${b.counts.journal}   Reminders: ${b.counts.reminders}`,
    `Settings included: ${b.settings ? "yes" : "no"}`,
    "",
  ];
  for (const s of sections) o.push(s.heading.toUpperCase(), "-".repeat(s.heading.length), ...(s.lines.length ? s.lines : ["(none)"]), "");
  o.push("DATA FOR RESTORING THIS BACKUP (do not edit; only this block is read on import)", TXT_BEGIN, data, TXT_END, "");
  return o.join("\n");
}

/* ---------------------------------------------------------------- reading */

export interface ParsedBackup {
  records: RecordsData;
  userName: string;
  exportedAt: string | null;
  lastActiveAt: string | null;
  appVersion: string | null;
  appearance: AppearanceData | null;
  notifications: NotificationSettings | null;
  counts: BackupCounts;
  /** True when the counts stored in the file do not match the records read from it (file edited or truncated). */
  countsMismatch: boolean;
  /** True for a file made by an older version that held only the records. */
  legacy: boolean;
}

export type ParseResult = { ok: true; backup: ParsedBackup } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isoOrNull = (v: unknown): string | null => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null);

function lastMatch(text: string, re: RegExp): string | null {
  let out: string | null = null;
  for (const m of text.matchAll(re)) out = m[1];
  return out;
}

function extractJson(text: string): string | null {
  const t = text.replace(/^\uFEFF/, "");
  const trimmed = t.trimStart();
  if (trimmed.startsWith("{")) return trimmed;
  // The markers must be whole lines, so the same words inside a note (which sits on the long data line) are never mistaken for them.
  const md = lastMatch(t, /^<!-- MT-BACKUP-DATA -->[ \t]*\r?\n```json[ \t]*\r?\n([^\r\n]*)\r?\n```/gm);
  if (md !== null) return md;
  return lastMatch(t, /^-----BEGIN MENSTRUATION TRACKER DATA-----[ \t]*\r?\n([^\r\n]*)\r?\n-----END MENSTRUATION TRACKER DATA-----/gm);
}

/** Reads a backup (any of the three file types) or an older records-only JSON export. Never throws. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: "That file is too large to be a backup of this app." };
  const raw = extractJson(text);
  if (raw === null) return { ok: false, error: "This does not look like a Menstruation Tracker backup. Choose a .json, .md or .txt file that this app exported." };
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return { ok: false, error: "The backup could not be read. The file may be damaged or cut short." };
  }
  if (!isObj(j)) return { ok: false, error: "The backup could not be read." };

  if (j.kind === "backup" && isObj(j.records)) {
    const records = parseRecords(j.records);
    const counts = countRecords(records);
    const stated = isObj(j.counts) ? j.counts : null;
    const mismatch = !!stated && (["periods", "logs", "journal", "reminders"] as const).some((k) => typeof stated[k] === "number" && stated[k] !== counts[k]);
    const s = isObj(j.settings) ? j.settings : null;
    const appearance = s && isObj(s.appearance) ? sanitizeAppearance(s.appearance) : null;
    const profile = isObj(j.profile) ? j.profile : {};
    const name = typeof profile.userName === "string" ? profile.userName : appearance?.userName ?? "";
    return {
      ok: true,
      backup: {
        records, userName: name, exportedAt: isoOrNull(j.exportedAt), lastActiveAt: isoOrNull(j.lastActiveAt),
        appVersion: typeof j.appVersion === "string" ? j.appVersion.slice(0, 20) : null,
        appearance, notifications: s && isObj(s.notifications) ? sanitizeSettings(s.notifications) : null,
        counts, countsMismatch: mismatch, legacy: false,
      },
    };
  }
  // Older export: just the records object.
  if (Array.isArray(j.periods) || isObj(j.logs)) {
    const records = parseRecords(j);
    return { ok: true, backup: { records, userName: "", exportedAt: null, lastActiveAt: null, appVersion: null, appearance: null, notifications: null, counts: countRecords(records), countsMismatch: false, legacy: true } };
  }
  return { ok: false, error: "This file is not a Menstruation Tracker backup." };
}

/* ---------------------------------------------------------------- merging */

/**
 * Combines imported records with the ones on this computer without losing either side: periods are matched by start date,
 * logs by date and journal entries/reminders by id; where both exist the more recently edited one wins.
 */
export function mergeRecords(current: RecordsData, incoming: RecordsData): RecordsData {
  const periods = new Map(current.periods.map((p) => [p.start, p]));
  for (const p of incoming.periods) periods.set(p.start, p);
  const logs: Record<string, DailyLog> = { ...current.logs };
  for (const [k, l] of Object.entries(incoming.logs)) {
    const have = logs[k];
    if (!have || (l.updatedAt ?? "") >= (have.updatedAt ?? "")) logs[k] = l;
  }
  const journal = new Map(current.journal.map((j) => [j.id, j]));
  for (const j of incoming.journal) {
    const have = journal.get(j.id);
    if (!have || (j.updatedAt ?? "") >= (have.updatedAt ?? "")) journal.set(j.id, j);
  }
  const reminders = new Map(current.reminders.map((r) => [r.id, r]));
  for (const r of incoming.reminders) reminders.set(r.id, r);
  return {
    ...emptyRecords(),
    periods: [...periods.values()].sort((a, b) => (a.start < b.start ? -1 : 1)),
    logs,
    journal: [...journal.values()],
    reminders: [...reminders.values()],
    customSymptoms: [...new Set([...current.customSymptoms, ...incoming.customSymptoms])],
  };
}

export const backupFileName = (format: BackupFormat, now = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `menstruation-tracker-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.${BACKUP_EXTENSIONS[format]}`;
};
