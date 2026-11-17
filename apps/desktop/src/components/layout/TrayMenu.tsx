import { useCallback, useEffect, useRef } from "react";
import { Eye, EyeOff, LayoutDashboard, LogOut, PanelTop, type LucideIcon } from "lucide-react";
import { cn } from "@mt/ui";
import { APP_NAME, APP_VERSION, NATIVE_EVENTS } from "@mt/config";
import { BrandMark } from "./BrandMark";
import { shell } from "../../services/shell";
import { isNative } from "../../services/native";

interface Item { id: "show" | "hide" | "dashboard" | "exit"; label: string; hint: string; icon: LucideIcon; danger?: boolean }

const ITEMS: readonly Item[] = [
  { id: "show", label: "Show Window", hint: "Bring the app to the front", icon: Eye },
  { id: "hide", label: "Hide Window", hint: "Keep running in the tray", icon: EyeOff },
  { id: "dashboard", label: "Open Dashboard", hint: "Go to your overview", icon: LayoutDashboard },
  { id: "exit", label: "Exit Application", hint: "Close completely", icon: LogOut, danger: true },
];

/**
 * The tray right-click menu. It is a small frameless window rendering the same React app, theme, fonts, logo and
 * colours as the main window (it shares the appearance store), so it always matches the user's customisation.
 */
export function TrayMenu() {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    document.documentElement.classList.add("tray-window");
    return () => document.documentElement.classList.remove("tray-window");
  }, []);

  const hideSelf = useCallback(async () => {
    if (!isNative()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide();
  }, []);

  // Focus the first item every time the menu is shown.
  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    void shell.on(NATIVE_EVENTS.trayOpen, () => refs.current[0]?.focus()).then((u) => (cancelled ? u() : (off = u)));
    return () => { cancelled = true; off?.(); };
  }, []);

  const run = (id: Item["id"]) => void shell.trayAction(id).catch((e) => console.warn("[tray] action failed", e?.code));

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = refs.current.findIndex((r) => r === document.activeElement);
    const move = (n: number) => { e.preventDefault(); refs.current[(n + ITEMS.length) % ITEMS.length]?.focus(); };
    if (e.key === "ArrowDown") move(i + 1);
    else if (e.key === "ArrowUp") move(i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(ITEMS.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); void hideSelf(); }
  };

  return (
    <div className="h-full p-2">
      <div
        role="menu" aria-label={`${APP_NAME} tray menu`} onKeyDown={onKeyDown}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
      >
        <div className="flex items-center gap-3 border-b border-line bg-chrome px-3.5 py-3">
          <BrandMark size={30} />
          <div className="min-w-0 leading-tight">
            <div className="font-display truncate text-[0.95rem] text-ink">{APP_NAME}</div>
            <div className="t-small flex items-center gap-1 text-muted"><PanelTop className="size-3" aria-hidden />v{APP_VERSION}</div>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 p-1.5">
          {ITEMS.map((it, i) => (
            <div key={it.id} className="contents">
              {it.id === "exit" && <div className="my-1 h-px bg-line" role="separator" />}
              <button
                ref={(el) => { refs.current[i] = el; }}
                type="button" role="menuitem" onClick={() => run(it.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors duration-150",
                  "hover:bg-accent-soft focus-visible:bg-accent-soft",
                  it.danger && "hover:bg-danger/10 focus-visible:bg-danger/10",
                )}
              >
                <it.icon className={cn("size-[17px] shrink-0", it.danger ? "text-danger" : "text-accent")} strokeWidth={1.8} aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className={cn("t-body block font-medium", it.danger ? "text-danger" : "text-ink")}>{it.label}</span>
                  <span className="t-small block truncate text-muted">{it.hint}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
