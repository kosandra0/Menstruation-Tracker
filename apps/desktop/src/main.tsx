import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyPalette } from "@mt/design-tokens";
import { todayIso } from "@mt/domain";
import "./styles/index.css";
import App from "./app/App";
import { useAppearance } from "./stores/appearance";
import { resolvePalette } from "./lib/palette";
import { resolveMode } from "./lib/theme";
import { startWindowShape } from "./lib/windowShape";
import { isNative } from "./services/native";

// Apply the persisted appearance synchronously, before the first paint, so there is never a flash of the wrong theme.
const a = useAppearance.getState();
const mode = resolveMode(a.mode, window.matchMedia("(prefers-color-scheme: dark)").matches);
applyPalette(document.documentElement, resolvePalette(a, mode, todayIso()), mode, a.themeId);

// Tauri adds a CSP nonce to the page. Libraries that inject <style> tags at runtime (Radix scroll lock) look for it in
// `__webpack_nonce__`; without it the strict style-src policy would block them.
const nonce = document.querySelector<HTMLElement>("style[nonce], script[nonce]")?.nonce;
if (nonce) (globalThis as { __webpack_nonce__?: string }).__webpack_nonce__ = nonce;

// The main application window is a transparent, frameless window: the app draws its own rounded frame (--radius-window).
// Popup and tray windows keep their own transparent pages and are not affected.
const windowParam = new URLSearchParams(window.location.search).get("window");
if (!windowParam && isNative()) {
  document.documentElement.classList.add("native-window");
  startWindowShape();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
