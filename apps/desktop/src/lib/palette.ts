import {
  applyOverrides, generatePalette, getTheme, isThemeId, type ColorOverrides, type Palette, type ThemeId, type ThemeMode,
} from "@mt/design-tokens";
import type { AppearanceData, CustomPalette, VisualMood } from "../stores/appearance";

export const MOODS: readonly { id: VisualMood; label: string; hint: string; color: string }[] = [
  { id: "bright", label: "Bright", hint: "Light and energised", color: "#d9923b" },
  { id: "calm", label: "Calm", hint: "Settled and steady", color: "#4f8f9b" },
  { id: "tender", label: "Tender", hint: "Soft and sensitive", color: "#c0647f" },
  { id: "tired", label: "Tired", hint: "Low on energy", color: "#7b7fa8" },
  { id: "low", label: "Low", hint: "Heavy or down", color: "#6a7a8c" },
];

export const moodColor = (m: VisualMood | undefined): string => MOODS.find((x) => x.id === m)?.color ?? "#4f8f9b";

/** The palette of the chosen theme (built-in or user-created), before user colour overrides. */
export function baseThemePalette(themeId: string, customPalettes: readonly CustomPalette[], mode: ThemeMode): Palette {
  if (themeId.startsWith("custom:")) {
    const c = customPalettes.find((p) => `custom:${p.id}` === themeId);
    if (c) return generatePalette({ accent: c.accent, accent2: c.accent2 }, mode);
  }
  return getTheme(isThemeId(themeId) ? (themeId as ThemeId) : "lavender")[mode];
}

export function themeLabel(themeId: string, customPalettes: readonly CustomPalette[]): string {
  if (themeId.startsWith("custom:")) return customPalettes.find((p) => `custom:${p.id}` === themeId)?.name ?? "Custom";
  return getTheme(isThemeId(themeId) ? (themeId as ThemeId) : "lavender").name;
}

type PaletteInput = Pick<AppearanceData, "themeId" | "customPalettes" | "overrides" | "enforceReadable" | "moodBars" | "visualMood">;

/** Final palette: theme -> user overrides -> (optional) today's visual mood accent. */
export function resolvePalette(a: PaletteInput, mode: ThemeMode, today: string): Palette {
  const base = baseThemePalette(a.themeId, a.customPalettes, mode);
  let overrides: ColorOverrides = a.overrides;
  if (a.moodBars.adaptive && a.visualMood && a.visualMood.date === today && !a.overrides.accent) {
    overrides = { ...a.overrides, accent: moodColor(a.visualMood.mood) };
  }
  return applyOverrides(base, mode, overrides, { enforceReadable: a.enforceReadable });
}
