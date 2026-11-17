import { describe, expect, it } from "vitest";
import { emptyRecords, type DailyLog, type IsoDate, type RecordsData } from "@mt/domain";
import { DEFAULT_APPEARANCE } from "../stores/appearance";
import { DEFAULT_NOTIFICATION_SETTINGS } from "../stores/notifications";
import { buildBackup, mergeRecords, parseBackup, serializeBackup, type BackupFormat } from "./backup";

const d = (s: string) => s as IsoDate;

function sample(): RecordsData {
  const r = emptyRecords();
  r.periods = [{ id: "p1", start: d("2026-01-02"), end: d("2026-01-06") }, { id: "p2", start: d("2026-01-30"), end: null }];
  const log = (date: string, x: Partial<DailyLog>): DailyLog => ({ date: d(date), symptoms: [], medications: [], updatedAt: "2026-02-01T10:00:00.000Z", ...x });
  r.logs = {
    "2026-01-02": log("2026-01-02", { flow: "heavy", mood: 2, energy: 2, pain: 3, sleepHours: 6.5, symptoms: ["cramps", "back pain"], medications: ["ibuprofen"], notes: "Line one\nLine two | with a pipe\n```json\nand a fence", stress: 4, temperatureC: 36.7, weightKg: 58.4, discharge: "creamy", intimacy: false, hydrationGlasses: 5, exerciseMinutes: 20 }),
    "2026-01-03": log("2026-01-03", { mood: 3 }),
  };
  r.journal = [{ id: "j1", date: d("2026-01-03"), title: "A \"quoted\" title", body: "Body\nwith -----END MENSTRUATION TRACKER DATA----- inside", category: "General", tags: ["a", "b"], updatedAt: "2026-02-01T10:00:00.000Z" }];
  r.reminders = [{ id: "r1", kind: "custom", label: "Walk", time: "18:30", days: [1, 3], leadDays: 0, enabled: true }];
  r.customSymptoms = ["my symptom"];
  return r;
}

const make = (records = sample()) =>
  buildBackup({ records, appearance: { ...DEFAULT_APPEARANCE, userName: "Asha" }, notifications: DEFAULT_NOTIFICATION_SETTINGS, lastActiveAt: "2026-02-10T08:00:00.000Z", now: new Date("2026-02-12T09:00:00.000Z") });

describe("backup round trip", () => {
  for (const format of ["json", "md", "txt"] as BackupFormat[]) {
    it(`restores every record exactly from a .${format} file`, () => {
      const text = serializeBackup(make(), format);
      const res = parseBackup(text);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.backup.records).toEqual(sample());
      expect(res.backup.userName).toBe("Asha");
      expect(res.backup.exportedAt).toBe("2026-02-12T09:00:00.000Z");
      expect(res.backup.lastActiveAt).toBe("2026-02-10T08:00:00.000Z");
      expect(res.backup.countsMismatch).toBe(false);
      expect(res.backup.appearance?.userName).toBe("Asha");
      expect(res.backup.notifications).not.toBeNull();
    });
  }

  it("keeps the readable part of .md and .txt files human-friendly and complete", () => {
    const md = serializeBackup(make(), "md");
    expect(md).toContain("# Menstruation Tracker: backup");
    expect(md).toContain("| 2026-01-02 | 2026-01-06 | 5 |");
    expect(md).toContain("- Temperature (°C): 36.7");
    expect(md).toContain("- Weight (kg): 58.4");
    expect(md).toContain("Line two \\| with a pipe".replace("\\|", "|")); // notes appear in the readable section
    const txt = serializeBackup(make(), "txt");
    expect(txt).toContain("PERIODS");
    expect(txt).toContain("2026-01-02 | Flow: heavy");
    expect(txt).toContain("Walk | custom | 18:30");
  });

  it("can leave the settings out", () => {
    const b = buildBackup({ records: sample(), appearance: DEFAULT_APPEARANCE, notifications: DEFAULT_NOTIFICATION_SETTINGS, lastActiveAt: null, includeSettings: false });
    const res = parseBackup(serializeBackup(b, "json"));
    expect(res.ok && res.backup.appearance).toBeNull();
  });

  it("never exports the background image flag as present", () => {
    const b = make();
    expect(b.settings?.appearance.background.hasImage).toBe(false);
  });
});

describe("parseBackup rejects and tolerates", () => {
  it("rejects unrelated and damaged files with a clear message", () => {
    for (const bad of ["", "hello", "{\"kind\":\"other\"}", "{ not json", "# just a markdown file\n\nno data here"]) {
      const r = parseBackup(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
    }
  });
  it("reads an older records-only JSON export as a legacy backup", () => {
    const r = parseBackup(JSON.stringify(sample()));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.legacy).toBe(true);
      expect(r.backup.counts.logs).toBe(2);
    }
  });
  it("flags a file whose counts no longer match its records", () => {
    const b = make();
    b.counts = { ...b.counts, logs: 99 };
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok && r.backup.countsMismatch).toBe(true);
  });
  it("ignores a stray marker inside a note and still finds the real block", () => {
    const txt = serializeBackup(make(), "txt");
    expect(parseBackup(txt).ok).toBe(true);
  });
  it("cleans out-of-range values from the file instead of trusting them", () => {
    const b = make();
    b.records.logs["2026-01-02"].temperatureC = 99;
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok && r.backup.records.logs["2026-01-02"].temperatureC).toBeUndefined();
  });
});

describe("mergeRecords", () => {
  it("keeps both sides and lets the newer edit win", () => {
    const a = sample();
    const b = sample();
    b.logs["2026-01-02"] = { ...b.logs["2026-01-02"], mood: 5, updatedAt: "2026-03-01T00:00:00.000Z" };
    b.logs["2026-01-09"] = { date: d("2026-01-09"), symptoms: [], medications: [], mood: 4, updatedAt: "" };
    b.customSymptoms = ["another"];
    const m = mergeRecords(a, b);
    expect(Object.keys(m.logs).sort()).toEqual(["2026-01-02", "2026-01-03", "2026-01-09"]);
    expect(m.logs["2026-01-02"].mood).toBe(5);
    expect(m.periods).toHaveLength(2);
    expect(m.customSymptoms.sort()).toEqual(["another", "my symptom"]);
  });
  it("does not let an older imported entry overwrite a newer local one", () => {
    const a = sample();
    a.logs["2026-01-02"] = { ...a.logs["2026-01-02"], mood: 1, updatedAt: "2026-04-01T00:00:00.000Z" };
    const m = mergeRecords(a, sample());
    expect(m.logs["2026-01-02"].mood).toBe(1);
  });
});
