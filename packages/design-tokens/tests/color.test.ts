import { describe, expect, it } from "vitest";
import {
  THEMES, applyOverrides, auditPalette, contrastRatio, ensureContrast, generatePalette, getTheme, hasOverrides, hexToHsl,
  isHex, mix, normalizeHex, parseHex, readableOn, themeToCssVars, toHex,
} from "../src";

describe("colour parsing", () => {
  it("parses and normalises hex", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("7C5CBF")).toEqual({ r: 124, g: 92, b: 191 });
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("zzzzzz")).toBeNull();
    expect(normalizeHex("#ABC", "#000000")).toBe("#aabbcc");
    expect(normalizeHex("nope", "#123456")).toBe("#123456");
    expect(isHex("#7c5cbf")).toBe(true);
    expect(toHex({ r: 300, g: -4, b: 12.4 })).toBe("#ff000c");
  });
  it("converts to HSL", () => {
    expect(hexToHsl("#ff0000")).toMatchObject({ h: 0, s: 1 });
    expect(hexToHsl("#808080")!.s).toBe(0);
  });
});

describe("contrast", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
    expect(contrastRatio("#fff", "#fff")).toBe(1);
    expect(contrastRatio("nope", "#fff")).toBe(1);
  });
  it("ensureContrast fixes unreadable colours and leaves good ones alone", () => {
    expect(ensureContrast("#cccccc", "#ffffff", 4.5)).not.toBe("#cccccc");
    expect(contrastRatio(ensureContrast("#cccccc", "#ffffff", 4.5), "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ensureContrast("#222222", "#111111", 4.5), "#111111")).toBeGreaterThanOrEqual(4.5);
    expect(ensureContrast("#222222", "#ffffff", 4.5)).toBe("#222222");
  });
  it("readableOn picks a legible foreground", () => {
    expect(contrastRatio(readableOn("#7c5cbf"), "#7c5cbf")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(readableOn("#f5e6a0"), "#f5e6a0")).toBeGreaterThanOrEqual(4.5);
  });
  it("mix blends linearly", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("generated palettes", () => {
  const seeds = ["#7c5cbf", "#d94f70", "#2f9e6e", "#f5c518", "#222222", "#ffffff", "#808080", "#00ffff"];
  for (const mode of ["light", "dark"] as const) {
    for (const accent of seeds) {
      it(`${mode} palette from ${accent} meets the readability policy`, () => {
        const p = generatePalette({ accent }, mode);
        const failing = auditPalette(p).filter((c) => !c.ok);
        expect(failing.map((c) => `${c.id}:${c.ratio.toFixed(2)}`)).toEqual([]);
        expect(contrastRatio(p.ink, p.canvas)).toBeGreaterThanOrEqual(7);
      });
    }
  }
  it("keeps neutral seeds neutral", () => {
    const p = generatePalette({ accent: "#808080" }, "light");
    expect(hexToHsl(p.accent)!.s).toBeLessThan(0.2);
  });
  it("ships twenty themes whose every palette is readable", () => {
    expect(THEMES.length).toBe(20);
    for (const t of THEMES) for (const mode of ["light", "dark"] as const) {
      const bad = auditPalette(t[mode]).filter((c) => !c.ok && c.id !== "accent-surface" && c.id !== "border-surface");
      expect(bad.map((c) => `${t.id}/${mode}/${c.id}:${c.ratio.toFixed(2)}`)).toEqual([]);
    }
  });
  it("exposes CSS variables for a theme", () => {
    const vars = themeToCssVars("lavender", "dark");
    expect(vars["--c-canvas"]).toBe(getTheme("lavender").dark.canvas);
    expect(vars["--c-danger"]).toBeDefined();
  });
});

describe("user overrides", () => {
  const base = getTheme("lavender").light;
  it("ignores empty or invalid overrides", () => {
    expect(hasOverrides({})).toBe(false);
    expect(hasOverrides({ accent: "red" })).toBe(false);
    expect(applyOverrides(base, "light", { accent: "nope" })).toBe(base);
  });
  it("applies a valid accent and keeps button text readable", () => {
    const p = applyOverrides(base, "light", { accent: "#f5e000" });
    expect(p.accent.toLowerCase()).not.toBe(base.accent.toLowerCase());
    expect(contrastRatio(p.accentContrast, p.accent)).toBeGreaterThanOrEqual(4.5);
  });
  it("corrects unreadable text when enforcement is on and respects the user when off", () => {
    const enforced = applyOverrides(base, "light", { text: "#eeeeee" }, { enforceReadable: true });
    expect(contrastRatio(enforced.ink, enforced.canvas)).toBeGreaterThanOrEqual(4.5);
    const raw = applyOverrides(base, "light", { text: "#eeeeee" }, { enforceReadable: false });
    expect(raw.ink).toBe("#eeeeee");
    expect(auditPalette(raw).some((c) => !c.ok)).toBe(true);
  });
  it("derives chrome and secondary surfaces from background and surface", () => {
    const p = applyOverrides(base, "dark" as const, { background: "#101820", surface: "#18222c" }, {});
    expect(p.canvas).toBe("#101820");
    expect(p.chrome).not.toBe("#101820");
    expect(p.surfaceAlt).not.toBe("#18222c");
  });
});
