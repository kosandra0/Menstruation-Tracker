import {
  check, contrastRatio, ensureContrast, hexToHsl, hslHex, isHex, mix, normalizeHex, readableOn, shiftLightness,
  type ContrastCheck,
} from "./color";
import type { Palette, ThemeMode } from "./themes";

/**
 * Nudges an accent just enough that either white or near-black text on it reaches 4.5:1 (mid-tones can fail both).
 * The hue and saturation are kept; only lightness moves.
 */
export function readableAccent(accent: string): string {
  const white = "#ffffff", dark = "#14101c";
  if (Math.max(contrastRatio(white, accent), contrastRatio(dark, accent)) >= 4.5) return accent;
  const hsl = hexToHsl(accent);
  if (!hsl) return accent;
  // Move away from the closer-to-fail text colour: darken for white text, lighten for dark text.
  const useWhite = contrastRatio(white, accent) >= contrastRatio(dark, accent);
  for (let i = 1; i <= 40; i++) {
    const l = Math.min(1, Math.max(0, hsl.l + (useWhite ? -1 : 1) * i * 0.01));
    const c = hslHex(hsl.h, hsl.s, l);
    if ((useWhite ? contrastRatio(white, c) : contrastRatio(dark, c)) >= 4.5) return c;
  }
  return accent;
}
export interface PaletteSeed {
  accent: string;
  /** Optional secondary hue; derived from the accent when omitted. */
  accent2?: string;
}

/**
 * Builds a complete, readable palette from one or two seed colours. Used for the generated built-in
 * themes, user-created palettes and image-derived palettes, so all of them share one contrast policy:
 * body text >= 7:1 on canvas, muted text >= 4.5:1, accent >= 3:1 against surfaces, accent text >= 4.5:1.
 */
export function generatePalette(seed: PaletteSeed, mode: ThemeMode): Palette {
  const base = hexToHsl(normalizeHex(seed.accent, "#7c5cbf"))!;
  const h = base.h;
  // Keep the accent expressive but never neon or muddy.
  // Near-neutral seeds (greys, black-and-white photos) stay neutral instead of being forced into a colour.
  const s = base.s < 0.12 ? base.s : Math.min(0.62, Math.max(0.28, base.s));
  const neutralS = Math.min(0.2, 0.06 + s * 0.2);

  let canvas: string, chrome: string, surface: string, surfaceAlt: string, border: string, ink: string, muted: string;
  if (mode === "light") {
    canvas = hslHex(h, neutralS * 1.6, 0.965);
    chrome = hslHex(h, neutralS * 1.7, 0.935);
    surface = hslHex(h, neutralS * 0.8, 0.995);
    surfaceAlt = hslHex(h, neutralS * 1.4, 0.95);
    border = hslHex(h, neutralS * 1.3, 0.88);
    ink = hslHex(h, neutralS * 1.4, 0.16);
    muted = hslHex(h, neutralS * 0.9, 0.4);
  } else {
    canvas = hslHex(h, neutralS * 1.1, 0.105);
    chrome = hslHex(h, neutralS * 1.1, 0.135);
    surface = hslHex(h, neutralS * 1.0, 0.165);
    surfaceAlt = hslHex(h, neutralS * 1.0, 0.21);
    border = hslHex(h, neutralS * 0.9, 0.29);
    ink = hslHex(h, neutralS * 0.8, 0.93);
    muted = hslHex(h, neutralS * 0.6, 0.7);
  }
  ink = ensureContrast(ink, canvas, 7);
  muted = ensureContrast(muted, surface, 4.5);
  muted = ensureContrast(muted, surfaceAlt, 4.5);

  let accent = hslHex(h, s, mode === "light" ? 0.52 : 0.68);
  accent = ensureContrast(accent, surface, 3);
  accent = readableAccent(accent);
  const accent2Raw = seed.accent2 && isHex(seed.accent2) ? normalizeHex(seed.accent2, "") : hslHex(h + 38, Math.min(0.55, s), mode === "light" ? 0.66 : 0.7);
  const accent2 = ensureContrast(accent2Raw, surface, 2.2);

  return {
    canvas, chrome, surface, surfaceAlt, border, ink, muted,
    accent,
    accentSoft: mix(accent, surface, mode === "light" ? 0.84 : 0.76),
    accentContrast: readableOn(accent),
    accent2,
    shadow: mode === "light" ? hslHex(h, 0.4, 0.26) : "#000000",
  };
}

