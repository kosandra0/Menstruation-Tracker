/**
 * Single source of truth for theme palettes.
 * Components never reference these hex values — they consume CSS variables
 * (applied by `applyTheme`) through Tailwind utilities such as `bg-surface`.
 */

import { generatePalette } from "./generate";

export type ThemeMode = "light" | "dark";
export type ThemeId =
  | "lavender" | "rosewater" | "sage" | "ocean" | "sand" | "midnight"
  | "slate" | "terracotta" | "plum" | "glacier"
  | "lagoon" | "mulberry" | "clayrose" | "fogharbor" | "copperdusk"
  | "fighoney" | "olivember" | "stormblossom" | "mauvedune" | "pineslate";

/** Reference to a user-created palette: `custom:<id>`. */
export type CustomThemeRef = `custom:${string}`;

export interface Palette {
  /** App canvas behind everything. */
  canvas: string;
  /** Sidebar / title bar chrome. */
  chrome: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  accent: string;
  accentSoft: string;
  /** Text/icon colour on top of `accent`. */
  accentContrast: string;
  /** Secondary hue used for gentle gradients and phase markers. */
  accent2: string;
  /** Shadow tint. */
  shadow: string;
}

export interface StatusColors {
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  light: Palette;
  dark: Palette;
}

export const STATUS: Record<ThemeMode, StatusColors> = {
  light: { success: "#3F8F63", warning: "#B7791F", danger: "#C0475A", info: "#3B7DB5" },
  dark: { success: "#6CC48F", warning: "#E0B25B", danger: "#EE7E8E", info: "#7FB5E6" },
};

