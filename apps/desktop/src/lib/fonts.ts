/** Font choices. Only fonts that are actually installed are offered (detected, never assumed). */

export type FontCategory = "sans" | "serif" | "mono";

export interface FontOption {
  id: string;
  label: string;
  category: FontCategory;
  /** Family probed for installation; `null` = always available (system stacks). */
  probe: string | null;
  stack: string;
}

const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';
const MONO_FALLBACK = '"Cascadia Mono", Consolas, "Courier New", monospace';

export const FONT_OPTIONS: readonly FontOption[] = [
  { id: "default", label: "Segoe UI Variable (default)", category: "sans", probe: null, stack: `"Segoe UI Variable Text", "Segoe UI", ${SANS_FALLBACK}` },
  { id: "system", label: "System UI", category: "sans", probe: null, stack: SANS_FALLBACK },
  { id: "segoe", label: "Segoe UI", category: "sans", probe: "Segoe UI", stack: `"Segoe UI", ${SANS_FALLBACK}` },
  { id: "aptos", label: "Aptos", category: "sans", probe: "Aptos", stack: `Aptos, ${SANS_FALLBACK}` },
  { id: "calibri", label: "Calibri", category: "sans", probe: "Calibri", stack: `Calibri, ${SANS_FALLBACK}` },
  { id: "arial", label: "Arial", category: "sans", probe: "Arial", stack: `Arial, ${SANS_FALLBACK}` },
  { id: "verdana", label: "Verdana", category: "sans", probe: "Verdana", stack: `Verdana, ${SANS_FALLBACK}` },
  { id: "tahoma", label: "Tahoma", category: "sans", probe: "Tahoma", stack: `Tahoma, ${SANS_FALLBACK}` },
  { id: "trebuchet", label: "Trebuchet MS", category: "sans", probe: "Trebuchet MS", stack: `"Trebuchet MS", ${SANS_FALLBACK}` },
  { id: "georgia", label: "Georgia", category: "serif", probe: "Georgia", stack: `Georgia, ${SERIF_FALLBACK}` },
  { id: "times", label: "Times New Roman", category: "serif", probe: "Times New Roman", stack: `"Times New Roman", ${SERIF_FALLBACK}` },
  { id: "consolas", label: "Consolas", category: "mono", probe: "Consolas", stack: `Consolas, ${MONO_FALLBACK}` },
];

const cache = new Map<string, boolean>();

/** Canvas-width probe: a font is installed if it renders differently from every generic fallback. */
export function isFontInstalled(family: string): boolean {
  const hit = cache.get(family);
  if (hit !== undefined) return hit;
  let result = false;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      const text = "mmmmmmmmmmlliWQ0123@#";
      const width = (font: string) => {
        ctx.font = `72px ${font}`;
        return ctx.measureText(text).width;
      };
      result = ["monospace", "serif", "sans-serif"].some((base) => width(`"${family}", ${base}`) !== width(base));
    }
  } catch {
    result = false;
  }
  cache.set(family, result);
  return result;
}

export function availableFonts(): FontOption[] {
  return FONT_OPTIONS.filter((f) => f.probe === null || isFontInstalled(f.probe));
}

/** Resolves a stored id to a usable option, falling back to the default if the font is gone. */
export function resolveFont(id: string): { option: FontOption; fellBack: boolean } {
  const found = FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
  if (found.probe !== null && !isFontInstalled(found.probe)) return { option: FONT_OPTIONS[0], fellBack: true };
  return { option: found, fellBack: found.id !== id };
}