/** Optional user colour choices layered on top of any base palette. Empty/invalid values are ignored. */
export interface ColorOverrides {
  accent?: string;
  accent2?: string;
  background?: string;
  surface?: string;
  text?: string;
  border?: string;
}

export const OVERRIDE_KEYS = ["accent", "accent2", "background", "surface", "text", "border"] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

export function hasOverrides(o: ColorOverrides | undefined): boolean {
  return !!o && OVERRIDE_KEYS.some((k) => o[k] && isHex(o[k]!));
}

export interface ApplyOptions {
  /** When true (default) text and accent-text colours are corrected to stay readable. */
  enforceReadable?: boolean;
}

/** Layers user overrides on a palette, deriving the related tokens (chrome, soft accent, muted text...). */
export function applyOverrides(base: Palette, mode: ThemeMode, o: ColorOverrides | undefined, opts: ApplyOptions = {}): Palette {
  if (!hasOverrides(o)) return base;
  const enforce = opts.enforceReadable !== false;
  const p: Palette = { ...base };
  const valid = (v: string | undefined) => (v && isHex(v) ? normalizeHex(v, "") : undefined);
  const dir = mode === "light" ? -1 : 1;

  const bg = valid(o!.background);
  if (bg) {
    p.canvas = bg;
    p.chrome = shiftLightness(bg, dir * 0.03);
  }
  const surface = valid(o!.surface);
  if (surface) {
    p.surface = surface;
    p.surfaceAlt = shiftLightness(surface, dir * 0.035);
  }
  const border = valid(o!.border);
  if (border) p.border = border;
  const text = valid(o!.text);
  if (text) {
    p.ink = text;
    p.muted = mix(text, p.surface, 0.42);
  }
  const accent = valid(o!.accent);
  if (accent) p.accent = accent;
  const accent2 = valid(o!.accent2);
  if (accent2) p.accent2 = accent2;

  if (accent) {
    p.accentSoft = mix(p.accent, p.surface, mode === "light" ? 0.84 : 0.76);
  }
  if (surface || bg) {
    // Keep soft accent coherent with a changed surface.
    p.accentSoft = mix(p.accent, p.surface, mode === "light" ? 0.84 : 0.76);
  }
  if (enforce) {
    p.ink = ensureContrast(p.ink, p.canvas, 4.5);
    p.ink = ensureContrast(p.ink, p.surface, 4.5);
    p.muted = ensureContrast(p.muted, p.surface, 4.5);
    p.muted = ensureContrast(p.muted, p.canvas, 4.5);
    p.accent = readableAccent(ensureContrast(p.accent, p.surface, 3));
    p.accentSoft = mix(p.accent, p.surface, mode === "light" ? 0.84 : 0.76);
  }
  p.accentContrast = readableOn(p.accent);
  return p;
}

/** Contrast report for a final palette; `ok === false` entries should be surfaced as warnings. */
export function auditPalette(p: Palette): ContrastCheck[] {
  return [
    check("ink-canvas", "Text on background", p.ink, p.canvas, 4.5),
    check("ink-surface", "Text on cards", p.ink, p.surface, 4.5),
    check("muted-surface", "Secondary text on cards", p.muted, p.surface, 4.5),
    check("accent-text", "Text on accent buttons", p.accentContrast, p.accent, 4.5),
    check("accent-surface", "Accent against cards", p.accent, p.surface, 3),
    check("border-surface", "Borders against cards", p.border, p.surface, 1.1),
  ];
}

export { contrastRatio };
