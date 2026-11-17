import { describe, expect, it } from "vitest";
import {
  cleanLog, emptyRecords, fieldSeries, flowDistribution, monthSummary, parseRecords, symptomFrequency,
  type DailyLog, type IsoDate,
} from "../src";

const log = (date: string, extra: Partial<DailyLog> = {}): DailyLog => ({
  date: date as IsoDate, symptoms: [], medications: [], updatedAt: "2025-01-01T00:00:00Z", ...extra,
});

describe("records", () => {
  it("parseRecords tolerates garbage", () => {
    expect(parseRecords(null)).toEqual(emptyRecords());
    expect(parseRecords({ periods: "x", logs: 5, journal: [null] })).toEqual(emptyRecords());
  });
  it("symptom frequency counts logged days only", () => {
    const logs = [log("2025-01-01", { symptoms: ["cramps", "cramps"] }), log("2025-01-02", { symptoms: ["cramps", "headache"] }), log("2025-01-03")];
    const f = symptomFrequency(logs);
    expect(f[0]).toMatchObject({ symptom: "cramps", days: 2 });
    expect(f[0].share).toBeCloseTo(2 / 3);
  });
  it("series omits missing values instead of inventing them", () => {
    const logs = [log("2025-01-01", { mood: 4 }), log("2025-01-02"), log("2025-01-03", { mood: 2 })];
    expect(fieldSeries(logs, "mood")).toHaveLength(2);
  });
  it("month summary and flow distribution", () => {
    const logs = { "2025-01-01": log("2025-01-01", { flow: "heavy", pain: 3, mood: 2 }), "2025-01-02": log("2025-01-02", { flow: "light", pain: 1 }), "2025-02-01": log("2025-02-01", { mood: 5 }) };
    const m = monthSummary(logs, "2025-01");
    expect(m).toMatchObject({ loggedDays: 2, flowDays: 2, averagePain: 2, averageMood: 2, averageEnergy: null });
    expect(flowDistribution(Object.values(logs))).toEqual({ none: 0, spotting: 0, light: 1, medium: 0, heavy: 1 });
  });
  it("'none' is a recorded day with no bleeding: it is not a flow day", () => {
    const logs = {
      "2025-01-01": log("2025-01-01", { flow: "none", mood: 3 }),
      "2025-01-02": log("2025-01-02", { flow: "spotting" }),
      "2025-01-03": log("2025-01-03", {}),
    };
    const m = monthSummary(logs, "2025-01");
    expect(m.loggedDays).toBe(3);
    expect(m.flowDays).toBe(1);
    expect(flowDistribution(Object.values(logs))).toEqual({ none: 1, spotting: 1, light: 0, medium: 0, heavy: 0 });
  });
  it("cleanLog drops unknown flow values and keeps 'none'", () => {
    expect(cleanLog(log("2025-01-01", { flow: "none" })).flow).toBe("none");
    expect(cleanLog(log("2025-01-01", { flow: "gushing" as never })).flow).toBeUndefined();
  });
});
