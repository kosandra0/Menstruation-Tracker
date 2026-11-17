import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyRecords, type IsoDate } from "@mt/domain";
import { useRecords } from "./records";
import { recordsService } from "../services/records";

const d = (s: string) => s as IsoDate;

beforeEach(() => {
  useRecords.setState({ data: emptyRecords(), loadStatus: "idle", saveStatus: "idle", error: null });
});

describe("records store", () => {
  it("refuses mutations until the vault has loaded (never overwrite unread data)", () => {
    useRecords.getState().upsertJournal({ id: "j", date: d("2025-01-01"), title: "t", body: "", category: "General", tags: [], updatedAt: "" });
    expect(useRecords.getState().data.journal).toHaveLength(0);
  });

  it("loads (in a browser preview, from memory) and then accepts changes", async () => {
    await useRecords.getState().load();
    expect(useRecords.getState().loadStatus).toBe("ready");
    expect(useRecords.getState().persistent).toBe(false);
    useRecords.getState().setLog(d("2025-01-02"), { mood: 4, symptoms: ["cramps"] });
    expect(useRecords.getState().data.logs["2025-01-02"]).toMatchObject({ mood: 4, symptoms: ["cramps"], medications: [] });
    useRecords.getState().deleteLog(d("2025-01-02"));
    expect(useRecords.getState().data.logs["2025-01-02"]).toBeUndefined();
  });

  it("validates periods: rejects overlap and impossible ranges, accepts edits to itself", async () => {
    await useRecords.getState().load();
    const s = () => useRecords.getState();
    expect(s().upsertPeriod({ id: "a", start: d("2025-01-01"), end: d("2025-01-05") })).toBeNull();
    expect(s().upsertPeriod({ id: "b", start: d("2025-01-04"), end: null })).toMatch(/overlaps/);
    expect(s().upsertPeriod({ id: "c", start: d("2025-02-10"), end: d("2025-02-01") })).toMatch(/before/);
    expect(s().upsertPeriod({ id: "a", start: d("2025-01-01"), end: d("2025-01-06") })).toBeNull();
    expect(s().data.periods).toHaveLength(1);
    expect(s().data.periods[0].end).toBe("2025-01-06");
  });

  it("keeps periods sorted and reminders/journal editable", async () => {
    await useRecords.getState().load();
    const s = () => useRecords.getState();
    s().upsertPeriod({ id: "late", start: d("2025-03-01"), end: null });
    s().upsertPeriod({ id: "early", start: d("2025-01-01"), end: null });
    expect(s().data.periods.map((p) => p.id)).toEqual(["early", "late"]);
    s().upsertReminder({ id: "r", kind: "custom", label: "x", time: "08:00", days: [], leadDays: 0, enabled: true });
    s().upsertReminder({ id: "r", kind: "custom", label: "y", time: "08:00", days: [], leadDays: 0, enabled: false });
    expect(s().data.reminders).toHaveLength(1);
    expect(s().data.reminders[0].label).toBe("y");
    s().deleteReminder("r");
    expect(s().data.reminders).toHaveLength(0);
  });

  it("deduplicates custom symptoms and trims input", async () => {
    await useRecords.getState().load();
    useRecords.getState().addCustomSymptom("  joint ache ");
    useRecords.getState().addCustomSymptom("joint ache");
    useRecords.getState().addCustomSymptom("   ");
    expect(useRecords.getState().data.customSymptoms).toEqual(["joint ache"]);
  });

  it("deleteEverything empties records and stays usable", async () => {
    await useRecords.getState().load();
    useRecords.getState().setLog(d("2025-01-02"), { mood: 3 });
    const spy = vi.spyOn(recordsService, "deleteAll");
    await useRecords.getState().deleteEverything();
    expect(spy).toHaveBeenCalled();
    expect(useRecords.getState().data).toEqual(emptyRecords());
    expect(useRecords.getState().loadStatus).toBe("ready");
  });

  it("surfaces a failed load instead of silently starting empty", async () => {
    const spy = vi.spyOn(recordsService, "load").mockRejectedValueOnce({ code: "storage_locked", message: "storage is locked" });
    await useRecords.getState().load();
    expect(useRecords.getState().loadStatus).toBe("error");
    expect(useRecords.getState().error).toBe("storage is locked");
    useRecords.getState().setLog(d("2025-01-02"), { mood: 3 }); // blocked: nothing may be written after a failed load
    expect(useRecords.getState().data.logs).toEqual({});
    spy.mockRestore();
  });
});
