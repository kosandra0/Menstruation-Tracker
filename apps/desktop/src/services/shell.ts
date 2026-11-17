import type { LogoId } from "@mt/config";
import type { NATIVE_EVENTS } from "@mt/config";
import { invokeNative, isNative } from "./native";

/**
 * Typed wrappers over the native shell (tray, exit, startup, logo). Every function is a safe no-op in a plain
 * browser so the UI stays previewable and testable.
 */
export const shell = {
  async setWindowBehavior(closeToTray: boolean, minimizeToTray: boolean): Promise<void> {
    if (isNative()) await invokeNative("set_window_behavior", { closeToTray, minimizeToTray });
  },
  async setLogo(id: LogoId): Promise<void> {
    if (isNative()) await invokeNative("set_app_logo", { id });
  },
  async requestExit(): Promise<void> {
    if (isNative()) await invokeNative("request_exit");
    else window.close();
  },
  async quit(): Promise<void> {
    if (isNative()) await invokeNative("quit_app");
  },
  async hideToTray(): Promise<void> {
    if (isNative()) await invokeNative("hide_to_tray");
  },
  async trayAction(action: "show" | "hide" | "dashboard" | "exit"): Promise<void> {
    if (isNative()) await invokeNative("tray_action", { action });
  },

  /** Subscribes to a native event; resolves to an unsubscribe function (a no-op outside Tauri). */
  async on<T = unknown>(event: (typeof NATIVE_EVENTS)[keyof typeof NATIVE_EVENTS], handler: (payload: T) => void): Promise<() => void> {
    if (!isNative()) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen<T>(event, (e) => handler(e.payload));
  },
};

/** Windows "start with Windows" preference, backed by the autostart plugin (HKCU Run key). */
export const startup = {
  available: () => isNative(),
  async isEnabled(): Promise<boolean> {
    if (!isNative()) return false;
    const { isEnabled } = await import("@tauri-apps/plugin-autostart");
    return isEnabled();
  },
  async setEnabled(on: boolean): Promise<boolean> {
    if (!isNative()) return false;
    const m = await import("@tauri-apps/plugin-autostart");
    if (on) await m.enable();
    else await m.disable();
    return m.isEnabled();
  },
};
