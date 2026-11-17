import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_LOGO, LOGO_IDS, STORAGE_KEYS, type LogoId } from "@mt/config";
import { DEFAULT_THEME_ID, OVERRIDE_KEYS, isHex, isThemeId, normalizeHex, type ColorOverrides, type OverrideKey } from "@mt/design-tokens";

/* ---------- types ---------- */

export type ModePreference = "system" | "light" | "dark";
export type MotionPreference = "system" | "reduced" | "full";
export type MotionIntensity = "gentle" | "standard";
export type TitleStyle = "windows" | "traffic" | "capsule" | "ring" | "dots" | "text";
export const TITLE_STYLES: readonly TitleStyle[] = ["windows", "traffic", "capsule", "ring", "dots", "text"];
export type ControlShape = "square" | "round" | "pill";
export type MoodStyle = "soft" | "line" | "gradient" | "compact" | "pill";
export type VisualMood = "bright" | "calm" | "tender" | "tired" | "low";

export interface CustomPalette {
  id: string;
  name: string;
  accent: string;
  accent2?: string;
}

export interface BackgroundSettings {
  enabled: boolean;
  hasImage: boolean;
  fit: "cover" | "contain";
  /** Focal point / position, 0-100 (%). */
  posX: number;
  posY: number;
  /** 1 = natural size for `cover`/`contain`; larger zooms in. */
  scale: number;
  brightness: number; // 0.4-1.6
  contrast: number; // 0.5-1.5
  saturate: number; // 0-2
  opacity: number; // 0.05-1 image opacity
  blur: number; // 0-24 px
  tintColor: string;
  tintAmount: number; // 0-0.8
  overlayColor: string;
  overlayStrength: number; // 0-0.9
  vignette: number; // 0-0.8
}

export interface TypographySettings {
  family: string;
  /** Root size multiplier. */
  scale: number;
  headingScale: number;
  bodyScale: number;
  labelScale: number;
  weight: 400 | 500 | 600;
  lineHeight: number;
  letterSpacing: number; // em
}

export interface WindowSettings {
  titleStyle: TitleStyle;
  controlsSide: "left" | "right";
  buttonSize: number; // px, 24-48
  shape: ControlShape;
  spacing: number; // px gap, 0-12
  colored: boolean;
  closeToTray: boolean;
  minimizeToTray: boolean;
}

export interface MoodBarSettings {
  /** Mood-adaptive interface is OFF by default. */
  adaptive: boolean;
  style: MoodStyle;
  radius: number;
  height: number;
  animate: boolean;
  opacity: number;
  colorSource: "mood" | "accent";
}

export type ClockType = "off" | "digital" | "analog";
export type ClockPlacement = "dashboard" | "titlebar" | "both";
export interface ClockSettings {
  type: ClockType;
  /** `auto` follows the region's own convention (for example 12-hour in the US, 24-hour in Germany). */
  hourCycle: "auto" | "12" | "24";
  /** Analog clock only: draw a second hand. The digital clock always shows seconds. */
  secondHand: boolean;
  showDate: boolean;
  /** `auto` = the time zone Windows reports for this computer; otherwise an IANA zone such as `Asia/Kolkata`. */
  timeZone: string;
  placement: ClockPlacement;
}

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

export interface AppearanceData {
  themeId: string; // built-in ThemeId or `custom:<id>`
  mode: ModePreference;
  overrides: ColorOverrides;
  /** Keep text readable when custom colours would not be. */
  enforceReadable: boolean;
  customPalettes: CustomPalette[];
  background: BackgroundSettings;
  typography: TypographySettings;
  motion: MotionPreference;
  motionIntensity: MotionIntensity;
  window: WindowSettings;
  moodBars: MoodBarSettings;
  /** Today's visual mood (UI only, never a health record). */
  visualMood: { date: string; mood: VisualMood } | null;
  logoId: LogoId;
  /** The name the app greets the user with (optional, stored only on this device). */
  userName: string;
  /** Card corner radius in px (0-24); controls use a proportional smaller radius. */
  cornerRadius: number;
  /** Radius of the app window's own corners in px (0-24). 0 is square. Maximised windows are always square. */
  windowRadius: number;
  clock: ClockSettings;
  sidebarCollapsed: boolean;
  dashboard: DashboardLayout;
  onboarded: boolean;
  /** Notifications: show neutral wording on screen/lock screen (default true). */
  neutralNotifications: boolean;
  quietHours: { enabled: boolean; from: string; to: string };
}

