import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE, exportAppearance, exportPalette, parseAppearanceFile, parsePaletteFile, sanitizeAppearance, useAppearance } from "./appearance";

beforeEach(() => {
  localStorage.clear();
  useAppearance.getState().replaceAll(structuredClone(DEFAULT_APPEARANCE));
});

describe("sanitizeAppearance (corrupted or hostile stored data)", () => {
  it("returns defaults for non-objects", () => {
    expect(sanitizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(sanitizeAppearance("garbage")).toEqual(DEFAULT_APPEARANCE);
    expect(sanitizeAppearance([1, 2])).toEqual(DEFAULT_APPEARANCE);
  });
  it("clamps numbers, rejects bad enums and colours", () => {
    const s = sanitizeAppearance({
      themeId: "does-not-exist", mode: "purple", logoId: "evil.png",
      typography: { scale: 99, lineHeight: -4, family: 12 },
      background: { blur: 5000, posX: -10, tintColor: "javascript:alert(1)", fit: "stretch" },
      window: { buttonSize: 3, titleStyle: "x" },
      overrides: { accent: "#ABCDEF", text: "not-a-colour", background: 5 },
    });
    expect(s.themeId).toBe(DEFAULT_APPEARANCE.themeId);
    expect(s.mode).toBe("system");
    expect(s.logoId).toBe("bloom-petal");
    expect(s.typography.scale).toBe(1.3);
    expect(s.typography.lineHeight).toBe(1.3);
    expect(s.typography.family).toBe("default");
    expect(s.background.blur).toBe(24);
    expect(s.background.posX).toBe(0);
    expect(s.background.tintColor).toBe(DEFAULT_APPEARANCE.background.tintColor);
    expect(s.background.fit).toBe("cover");
    expect(s.window.buttonSize).toBe(24);
    expect(s.window.titleStyle).toBe("windows");
    expect(s.overrides).toEqual({ accent: "#abcdef" });
  });
  it("keeps custom theme ids only when the palette exists", () => {
    const ok = sanitizeAppearance({ themeId: "custom:a", customPalettes: [{ id: "a", name: "A", accent: "#112233" }] });
    expect(ok.themeId).toBe("custom:a");
    expect(sanitizeAppearance({ themeId: "custom:missing" }).themeId).toBe(DEFAULT_APPEARANCE.themeId);
  });
  it("repairs the dashboard layout", () => {
    const s = sanitizeAppearance({ dashboard: { order: ["journal", "bogus", "journal"], hidden: ["bogus", "mood"] } });
    expect(s.dashboard.hidden).toEqual(["mood"]);
    expect(new Set(s.dashboard.order).size).toBe(s.dashboard.order.length);
    expect(s.dashboard.order[0]).toBe("journal");
    expect(s.dashboard.order).toContain("cycle");
  });
});

describe("appearance store", () => {
  it("persists to localStorage and restores", async () => {
    useAppearance.getState().set("themeId", "sand");
    useAppearance.getState().set("logoId", "heartleaf");
    const saved = JSON.parse(localStorage.getItem("mt.appearance.v2")!);
    expect(saved.state.themeId).toBe("sand");
    expect(saved.state.logoId).toBe("heartleaf");
    expect(saved.state.set).toBeUndefined(); // actions are never persisted
    useAppearance.getState().set("themeId", "ocean");
    await useAppearance.persist.rehydrate();
    expect(useAppearance.getState().themeId).toBe("ocean");
  });
  it("survives a corrupted stored value", async () => {
    localStorage.setItem("mt.appearance.v2", "{not json");
    await expect(useAppearance.persist.rehydrate()).resolves.not.toThrow();
    expect(useAppearance.getState().themeId).toBeTruthy();
  });
  it("manages palettes: add, duplicate, remove resets an active custom theme", () => {
    const st = () => useAppearance.getState();
    const id = st().addPalette({ name: "Mine", accent: "#336699" });
    st().set("themeId", `custom:${id}`);
    const copy = st().duplicatePalette(id)!;
    expect(st().customPalettes).toHaveLength(2);
    expect(st().customPalettes.find((p) => p.id === copy)!.name).toBe("Mine copy");
    st().removePalette(id);
    expect(st().themeId).toBe(DEFAULT_APPEARANCE.themeId);
  });
  it("overrides: set, ignore invalid, clear", () => {
    const st = () => useAppearance.getState();
    st().setOverride("accent", "#ABC");
    expect(st().overrides.accent).toBe("#aabbcc");
    st().setOverride("text", "nope");
    expect(st().overrides.text).toBeUndefined();
    st().resetColors();
    expect(st().overrides).toEqual({});
  });
  it("resetAll restores defaults but keeps the user marked as onboarded", () => {
    useAppearance.getState().patch("typography", { scale: 1.2 });
    useAppearance.getState().resetAll();
    expect(useAppearance.getState().typography.scale).toBe(1);
    expect(useAppearance.getState().onboarded).toBe(true);
  });
});

describe("import / export", () => {
  it("round-trips appearance", () => {
    useAppearance.getState().set("themeId", "plum");
    const parsed = parseAppearanceFile(exportAppearance());
    expect(parsed.ok && parsed.data.themeId).toBe("plum");
  });
  it("rejects wrong or damaged files", () => {
    expect(parseAppearanceFile("nope").ok).toBe(false);
    expect(parseAppearanceFile(JSON.stringify({ kind: "palette" })).ok).toBe(false);
    expect(parseAppearanceFile("x".repeat(2_100_000)).ok).toBe(false);
  });
  it("round-trips palettes and rejects bad ones", () => {
    const text = exportPalette({ id: "x", name: "Sea", accent: "#006699", accent2: "#99ccee" });
    const r = parsePaletteFile(text);
    expect(r.ok && r.palette).toEqual({ name: "Sea", accent: "#006699", accent2: "#99ccee" });
    expect(parsePaletteFile(JSON.stringify({ kind: "palette", palette: { accent: "red" } })).ok).toBe(false);
    expect(parsePaletteFile("{").ok).toBe(false);
  });
});
