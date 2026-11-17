/** Pure colour maths: parsing, HSL conversion, WCAG contrast. No DOM access. */

export interface Rgb { r: number; g: number; b: number }
export interface Hsl { h: number; s: number; l: number }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Parses `#rgb`, `#rrggbb` (with or without `#`). Returns null when invalid. */
export function parseHex(input: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function isHex(input: string): boolean {
  return parseHex(input) !== null;
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Normalises any valid hex to lowercase `#rrggbb`; returns `fallback` when invalid. */
export function normalizeHex(input: string, fallback: string): string {
  const rgb = parseHex(input);
  return rgb ? toHex(rgb) : fallback;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r: number, g: number, b: number;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export const hslHex = (h: number, s: number, l: number): string =>
  toHex(hslToRgb({ h, s: clamp(s, 0, 1), l: clamp(l, 0, 1) }));

export function hexToHsl(hex: string): Hsl | null {
  const rgb = parseHex(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

/** WCAG relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two hex colours (1-21). Invalid input yields 1. */
export function contrastRatio(a: string, b: string): number {
  const ra = parseHex(a), rb = parseHex(b);
  if (!ra || !rb) return 1;
  const la = luminance(ra), lb = luminance(rb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Linear mix: t=0 gives `a`, t=1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const ra = parseHex(a), rb = parseHex(b);
  if (!ra || !rb) return a;
  return toHex({ r: ra.r + (rb.r - ra.r) * t, g: ra.g + (rb.g - ra.g) * t, b: ra.b + (rb.b - ra.b) * t });
}

/** Moves lightness by `delta` (-1..1), keeping hue and saturation. */
export function shiftLightness(hex: string, delta: number): string {
  const hsl = hexToHsl(hex);
  return hsl ? hslHex(hsl.h, hsl.s, hsl.l + delta) : hex;
}

/** `#ffffff` or near-black, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrastRatio("#ffffff", bg) >= contrastRatio("#14101c", bg) ? "#ffffff" : "#14101c";
}

/**
 * Adjusts `fg` lightness (keeping hue/saturation) until it reaches `min` contrast against `bg`.
 * Falls back to pure black/white if the hue cannot get there. Returns `fg` unchanged when already fine.
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const hsl = hexToHsl(fg);
  const bgRgb = parseHex(bg);
  if (!hsl || !bgRgb) return fg;
  const goLighter = luminance(bgRgb) < 0.4;
  for (let i = 1; i <= 40; i++) {
    const l = clamp(hsl.l + (goLighter ? 1 : -1) * i * 0.025, 0, 1);
    const candidate = hslHex(hsl.h, hsl.s, l);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return goLighter ? "#ffffff" : "#000000";
}

export interface ContrastCheck {
  id: string;
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  ok: boolean;
}

export function check(id: string, label: string, fg: string, bg: string, required: number): ContrastCheck {
  const ratio = contrastRatio(fg, bg);
  return { id, label, fg, bg, ratio, required, ok: ratio >= required };
}
