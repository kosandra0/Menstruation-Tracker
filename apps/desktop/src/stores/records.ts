import { create } from "zustand";
import {
  emptyRecords, validatePeriod, type DailyLog, type IsoDate, type JournalEntry, type PeriodRecord, type RecordsData, type Reminder,
} from "@mt/domain";
import { recordsService } from "../services/records";
import { toAppError } from "../lib/errors";
import { mergeRecords } from "../lib/backup";

export type LoadStatus = "idle" | "loading" | "ready" | "error";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const newId = (): string =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`).slice(0, 36);

const SAVE_DELAY_MS = 500;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;
let dirty = false;

interface RecordsState {
  data: RecordsData;
  loadStatus: LoadStatus;
  saveStatus: SaveStatus;
  /** False in a plain browser: records live in memory only and the UI must say so. */
  persistent: boolean;
  error: string | null;

  load: () => Promise<void>;
  flush: () => Promise<void>;
  retrySave: () => Promise<void>;

  upsertPeriod: (p: PeriodRecord) => string | null;
  deletePeriod: (id: string) => void;
  setLog: (date: IsoDate, patch: Partial<Omit<DailyLog, "date" | "updatedAt">>) => void;
  replaceLog: (log: DailyLog) => void;
  deleteLog: (date: IsoDate) => void;
  upsertJournal: (e: JournalEntry) => void;
  deleteJournal: (id: string) => void;
  upsertReminder: (r: Reminder) => void;
  deleteReminder: (id: string) => void;
  addCustomSymptom: (name: string) => void;
  /** Irreversible when `replace`. The UI must confirm first. Returns false if the vault is not ready. */
  importData: (incoming: RecordsData, mode: "merge" | "replace") => boolean;
  /** Irreversible. The UI must confirm first. */
  deleteEverything: () => Promise<void>;
}

export const useRecords = create<RecordsState>()((set, get) => {
  /** Applies a mutation only when the vault was loaded successfully (never overwrite unread data). */
  const mutate = (fn: (d: RecordsData) => RecordsData): boolean => {
    if (get().loadStatus !== "ready") return false;
    set((s) => ({ data: fn(s.data) }));
    schedule();
    return true;
  };

  const doSave = async () => {
    if (!get().persistent || get().loadStatus !== "ready") return;
    set({ saveStatus: "saving" });
    try {
      await recordsService.save(get().data);
      dirty = false;
      set({ saveStatus: "saved", error: null });
    } catch (e) {
      set({ saveStatus: "error", error: toAppError(e).message });
    }
  };

  const schedule = () => {
    if (!get().persistent) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saving = doSave().finally(() => { saving = null; });
    }, SAVE_DELAY_MS);
  };

  return {
    data: emptyRecords(),
    loadStatus: "idle",
    saveStatus: "idle",
    persistent: recordsService.persistent,
    error: null,

    load: async () => {
      if (get().loadStatus === "loading") return;
      set({ loadStatus: "loading", error: null });
      try {
        const data = await recordsService.load();
        set({ data, loadStatus: "ready" });
      } catch (e) {
        // Do not fall back to empty data: a later save would overwrite the real vault.
        set({ loadStatus: "error", error: toAppError(e).message });
      }
    },

    flush: async () => {
      clearTimeout(saveTimer);
      await saving;
      if (dirty) await doSave();
    },
    retrySave: async () => {
      await doSave();
    },

    upsertPeriod: (p) => {
      const others = get().data.periods;
      const err = validatePeriod(p, others);
      if (err) return err;
      mutate((d) => ({ ...d, periods: [...d.periods.filter((x) => x.id !== p.id), p].sort((a, b) => (a.start < b.start ? -1 : 1)) }));
      return null;
    },
    deletePeriod: (id) => void mutate((d) => ({ ...d, periods: d.periods.filter((p) => p.id !== id) })),

    setLog: (date, patch) =>
      void mutate((d) => {
        const prev = d.logs[date] ?? { date, symptoms: [], medications: [], updatedAt: "" };
        return { ...d, logs: { ...d.logs, [date]: { ...prev, ...patch, date, updatedAt: new Date().toISOString() } } };
      }),
    replaceLog: (log) => void mutate((d) => ({ ...d, logs: { ...d.logs, [log.date]: { ...log, updatedAt: new Date().toISOString() } } })),
    deleteLog: (date) =>
      void mutate((d) => {
        const logs = { ...d.logs };
        delete logs[date];
        return { ...d, logs };
      }),

    upsertJournal: (e) =>
      void mutate((d) => ({ ...d, journal: [...d.journal.filter((x) => x.id !== e.id), { ...e, updatedAt: new Date().toISOString() }] })),
    deleteJournal: (id) => void mutate((d) => ({ ...d, journal: d.journal.filter((j) => j.id !== id) })),

    upsertReminder: (r) => void mutate((d) => ({ ...d, reminders: [...d.reminders.filter((x) => x.id !== r.id), r] })),
    deleteReminder: (id) => void mutate((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) })),

    addCustomSymptom: (name) => {
      const n = name.trim().slice(0, 40);
      if (!n) return;
      void mutate((d) => (d.customSymptoms.includes(n) ? d : { ...d, customSymptoms: [...d.customSymptoms, n] }));
    },

    importData: (incoming, mode) => mutate((d) => (mode === "replace" ? { ...emptyRecords(), ...incoming } : mergeRecords(d, incoming))),

    deleteEverything: async () => {
      clearTimeout(saveTimer);
      await saving;
      await recordsService.deleteAll();
      set({ data: emptyRecords(), loadStatus: "ready", saveStatus: "idle", error: null });
    },
  };
});