export const DASHBOARD_CARDS = ["cycle", "estimate", "checkin", "mood", "symptoms", "journal", "insights"] as const;

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  enabled: true, hasImage: false, fit: "cover", posX: 50, posY: 50, scale: 1,
  brightness: 1, contrast: 1, saturate: 1, opacity: 0.55, blur: 0,
  tintColor: "#7c5cbf", tintAmount: 0, overlayColor: "#000000", overlayStrength: 0.15, vignette: 0.15,
};
export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  family: "default", scale: 1, headingScale: 1, bodyScale: 1, labelScale: 1, weight: 400, lineHeight: 1.5, letterSpacing: 0,
};
export const DEFAULT_WINDOW: WindowSettings = {
  titleStyle: "windows", controlsSide: "right", buttonSize: 46, shape: "square", spacing: 0, colored: false,
  closeToTray: false, minimizeToTray: false,
};
export const DEFAULT_MOOD_BARS: MoodBarSettings = {
  adaptive: false, style: "soft", radius: 8, height: 10, animate: true, opacity: 1, colorSource: "accent",
};
export const DEFAULT_CORNER_RADIUS = 20;
export const DEFAULT_WINDOW_RADIUS = 16;
export const DEFAULT_CLOCK: ClockSettings = {
  type: "off", hourCycle: "auto", secondHand: true, showDate: true, timeZone: "auto", placement: "dashboard",
};

function legacyDefaults(): Partial<AppearanceData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.legacySettings);
    if (!raw) return {};
    const s = (JSON.parse(raw) as { state?: Record<string, unknown> }).state ?? {};
    const out: Partial<AppearanceData> = {};
    if (typeof s.themeId === "string") out.themeId = s.themeId;
    if (s.mode === "light" || s.mode === "dark" || s.mode === "system") out.mode = s.mode;
    if (typeof s.reducedMotion === "boolean" && s.reducedMotion) out.motion = "reduced";
    if (typeof s.sidebarCollapsed === "boolean") out.sidebarCollapsed = s.sidebarCollapsed;
    return out;
  } catch {
    return {};
  }
}

export const DEFAULT_APPEARANCE: AppearanceData = {
  themeId: DEFAULT_THEME_ID,
  mode: "system",
  overrides: {},
  enforceReadable: true,
  customPalettes: [],
  background: DEFAULT_BACKGROUND,
  typography: DEFAULT_TYPOGRAPHY,
  motion: "system",
  motionIntensity: "standard",
  window: DEFAULT_WINDOW,
  moodBars: DEFAULT_MOOD_BARS,
  visualMood: null,
  logoId: DEFAULT_LOGO,
  userName: "",
  cornerRadius: DEFAULT_CORNER_RADIUS,
  windowRadius: DEFAULT_WINDOW_RADIUS,
  clock: DEFAULT_CLOCK,
  sidebarCollapsed: false,
  dashboard: { order: [...DASHBOARD_CARDS], hidden: [] },
  onboarded: false,
  neutralNotifications: true,
  quietHours: { enabled: false, from: "22:00", to: "07:00" },
};

/* ---------- validation (used for hydration of stored/corrupt data and for imports) ---------- */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const hex = (v: unknown, fallback: string) => (typeof v === "string" && isHex(v) ? normalizeHex(v, fallback) : fallback);
const hhmm = (v: unknown, fallback: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback);

