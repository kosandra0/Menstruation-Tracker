import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { applyPalette, type ThemeMode } from "@mt/design-tokens";
import { STORAGE_KEYS } from "@mt/config";
import { useAppearance } from "../../stores/appearance";
import { resolvePalette } from "../../lib/palette";
import { resolveMode } from "../../lib/theme";
import { resolveFont } from "../../lib/fonts";
import { useSystemDark } from "../../hooks/useSystemDark";
import { useToday } from "../../hooks/useToday";
import { shell } from "../../services/shell";
import { useNativeSync } from "./nativeSync";

/** Resolved light/dark mode for the current preference and OS appearance. */
export function useResolvedMode(): ThemeMode {
  const mode = useAppearance((s) => s.mode);
  const systemDark = useSystemDark();
  return resolveMode(mode, systemDark);
}

/**
 * Applies the whole appearance (palette, typography, motion) to <html>, animates theme changes, mirrors window
 * behaviour/logo to the native shell and keeps the tray-menu window in sync. Everything is idempotent and every
 * timer/listener is cleaned up.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useAppearance((s) => s.themeId);
  const customPalettes = useAppearance((s) => s.customPalettes);
  const overrides = useAppearance((s) => s.overrides);
  const enforceReadable = useAppearance((s) => s.enforceReadable);
  const moodBars = useAppearance((s) => s.moodBars);
  const visualMood = useAppearance((s) => s.visualMood);
  const typography = useAppearance((s) => s.typography);
  const motion = useAppearance((s) => s.motion);
  const win = useAppearance((s) => s.window);
  const logoId = useAppearance((s) => s.logoId);
  const cornerRadius = useAppearance((s) => s.cornerRadius);
  const mode = useResolvedMode();
  const today = useToday();
  const first = useRef(true);
  const nativeSync = useNativeSync();

  const palette = useMemo(
    () => resolvePalette({ themeId, customPalettes, overrides, enforceReadable, moodBars, visualMood }, mode, today),
    [themeId, customPalettes, overrides, enforceReadable, moodBars, visualMood, mode, today],
  );

  useEffect(() => {
    const root = document.documentElement;
    let timer: number | undefined;
    if (!first.current) {
      root.classList.add("theme-transition");
      timer = window.setTimeout(() => root.classList.remove("theme-transition"), 380);
    }
    first.current = false;
    applyPalette(root, palette, mode, themeId);
    try {
      // Colours only: read by the inline boot script so the next launch never flashes the wrong theme.
      localStorage.setItem(STORAGE_KEYS.boot, JSON.stringify({ canvas: palette.canvas, ink: palette.ink, accent: palette.accent, mode }));
    } catch {
      /* storage unavailable: the boot snapshot is an optimisation only */
    }
    return () => window.clearTimeout(timer);
  }, [palette, mode, themeId]);

  useEffect(() => {
    const root = document.documentElement.style;
    const { option, fellBack } = resolveFont(typography.family);
    root.setProperty("--font-body", option.stack);
    // Display headings follow the chosen family unless the default is selected (keeps the elegant serif default).
    if (option.id === "default") root.removeProperty("--font-display-stack");
    else root.setProperty("--font-display-stack", option.stack);
    root.setProperty("--s-base", String(typography.scale));
    root.setProperty("--s-heading", String(typography.headingScale));
    root.setProperty("--s-body", String(typography.bodyScale));
    root.setProperty("--s-label", String(typography.labelScale));
    root.setProperty("--fw-body", String(typography.weight));
    root.setProperty("--lh-body", String(typography.lineHeight));
    root.setProperty("--ls-body", `${typography.letterSpacing}em`);
    if (fellBack) console.warn("[appearance] selected font unavailable; using default");
  }, [typography]);

  // Interface roundness: cards use the chosen radius, smaller controls a proportional one.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--radius-card", `${cornerRadius}px`);
    root.setProperty("--radius-control", `${Math.round(cornerRadius * 0.6)}px`);
  }, [cornerRadius]);

  // Window corners: the app window's own rounded frame (see styles/index.css and lib/windowShape.ts).
  const windowRadius = useAppearance((s) => s.windowRadius);
  useEffect(() => {
    document.documentElement.style.setProperty("--radius-window", `${windowRadius}px`);
  }, [windowRadius]);

  useEffect(() => {
    const el = document.documentElement;
    if (motion === "system") el.removeAttribute("data-reduced-motion");
    else el.dataset.reducedMotion = String(motion === "reduced");
  }, [motion]);

  useEffect(() => {
    if (!nativeSync) return;
    shell.setWindowBehavior(win.closeToTray, win.minimizeToTray).catch((e) => console.warn("[shell] window behaviour not applied", e?.code));
  }, [nativeSync, win.closeToTray, win.minimizeToTray]);

  useEffect(() => {
    if (!nativeSync) return;
    shell.setLogo(logoId).catch((e) => console.warn("[shell] logo not applied", e?.code));
  }, [nativeSync, logoId]);

  // The tray-menu window shares this origin; pick up changes made in the other window.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.appearance) void useAppearance.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <>{children}</>;
}
