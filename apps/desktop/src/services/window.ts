import { isNative } from "./native";

async function currentWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

/** Custom title-bar actions. No-ops in a browser so the shell stays previewable. */
export const windowControls = {
  async minimize() {
    if (isNative()) await (await currentWindow()).minimize();
  },
  async toggleMaximize() {
    if (isNative()) await (await currentWindow()).toggleMaximize();
  },
  async close() {
    if (isNative()) await (await currentWindow()).close();
  },
  async isMaximized(): Promise<boolean> {
    return isNative() ? (await currentWindow()).isMaximized() : false;
  },
  /** Subscribes to resize events; returns an unsubscribe function. */
  async onResized(callback: () => void): Promise<() => void> {
    if (!isNative()) return () => {};
    return (await currentWindow()).onResized(callback);
  },
};