/** Trims, collapses spaces and strips control characters; the name is shown as text only. */
export function cleanName(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

function validTimeZone(tz: string): boolean {
  if (tz === "auto") return true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function sanitizeAppearance(input: unknown): AppearanceData {
  const d = DEFAULT_APPEARANCE;
  if (!isObj(input)) return structuredClone(d);
  const bg = isObj(input.background) ? input.background : {};
  const ty = isObj(input.typography) ? input.typography : {};
  const win = isObj(input.window) ? input.window : {};
  const mb = isObj(input.moodBars) ? input.moodBars : {};
  const dash = isObj(input.dashboard) ? input.dashboard : {};
  const qh = isObj(input.quietHours) ? input.quietHours : {};
  const ck = isObj(input.clock) ? input.clock : {};

  const overrides: ColorOverrides = {};
  if (isObj(input.overrides)) {
    for (const k of OVERRIDE_KEYS as readonly OverrideKey[]) {
      const v = (input.overrides as Record<string, unknown>)[k];
      if (typeof v === "string" && isHex(v)) overrides[k] = normalizeHex(v, "#000000");
    }
  }
  const customPalettes: CustomPalette[] = Array.isArray(input.customPalettes)
    ? input.customPalettes
        .filter((p): p is Record<string, unknown> => isObj(p) && typeof p.id === "string" && typeof p.accent === "string" && isHex(p.accent as string))
        .slice(0, 50)
        .map((p) => ({
          id: String(p.id).slice(0, 64),
          name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 40) : "Custom palette",
          accent: normalizeHex(p.accent as string, "#7c5cbf"),
          accent2: typeof p.accent2 === "string" && isHex(p.accent2) ? normalizeHex(p.accent2, "#d88fb0") : undefined,
        }))
    : [];

  const themeIdRaw = typeof input.themeId === "string" ? input.themeId : d.themeId;
  const themeOk = isThemeId(themeIdRaw) || (themeIdRaw.startsWith("custom:") && customPalettes.some((p) => `custom:${p.id}` === themeIdRaw));

  const allowedCards = new Set<string>(DASHBOARD_CARDS);
  const order = Array.isArray(dash.order) ? [...new Set((dash.order as unknown[]).filter((x): x is string => typeof x === "string" && allowedCards.has(x)))] : [];
  for (const c of DASHBOARD_CARDS) if (!order.includes(c)) order.push(c);
  const hidden = Array.isArray(dash.hidden) ? [...new Set((dash.hidden as unknown[]).filter((x): x is string => typeof x === "string" && allowedCards.has(x)))] : [];

  const vm = isObj(input.visualMood) && typeof input.visualMood.date === "string"
    ? { date: input.visualMood.date, mood: oneOf(input.visualMood.mood, ["bright", "calm", "tender", "tired", "low"] as const, "calm") }
    : null;

  return {
    themeId: themeOk ? themeIdRaw : d.themeId,
    mode: oneOf(input.mode, ["system", "light", "dark"] as const, d.mode),
    overrides,
    enforceReadable: bool(input.enforceReadable, d.enforceReadable),
    customPalettes,
    background: {
      enabled: bool(bg.enabled, d.background.enabled),
      hasImage: bool(bg.hasImage, false),
      fit: oneOf(bg.fit, ["cover", "contain"] as const, d.background.fit),
      posX: num(bg.posX, 0, 100, 50), posY: num(bg.posY, 0, 100, 50),
      scale: num(bg.scale, 1, 3, 1),
      brightness: num(bg.brightness, 0.4, 1.6, 1), contrast: num(bg.contrast, 0.5, 1.5, 1), saturate: num(bg.saturate, 0, 2, 1),
      opacity: num(bg.opacity, 0.05, 1, d.background.opacity), blur: num(bg.blur, 0, 24, 0),
      tintColor: hex(bg.tintColor, d.background.tintColor), tintAmount: num(bg.tintAmount, 0, 0.8, 0),
      overlayColor: hex(bg.overlayColor, d.background.overlayColor), overlayStrength: num(bg.overlayStrength, 0, 0.9, d.background.overlayStrength),
      vignette: num(bg.vignette, 0, 0.8, d.background.vignette),
    },
    typography: {
      family: typeof ty.family === "string" ? ty.family.slice(0, 40) : "default",
      scale: num(ty.scale, 0.85, 1.3, 1), headingScale: num(ty.headingScale, 0.8, 1.3, 1),
      bodyScale: num(ty.bodyScale, 0.85, 1.3, 1), labelScale: num(ty.labelScale, 0.85, 1.3, 1),
      weight: ty.weight === 500 ? 500 : ty.weight === 600 ? 600 : 400,
      lineHeight: num(ty.lineHeight, 1.3, 1.9, 1.5), letterSpacing: num(ty.letterSpacing, -0.02, 0.08, 0),
    },
    motion: oneOf(input.motion, ["system", "reduced", "full"] as const, d.motion),
    motionIntensity: oneOf(input.motionIntensity, ["gentle", "standard"] as const, d.motionIntensity),
    window: {
      titleStyle: oneOf(win.titleStyle, TITLE_STYLES, d.window.titleStyle),
      controlsSide: oneOf(win.controlsSide, ["left", "right"] as const, d.window.controlsSide),
      buttonSize: num(win.buttonSize, 24, 48, d.window.buttonSize),
      shape: oneOf(win.shape, ["square", "round", "pill"] as const, d.window.shape),
      spacing: num(win.spacing, 0, 12, 0),
      colored: bool(win.colored, false),
      closeToTray: bool(win.closeToTray, false),
      minimizeToTray: bool(win.minimizeToTray, false),
    },
    moodBars: {
      adaptive: bool(mb.adaptive, false),
      style: oneOf(mb.style, ["soft", "line", "gradient", "compact", "pill"] as const, d.moodBars.style),
      radius: num(mb.radius, 0, 24, d.moodBars.radius), height: num(mb.height, 4, 28, d.moodBars.height),
      animate: bool(mb.animate, true), opacity: num(mb.opacity, 0.4, 1, 1),
      colorSource: oneOf(mb.colorSource, ["mood", "accent"] as const, "accent"),
    },
    visualMood: vm,
    logoId: oneOf(input.logoId, LOGO_IDS, DEFAULT_LOGO),
    userName: typeof input.userName === "string" ? cleanName(input.userName) : "",
    cornerRadius: Math.round(num(input.cornerRadius, 0, 24, DEFAULT_CORNER_RADIUS)),
    windowRadius: Math.round(num(input.windowRadius, 0, 24, DEFAULT_WINDOW_RADIUS)),
    clock: {
      type: oneOf(ck.type, ["off", "digital", "analog"] as const, d.clock.type),
      hourCycle: oneOf(ck.hourCycle, ["auto", "12", "24"] as const, d.clock.hourCycle),
      secondHand: bool(ck.secondHand, d.clock.secondHand),
      showDate: bool(ck.showDate, d.clock.showDate),
      timeZone: typeof ck.timeZone === "string" && validTimeZone(ck.timeZone) ? ck.timeZone : "auto",
      placement: oneOf(ck.placement, ["dashboard", "titlebar", "both"] as const, d.clock.placement),
    },
    sidebarCollapsed: bool(input.sidebarCollapsed, false),
    dashboard: { order, hidden },
    onboarded: bool(input.onboarded, false),
    neutralNotifications: bool(input.neutralNotifications, true),
    quietHours: { enabled: bool(qh.enabled, false), from: hhmm(qh.from, "22:00"), to: hhmm(qh.to, "07:00") },
  };
}

/* ---------- store ---------- */

export interface AppearanceActions {
  /** Shallow-merge a patch into one top-level key. */
  set: <K extends keyof AppearanceData>(key: K, value: AppearanceData[K]) => void;
  patch: <K extends "background" | "typography" | "window" | "moodBars" | "quietHours" | "clock">(key: K, value: Partial<AppearanceData[K]>) => void;
  setOverride: (key: OverrideKey, value: string | undefined) => void;
  resetColors: () => void;
  resetGroup: (group: "background" | "typography" | "window" | "moodBars" | "motion" | "dashboard" | "theme") => void;
  resetAll: () => void;
  replaceAll: (data: AppearanceData) => void;
  addPalette: (p: Omit<CustomPalette, "id">) => string;
  updatePalette: (id: string, patch: Partial<Omit<CustomPalette, "id">>) => void;
  duplicatePalette: (id: string) => string | null;
  removePalette: (id: string) => void;
}

export type AppearanceState = AppearanceData & AppearanceActions;

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`).slice(0, 36);

const initial = (): AppearanceData => sanitizeAppearance({ ...DEFAULT_APPEARANCE, ...legacyDefaults() });

export const useAppearance = create<AppearanceState>()(
  persist(
    (set, get) => ({
      ...initial(),
      set: (key, value) => set({ [key]: value } as Partial<AppearanceState>),
      patch: (key, value) => set((s) => ({ [key]: { ...s[key], ...value } }) as Partial<AppearanceState>),
      setOverride: (key, value) =>
        set((s) => {
          const next = { ...s.overrides };
          if (value && isHex(value)) next[key] = normalizeHex(value, "#000000");
          else delete next[key];
          return { overrides: next };
        }),
      resetColors: () => set({ overrides: {} }),
      resetGroup: (group) =>
        set(() => {
          switch (group) {
            case "background": return { background: { ...DEFAULT_BACKGROUND, hasImage: get().background.hasImage } };
            case "typography": return { typography: { ...DEFAULT_TYPOGRAPHY } };
            case "window": return { window: { ...DEFAULT_WINDOW } };
            case "moodBars": return { moodBars: { ...DEFAULT_MOOD_BARS } };
            case "motion": return { motion: "system" as const, motionIntensity: "standard" as const };
            case "dashboard": return { dashboard: { order: [...DASHBOARD_CARDS], hidden: [] } };
            case "theme": return { themeId: DEFAULT_THEME_ID, mode: "system" as const, overrides: {} };
          }
        }),
      resetAll: () => set({ ...structuredClone(DEFAULT_APPEARANCE), onboarded: true, background: { ...DEFAULT_BACKGROUND, hasImage: get().background.hasImage } }),
      replaceAll: (data) => set({ ...sanitizeAppearance(data) }),
      addPalette: (p) => {
        const id = newId();
        set((s) => ({ customPalettes: [...s.customPalettes, { ...p, id }].slice(0, 50) }));
        return id;
      },
      updatePalette: (id, patch) => set((s) => ({ customPalettes: s.customPalettes.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      duplicatePalette: (id) => {
        const src = get().customPalettes.find((p) => p.id === id);
        if (!src) return null;
        const nid = newId();
        set((s) => ({ customPalettes: [...s.customPalettes, { ...src, id: nid, name: `${src.name} copy`.slice(0, 40) }].slice(0, 50) }));
        return nid;
      },
      removePalette: (id) =>
        set((s) => ({
          customPalettes: s.customPalettes.filter((p) => p.id !== id),
          themeId: s.themeId === `custom:${id}` ? DEFAULT_THEME_ID : s.themeId,
        })),
    }),
    {
      name: STORAGE_KEYS.appearance,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Persist data only, never actions.
      partialize: (s): AppearanceData => ({
        themeId: s.themeId, mode: s.mode, overrides: s.overrides, enforceReadable: s.enforceReadable,
        customPalettes: s.customPalettes, background: s.background, typography: s.typography, motion: s.motion,
        motionIntensity: s.motionIntensity, window: s.window, moodBars: s.moodBars, visualMood: s.visualMood,
        logoId: s.logoId, userName: s.userName, cornerRadius: s.cornerRadius, windowRadius: s.windowRadius, clock: s.clock, sidebarCollapsed: s.sidebarCollapsed, dashboard: s.dashboard, onboarded: s.onboarded,
        neutralNotifications: s.neutralNotifications, quietHours: s.quietHours,
      }),
      // Corrupted or hand-edited storage can never crash startup: everything is re-validated.
      merge: (persisted, current) => ({ ...current, ...sanitizeAppearance({ ...DEFAULT_APPEARANCE, ...legacyDefaults(), ...(isObj(persisted) ? persisted : {}) }) }),
    },
  ),
);

/** Serialises appearance preferences (never health data) for backup / sharing. */
export function exportAppearance(): string {
  const s = useAppearance.getState();
  const data = sanitizeAppearance(s);
  return JSON.stringify({ app: "menstruation-tracker", kind: "appearance", version: 2, data }, null, 2);
}

/** Parses an exported file. Returns the validated data or an error message. */
export function parseAppearanceFile(text: string): { ok: true; data: AppearanceData } | { ok: false; error: string } {
  if (text.length > 2_000_000) return { ok: false, error: "That file is too large to be an appearance export." };
  try {
    const j = JSON.parse(text) as unknown;
    if (!isObj(j) || j.kind !== "appearance" || !isObj(j.data)) return { ok: false, error: "This is not a Menstruation Tracker appearance file." };
    return { ok: true, data: sanitizeAppearance(j.data) };
  } catch {
    return { ok: false, error: "The file could not be read. It may be damaged." };
  }
}

export function exportPalette(p: CustomPalette): string {
  return JSON.stringify({ app: "menstruation-tracker", kind: "palette", version: 1, palette: { name: p.name, accent: p.accent, accent2: p.accent2 } }, null, 2);
}

export function parsePaletteFile(text: string): { ok: true; palette: Omit<CustomPalette, "id"> } | { ok: false; error: string } {
  try {
    const j = JSON.parse(text) as unknown;
    if (!isObj(j) || j.kind !== "palette" || !isObj(j.palette)) return { ok: false, error: "This is not a palette file." };
    const p = j.palette;
    if (typeof p.accent !== "string" || !isHex(p.accent)) return { ok: false, error: "The palette has no valid accent colour." };
    return {
      ok: true,
      palette: {
        name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 40) : "Imported palette",
        accent: normalizeHex(p.accent, "#7c5cbf"),
        accent2: typeof p.accent2 === "string" && isHex(p.accent2) ? normalizeHex(p.accent2, "#d88fb0") : undefined,
      },
    };
  } catch {
    return { ok: false, error: "The file could not be read. It may be damaged." };
  }
}
