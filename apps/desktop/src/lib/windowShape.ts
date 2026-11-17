import { windowControls } from "../services/window";

/**
 * Keeps the rounded frame of the app window in step with its state. A maximised window is square (rounded corners would
 * leave gaps against the screen edges), so the page marks itself with `data-maximized` and the CSS removes the rounding.
 * Only the native main window uses this; it returns a cleanup function.
 */
export function startWindowShape(): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | undefined;
  const sync = () => {
    void windowControls
      .isMaximized()
      .then((m) => { document.documentElement.dataset.maximized = m ? "true" : "false"; })
      .catch(() => { document.documentElement.dataset.maximized = "false"; });
  };
  sync();
  void windowControls
    .onResized(sync)
    .then((off) => { if (cancelled) off(); else unsubscribe = off; })
    .catch(() => {});
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
