import { STATUS, getTheme, type Palette, type ThemeId, type ThemeMode } from "./themes";

const KEY_MAP: Record<keyof Palette, string> = {
  canvas: "--c-canvas",
  chrome: "--c-chrome",
  surface: "--c-surface",
  surfaceAlt: "--c-surface-alt",
  border: "--c-border",
  ink: "--c-ink",
  muted: "--c-muted",
  accent: "--c-accent",
  accentSoft: "--c-accent-soft",
  accentContrast: "--c-accent-contrast",
  accent2: "--c-accent-2",
  shadow: "--c-shadow",
};

/** CSS custom properties for a concrete palette in a resolved mode. */
export function paletteToCssVars(palette: Palette, mode: ThemeMode): Record<string, string> {
  const vars: Record<string, string> = {};
  (Object.keys(KEY_MAP) as (keyof Palette)[]).forEach((k) => {
    vars[KEY_MAP[k]] = palette[k];
  });
  const status = STATUS[mode];
  vars["--c-success"] = status.success;
  vars["--c-warning"] = status.warning;
  vars["--c-danger"] = status.danger;
  vars["--c-info"] = status.info;
  return vars;
}

/** Returns the CSS custom properties for a built-in theme + resolved mode. */
export function themeToCssVars(id: ThemeId, mode: ThemeMode): Record<string, string> {
  return paletteToCssVars(getTheme(id)[mode], mode);
}

/** Applies a concrete palette to an element (normally `document.documentElement`). */
export function applyPalette(root: HTMLElement, palette: Palette, mode: ThemeMode, themeKey: string): void {
  for (const [name, value] of Object.entries(paletteToCssVars(palette, mode))) root.style.setProperty(name, value);
  root.dataset.theme = themeKey;
  root.dataset.mode = mode;
  root.style.colorScheme = mode;
}

/** Applies a built-in theme to an element. */
export function applyTheme(root: HTMLElement, id: ThemeId, mode: ThemeMode): void {
  applyPalette(root, getTheme(id)[mode], mode, id);
}
