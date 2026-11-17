import type { ThemeMode } from "@mt/design-tokens";

export type ModePreference = "system" | "light" | "dark";

export function resolveMode(pref: ModePreference, systemPrefersDark: boolean): ThemeMode {
  if (pref === "system") return systemPrefersDark ? "dark" : "light";
  return pref;
}
