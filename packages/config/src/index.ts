/** Application-wide constants. Keep APP_VERSION in sync (see scripts/check-version.mjs). */
export const APP_NAME = "Menstruation Tracker";
export const APP_VERSION = "0.3.1";
export const APP_IDENTIFIER = "app.menstruationtracker.desktop";

/** Selectable app logos (ids mirror `LOGOS` in src-tauri/src/shell). */
export const LOGO_IDS = [
  "bloom-petal", "lunar-cycle", "heartleaf",
  "mt04-petal-drop", "mt05-cycle-calendar", "mt06-gentle-profile", "mt07-lotus-stillness", "mt08-moon-blossom",
  "mt09-hourglass-bloom", "mt10-heart-rhythm", "mt11-calendar-drop", "mt12-butterfly-petals", "mt13-path-of-renewal",
] as const;
export type LogoId = (typeof LOGO_IDS)[number];
export const DEFAULT_LOGO: LogoId = "bloom-petal";

/** localStorage keys. Only non-health UI preferences may be stored here. */
export const STORAGE_KEYS = {
  /** v0.1.x settings; read once for migration, never written. */
  legacySettings: "mt.settings.v1",
  appearance: "mt.appearance.v2",
  /** Tiny pre-paint snapshot (colours only) read by the inline boot script in index.html. */
  boot: "mt.boot.v1",
  /** Notification preferences, categories and the in-app notification history (no health values). */
  notifications: "mt.notifications.v1",
  /** ISO time of the last time the app was opened; drives the "welcome back" message. */
  lastOpen: "mt.lastopen.v1",
} as const;

/** Events emitted by the native shell (src-tauri/src/shell). */
export const NATIVE_EVENTS = {
  exit: "mt://exit",
  navigate: "mt://navigate",
  trayOpen: "mt://tray-open",
  /** Sent to the themed toast window with the notification(s) to show. */
  toast: "mt://toast",
} as const;
