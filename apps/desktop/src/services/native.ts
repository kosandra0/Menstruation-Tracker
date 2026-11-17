import { AppError, toAppError } from "../lib/errors";

/** True when running inside the Tauri webview (false in a plain browser / tests). */
export function isNative(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * The ONLY place the frontend calls native commands. Features use typed services
 * (storage.ts, app.ts, window.ts) built on top of this.
 */
export async function invokeNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isNative()) throw new AppError("native_unavailable", "Native features require the desktop app.");
  const { invoke } = await import("@tauri-apps/api/core");
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toAppError(error);
  }
}
