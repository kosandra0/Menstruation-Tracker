import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS } from "@mt/config";
import { THEMES } from "@mt/design-tokens";

/**
 * Notification preferences and the in-app notification history.
 *
 * Privacy: the history stores only *which kind* of notification appeared and *when* (plus the id of a reminder, so its
 * label can be read from the encrypted records when displayed). It never stores notes, symptoms or reminder text.
 */

export type NotificationCategory = "reminder" | "daily-log" | "period-soon" | "period-late" | "period-end" | "welcome" | "system";
export const CATEGORIES: readonly NotificationCategory[] = ["reminder", "daily-log", "period-soon", "period-late", "period-end", "welcome", "system"];

export type ToastStyle = "soft" | "accent" | "tinted" | "minimal" | "compact";
export const TOAST_STYLES: readonly ToastStyle[] = ["soft", "accent", "tinted", "minimal", "compact"];
export type ToastCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export const TOAST_CORNERS: readonly ToastCorner[] = ["bottom-right", "bottom-left", "top-right", "top-left"];
export type ToastAnimation = "slide" | "fade" | "pop" | "none";
export type ToastSize = "compact" | "comfortable" | "large";

/** The look of notification popups. It is copied into every popup so the popup window needs no settings of its own. */
export interface ToastLook {
  style: ToastStyle;
  corner: ToastCorner;
  size: ToastSize;
  /** `app` follows the theme chosen for the app; otherwise a built-in theme id. */
  themeId: string;
  /** `app` follows the app's light/dark mode. */
  mode: "app" | "light" | "dark";
  radius: number; // 0-24 px
  durationSec: number; // 3-30
  sticky: boolean; // stays until dismissed
  animation: ToastAnimation;
  showLogo: boolean;
  showProgress: boolean;
  maxVisible: number; // 1-4
}

export interface NotificationSettings extends ToastLook {
  /** Master switch: when off nothing is shown and no reminder or prompt fires. */
  enabled: boolean;
  reminders: boolean;
  dailyLog: boolean;
  dailyLogTime: string; // HH:MM
  /** Days without any entry after which the daily prompt says so. */
  inactivityDays: number; // 2-14
  periodSoon: boolean;
  periodLeadDays: number; // 0-7
  periodLate: boolean;
  periodEnd: boolean;
  /** Time of day for the period-related prompts. */
  periodTime: string; // HH:MM
  /** Show a welcome-back message after being away. */
  welcomeBack: boolean;
}

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  at: string; // ISO time
  read: boolean;
  /** Reminder id (category `reminder`), used to look up its label in the encrypted records. */
  ref?: string;
}

export const DEFAULT_LOOK: ToastLook = {
  style: "soft", corner: "bottom-right", size: "comfortable", themeId: "app", mode: "app", radius: 16, durationSec: 8, sticky: false,
  animation: "slide", showLogo: true, showProgress: true, maxVisible: 3,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  ...DEFAULT_LOOK,
  enabled: true,
  reminders: true,
  dailyLog: true,
  dailyLogTime: "20:00",
  inactivityDays: 2,
  periodSoon: true,
  periodLeadDays: 2,
  periodLate: true,
  periodEnd: true,
  periodTime: "09:00",
  welcomeBack: true,
};

/** Most recent entries kept; older ones are dropped automatically (roughly the last few months at a few prompts a day). */
const MAX_HISTORY = 400;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fb);
const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fb: T): T => (typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fb);
const hhmm = (v: unknown, fb: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fb);