const HAND_CRAFTED: readonly ThemeDefinition[] = [
  {
    id: "lavender",
    name: "Lavender Dream",
    description: "Soft violet with a hint of rose.",
    light: {
      canvas: "#F6F3FB", chrome: "#EFEAF8", surface: "#FFFFFF", surfaceAlt: "#F1EDF9",
      border: "#E3DBF0", ink: "#2A2438", muted: "#6F6785", accent: "#7C5CBF",
      accentSoft: "#E8E0F7", accentContrast: "#FFFFFF", accent2: "#D88FB0", shadow: "#4B3A7A",
    },
    dark: {
      canvas: "#16131F", chrome: "#1B1727", surface: "#211C2E", surfaceAlt: "#2A2439",
      border: "#342D45", ink: "#EDE9F7", muted: "#A199B8", accent: "#A98BE8",
      accentSoft: "#342B52", accentContrast: "#17121F", accent2: "#E0A0C0", shadow: "#000000",
    },
  },
  {
    id: "rosewater",
    name: "Rosewater",
    description: "Muted rose and warm apricot.",
    light: {
      canvas: "#FBF4F3", chrome: "#F6EAE8", surface: "#FFFFFF", surfaceAlt: "#F8EDEB",
      border: "#EBD7D4", ink: "#33232A", muted: "#7A6068", accent: "#B5546A",
      accentSoft: "#F6DEE0", accentContrast: "#FFFFFF", accent2: "#D9A07A", shadow: "#7A3A48",
    },
    dark: {
      canvas: "#1A1215", chrome: "#20171A", surface: "#271C20", surfaceAlt: "#31242A",
      border: "#402F36", ink: "#F5E9EB", muted: "#B79EA5", accent: "#E58CA0",
      accentSoft: "#4A2A33", accentContrast: "#230F15", accent2: "#E3B08A", shadow: "#000000",
    },
  },
  {
    id: "sage",
    name: "Sage Garden",
    description: "Calm greens with a touch of gold.",
    light: {
      canvas: "#F3F6F1", chrome: "#E9EFE6", surface: "#FFFFFF", surfaceAlt: "#EDF2EA",
      border: "#D7E1D2", ink: "#1F2D24", muted: "#5D7064", accent: "#4F7F5F",
      accentSoft: "#DCE9DD", accentContrast: "#FFFFFF", accent2: "#C9A66B", shadow: "#2F4A38",
    },
    dark: {
      canvas: "#121814", chrome: "#161E19", surface: "#1B251E", surfaceAlt: "#233028",
      border: "#2E3E34", ink: "#E6EFE8", muted: "#9DB1A3", accent: "#86BF98",
      accentSoft: "#27402F", accentContrast: "#0E1A12", accent2: "#D6B87E", shadow: "#000000",
    },
  },
  {
    id: "ocean",
    name: "Ocean Mist",
    description: "Cool blue with sea-glass teal.",
    light: {
      canvas: "#F1F6F9", chrome: "#E6EFF4", surface: "#FFFFFF", surfaceAlt: "#EBF2F6",
      border: "#D2E1EA", ink: "#1B2B36", muted: "#5A6F7D", accent: "#2F7BA0",
      accentSoft: "#D9EAF3", accentContrast: "#FFFFFF", accent2: "#7FB8B0", shadow: "#244A5E",
    },
    dark: {
      canvas: "#0F171C", chrome: "#131D23", surface: "#182329", surfaceAlt: "#1F2D35",
      border: "#2A3B45", ink: "#E3EEF4", muted: "#97AFBD", accent: "#6DB6DC",
      accentSoft: "#1F3A4A", accentContrast: "#0B1820", accent2: "#85C7BC", shadow: "#000000",
    },
  },
  {
    id: "sand",
    name: "Warm Sand",
    description: "Earthy amber and dusty clay.",
    light: {
      canvas: "#F9F5EE", chrome: "#F1EADD", surface: "#FFFDF9", surfaceAlt: "#F4EDE0",
      border: "#E5DBC8", ink: "#2E261B", muted: "#75684F", accent: "#A4652C",
      accentSoft: "#F2E2CC", accentContrast: "#FFFFFF", accent2: "#B87A7A", shadow: "#6B4A22",
    },
    dark: {
      canvas: "#19150F", chrome: "#1E1913", surface: "#251F17", surfaceAlt: "#2F281E",
      border: "#3C3427", ink: "#F2EADB", muted: "#B5A78C", accent: "#E0A262",
      accentSoft: "#4A3721", accentContrast: "#1F1407", accent2: "#D49A9A", shadow: "#000000",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep indigo with a quiet violet glow.",
    light: {
      canvas: "#F2F3F8", chrome: "#E8EAF3", surface: "#FFFFFF", surfaceAlt: "#ECEEF6",
      border: "#D5D9E8", ink: "#1B1F33", muted: "#5C6385", accent: "#4350A8",
      accentSoft: "#DEE1F5", accentContrast: "#FFFFFF", accent2: "#8A6FB8", shadow: "#262E66",
    },
    dark: {
      canvas: "#0B0D17", chrome: "#0F1220", surface: "#141829", surfaceAlt: "#1B2036",
      border: "#272D48", ink: "#E6E8F5", muted: "#9AA0C0", accent: "#8D9BFF",
      accentSoft: "#252B57", accentContrast: "#0B0D1E", accent2: "#B497E6", shadow: "#000000",
    },
  },
];

const generated = (id: ThemeId, name: string, description: string, accent: string, accent2: string): ThemeDefinition => ({
  id, name, description,
  light: generatePalette({ accent, accent2 }, "light"),
  dark: generatePalette({ accent, accent2 }, "dark"),
});

/** Additional palettes built by the shared generator so they obey the same contrast policy. */
const GENERATED: readonly ThemeDefinition[] = [
  generated("slate", "Slate Dusk", "Quiet blue-grey with a soft copper note.", "#5B7391", "#C98F6B"),
  generated("terracotta", "Terracotta", "Warm clay and muted olive.", "#B5654A", "#8F9A5B"),
  generated("plum", "Plum Velvet", "Deep plum with dusty rose.", "#8A4F7D", "#D49AAE"),
  generated("glacier", "Glacier", "Crisp icy teal with pale lilac.", "#3F8C96", "#A99BD1"),
  // Ten mid-tone, dusty palettes in the family of Slate Dusk, Terracotta and Plum Velvet: calm, muted, never neon.
  generated("lagoon", "Dusk Lagoon", "Deep teal-slate with a peach glow.", "#4F7C85", "#D9A08B"),
  generated("mulberry", "Mulberry Mist", "Dusty mulberry with warm sand.", "#7A5A8C", "#C9A27E"),
  generated("clayrose", "Clay Rose", "Baked rose clay with soft sage.", "#B0675F", "#9AA7A0"),
  generated("fogharbor", "Fog Harbor", "Misty harbour blue with a rose haze.", "#66788A", "#C49494"),
  generated("copperdusk", "Copper Dusk", "Burnished copper over evening slate.", "#A9714B", "#6F8CA0"),
  generated("fighoney", "Fig & Honey", "Ripe fig with a drizzle of honey.", "#7B5069", "#C99A55"),
  generated("olivember", "Olive Ember", "Smouldering clay with olive leaf.", "#9C6B3F", "#7E8B5A"),
  generated("stormblossom", "Storm Blossom", "Stormy periwinkle with petal pink.", "#6C6A8E", "#D69AA6"),
  generated("mauvedune", "Mauve Dune", "Soft mauve with sun-bleached dune.", "#A07585", "#B9A07A"),
  generated("pineslate", "Pine Slate", "Pine-needle green over cool slate.", "#4E6E68", "#C08A6E"),
];

export const THEMES: readonly ThemeDefinition[] = [...HAND_CRAFTED, ...GENERATED];

export const DEFAULT_THEME_ID: ThemeId = "lavender";

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
