import { useCallback, useEffect, useRef, useState } from "react";
import { NATIVE_EVENTS } from "@mt/config";
import { shell } from "../../services/shell";
import { invokeNative, isNative } from "../../services/native";
import { sanitizeLook } from "../../stores/notifications";
import { ToastStack, type ToastPayload } from "./ToastStack";
import { useToastFeed } from "./notify";

/** Accepts only well-formed payloads from the main window; anything else is ignored. */
export function parsePayload(raw: unknown): ToastPayload | null {
  try {
    const p = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<ToastPayload> | null;
    if (!p || typeof p.id !== "string" || typeof p.title !== "string" || typeof p.body !== "string" || typeof p.route !== "string" || !p.look || typeof p.look !== "object") return null;
    return { ...(p as ToastPayload), look: sanitizeLook(p.look) };
  } catch {
    return null;
  }
}

/**
 * The page shown inside the transparent, never-focused notification window. It listens for notifications from the main
 * window, keeps at most `maxVisible` on screen, sizes the window to fit them and hides the window when none are left.
 * It shares the app's appearance store, so it always matches the user's theme, fonts and logo.
 */
export function ToastWindow() {
  const [items, setItems] = useState<ToastPayload[]>([]);
  /** Set once the listener exists and anything queued before this page was ready has been taken. */
  const [booted, setBooted] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const corner = items[items.length - 1]?.look.corner ?? "bottom-right";
  const cornerRef = useRef(corner);
  cornerRef.current = corner;

  useEffect(() => {
    document.documentElement.classList.add("tray-window"); // fully transparent page
    return () => document.documentElement.classList.remove("tray-window");
  }, []);

  const add = useCallback((p: ToastPayload) => {
    setItems((cur) => [...cur.filter((x) => x.id !== p.id), p].slice(-Math.max(1, Math.min(4, p.look.maxVisible || 3))));
  }, []);
  const dismiss = useCallback((id: string) => setItems((cur) => cur.filter((x) => x.id !== id)), []);

  // Listener first, then ask for anything that arrived before this page was ready.
  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    void shell.on<string>(NATIVE_EVENTS.toast, (raw) => { const p = parsePayload(raw); if (p) add(p); }).then(async (u) => {
      if (cancelled) { u(); return; }
      off = u;
      try {
        const pending = await invokeNative<string[]>("toast_take_pending");
        for (const raw of pending) { const p = parsePayload(raw); if (p) add(p); }
      } catch { /* nothing queued */ }
      if (!cancelled) setBooted(true);
    });
    return () => { cancelled = true; off?.(); };
  }, [add]);

  // Fit the window to the stack; hide it once everything has been dismissed (after the exit animation).
  useEffect(() => {
    if (!isNative() || !booted) return;
    if (items.length === 0) {
      // Wait for the 0.6 s fade-out of the last popup before the window is hidden.
      const t = window.setTimeout(() => void invokeNative("toast_hide").catch(() => {}), 700);
      return () => window.clearTimeout(t);
    }
    const el = wrap.current;
    if (!el) return;
    const send = () => void invokeNative("toast_layout", { height: Math.ceil(el.getBoundingClientRect().height), corner: cornerRef.current }).catch(() => {});
    send();
    const ro = new ResizeObserver(send);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length, corner, booted]);

  const open = useCallback((p: ToastPayload) => {
    void invokeNative("toast_open", { path: p.route }).catch(() => {});
    dismiss(p.id);
  }, [dismiss]);

  const top = corner.startsWith("top");
  return (
    <div className={`flex h-full w-full ${top ? "items-start" : "items-end"}`}>
      <div ref={wrap} className="w-full p-2">
        <ToastStack items={items} onDismiss={dismiss} onOpen={open} />
      </div>
    </div>
  );
}

/** Browser/test fallback: draws the popups inside the app window. Not used in the Windows app. */
export function InAppToastHost() {
  const items = useToastFeed((s) => s.items);
  const dismiss = useToastFeed((s) => s.dismiss);
  if (isNative() || items.length === 0) return null;
  const corner = items[items.length - 1].look.corner;
  const pos = `${corner.startsWith("top") ? "top-12" : "bottom-4"} ${corner.endsWith("left") ? "left-4" : "right-4"}`;
  return (
    <div className={`pointer-events-none fixed z-[90] ${pos}`}>
      <div className="pointer-events-auto">
        <ToastStack items={items} onDismiss={dismiss} onOpen={(p) => { window.location.hash = `#${p.route}`; dismiss(p.id); }} />
      </div>
    </div>
  );
}