export function sanitizeLook(input: unknown, base: ToastLook = DEFAULT_LOOK): ToastLook {
  const i = isObj(input) ? input : {};
  const themeId = typeof i.themeId === "string" && (i.themeId === "app" || THEMES.some((t) => t.id === i.themeId)) ? i.themeId : base.themeId;
  return {
    style: oneOf(i.style, TOAST_STYLES, base.style),
    corner: oneOf(i.corner, TOAST_CORNERS, base.corner),
    size: oneOf(i.size, ["compact", "comfortable", "large"] as const, base.size),
    themeId,
    mode: oneOf(i.mode, ["app", "light", "dark"] as const, base.mode),
    radius: num(i.radius, 0, 24, base.radius),
    durationSec: num(i.durationSec, 3, 30, base.durationSec),
    sticky: bool(i.sticky, base.sticky),
    animation: oneOf(i.animation, ["slide", "fade", "pop", "none"] as const, base.animation),
    showLogo: bool(i.showLogo, base.showLogo),
    showProgress: bool(i.showProgress, base.showProgress),
    maxVisible: num(i.maxVisible, 1, 4, base.maxVisible),
  };
}

export function sanitizeSettings(input: unknown): NotificationSettings {
  const d = DEFAULT_NOTIFICATION_SETTINGS;
  const i = isObj(input) ? input : {};
  return {
    ...sanitizeLook(i, d),
    enabled: bool(i.enabled, d.enabled),
    reminders: bool(i.reminders, d.reminders),
    dailyLog: bool(i.dailyLog, d.dailyLog),
    dailyLogTime: hhmm(i.dailyLogTime, d.dailyLogTime),
    inactivityDays: num(i.inactivityDays, 2, 14, d.inactivityDays),
    periodSoon: bool(i.periodSoon, d.periodSoon),
    periodLeadDays: num(i.periodLeadDays, 0, 7, d.periodLeadDays),
    periodLate: bool(i.periodLate, d.periodLate),
    periodEnd: bool(i.periodEnd, d.periodEnd),
    periodTime: hhmm(i.periodTime, d.periodTime),
    welcomeBack: bool(i.welcomeBack, d.welcomeBack),
  };
}

export function sanitizeHistory(input: unknown): NotificationItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((x): x is Record<string, unknown> => isObj(x) && typeof x.id === "string" && typeof x.at === "string" && Number.isFinite(Date.parse(x.at as string)))
    .map((x) => ({
      id: String(x.id).slice(0, 64),
      category: oneOf(x.category, CATEGORIES, "system"),
      at: String(x.at),
      read: bool(x.read, false),
      ref: typeof x.ref === "string" ? x.ref.slice(0, 64) : undefined,
    }))
    .slice(-MAX_HISTORY);
}

export interface NotificationsState {
  settings: NotificationSettings;
  history: NotificationItem[];
  set: (patch: Partial<NotificationSettings>) => void;
  reset: () => void;
  replaceSettings: (s: unknown) => void;
  add: (item: Omit<NotificationItem, "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotifications = create<NotificationsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_NOTIFICATION_SETTINGS },
      history: [],
      set: (patch) => set((s) => ({ settings: sanitizeSettings({ ...s.settings, ...patch }) })),
      reset: () => set({ settings: { ...DEFAULT_NOTIFICATION_SETTINGS } }),
      replaceSettings: (s) => set({ settings: sanitizeSettings(s) }),
      add: (item) => set((s) => ({ history: [...s.history.filter((h) => h.id !== item.id), { ...item, read: false }].slice(-MAX_HISTORY) })),
      markRead: (id) => set((s) => ({ history: s.history.map((h) => (h.id === id ? { ...h, read: true } : h)) })),
      markAllRead: () => set((s) => ({ history: s.history.map((h) => ({ ...h, read: true })) })),
      remove: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      clear: () => set({ history: [] }),
    }),
    {
      name: STORAGE_KEYS.notifications,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings, history: s.history }),
      merge: (persisted, current) => {
        const p = isObj(persisted) ? persisted : {};
        return { ...current, settings: sanitizeSettings(p.settings), history: sanitizeHistory(p.history) };
      },
    },
  ),
);

export const unreadCount = (h: readonly NotificationItem[]): number => h.filter((x) => !x.read).length;
