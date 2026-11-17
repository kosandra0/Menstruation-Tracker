/**
 * Local, off-main-thread dominant-colour extraction for image-based themes.
 *
 * Pipeline: the image is decoded and shrunk by `createImageBitmap` (async, not on the UI thread), the pixels are
 * handed to a Web Worker that runs k-means clustering (k=6, deterministic seeding), and the clusters are ranked
 * by population and colourfulness. Transparent pixels are ignored. Nothing is uploaded; nothing is cached across
 * images (the caller recomputes only when the image changes).
 */
import { hexToHsl, toHex } from "@mt/design-tokens";

export interface Swatch {
  hex: string;
  /** Share of sampled pixels (0-1). */
  share: number;
}

export interface PaletteCandidate {
  id: string;
  label: string;
  accent: string;
  accent2: string;
}

const SAMPLE = 56;

/** Worker source. Kept self-contained (no imports) because it is instantiated from a Blob URL. */
const WORKER_SOURCE = `
self.onmessage = (e) => {
  const { pixels, k } = e.data;
  const pts = [];
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue; // ignore transparent pixels
    pts.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }
  if (pts.length === 0) { self.postMessage({ swatches: [] }); return; }
  const kk = Math.min(k, pts.length);
  // Deterministic farthest-point seeding (k-means++ without randomness).
  const centers = [pts[Math.floor(pts.length / 2)].slice()];
  const d2 = (a, b) => (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
  while (centers.length < kk) {
    let best = -1, bestD = -1;
    for (let i = 0; i < pts.length; i += 3) {
      let m = Infinity;
      for (const c of centers) m = Math.min(m, d2(pts[i], c));
      if (m > bestD) { bestD = m; best = i; }
    }
    centers.push(pts[best].slice());
  }
  const assign = new Int32Array(pts.length);
  for (let iter = 0; iter < 14; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c++) { const d = d2(pts[i], centers[c]); if (d < bd) { bd = d; bi = c; } }
      assign[i] = bi;
      const s = sum[bi]; s[0] += pts[i][0]; s[1] += pts[i][1]; s[2] += pts[i][2]; s[3] += 1;
    }
    let moved = 0;
    for (let c = 0; c < centers.length; c++) {
      const s = sum[c]; if (!s[3]) continue;
      const nc = [s[0]/s[3], s[1]/s[3], s[2]/s[3]];
      moved += d2(nc, centers[c]); centers[c] = nc;
    }
    if (moved < 0.5) break;
  }
  const counts = centers.map(() => 0);
  for (let i = 0; i < pts.length; i++) counts[assign[i]]++;
  const swatches = centers
    .map((c, i) => ({ r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]), share: counts[i] / pts.length }))
    .filter((s) => s.share > 0)
    .sort((a, b) => b.share - a.share);
  self.postMessage({ swatches });
};
`;

export async function extractSwatches(blob: Blob, signal?: AbortSignal): Promise<Swatch[]> {
  const bmp = await createImageBitmap(blob, { resizeWidth: SAMPLE, resizeHeight: SAMPLE, resizeQuality: "low" });
  let pixels: Uint8ClampedArray;
  try {
    const canvas = new OffscreenCanvas(SAMPLE, SAMPLE);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bmp, 0, 0, SAMPLE, SAMPLE);
    pixels = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
  } finally {
    bmp.close();
  }
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  const worker = new Worker(url);
  try {
    return await new Promise<Swatch[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Palette analysis timed out")), 8000);
      const done = () => clearTimeout(timer);
      signal?.addEventListener("abort", () => { done(); reject(new DOMException("Aborted", "AbortError")); });
      worker.onmessage = (e: MessageEvent<{ swatches: { r: number; g: number; b: number; share: number }[] }>) => {
        done();
        resolve(e.data.swatches.map((s) => ({ hex: toHex(s), share: s.share })));
      };
      worker.onerror = () => { done(); reject(new Error("Palette analysis failed")); };
      worker.postMessage({ pixels, k: 6 }, [pixels.buffer]);
    });
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
}

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/**
 * Turns swatches into up to five coordinated palette seeds. Handles bright/dark/saturated/neutral images by ranking
 * colours on population weighted by colourfulness, discarding near-white/near-black unless nothing else exists.
 */
export function candidatesFromSwatches(swatches: readonly Swatch[]): PaletteCandidate[] {
  const info = swatches.map((s) => {
    const hsl = hexToHsl(s.hex)!;
    const usable = hsl.l > 0.12 && hsl.l < 0.92;
    return { ...s, hsl, usable, score: Math.pow(s.share, 0.6) * (0.2 + hsl.s) * (usable ? 1 : 0.15) };
  });
  const ranked = [...info].sort((a, b) => b.score - a.score);
  const out: PaletteCandidate[] = [];
  const names = ["Dominant", "Secondary", "Accent", "Alternate", "Soft"];
  for (const c of ranked) {
    if (out.length >= 5) break;
    if (out.some((o) => hueDistance(hexToHsl(o.accent)!.h, c.hsl.h) < 18 && Math.abs(hexToHsl(o.accent)!.s - c.hsl.s) < 0.2)) continue;
    // Secondary: best-ranked colour with a clearly different hue, else analogous (handled by generator when absent).
    const partner = ranked.find((p) => p.hex !== c.hex && p.usable && hueDistance(p.hsl.h, c.hsl.h) > 25 && p.hsl.s > 0.1);
    out.push({ id: `img-${out.length}`, label: names[out.length] ?? "Option", accent: c.hex, accent2: partner?.hex ?? c.hex });
  }
  return out;
}
