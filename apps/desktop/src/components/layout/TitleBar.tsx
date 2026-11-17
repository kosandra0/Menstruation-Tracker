import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { cn } from "@mt/ui";
import { APP_NAME } from "@mt/config";
import { BrandMark } from "./BrandMark";
import { ThemeModeMenu } from "./ThemeModeMenu";
import { NotificationBell } from "../../features/notifications/NotificationCenter";
import { ClockSlot } from "../../features/clock/ClockWidget";
import { windowControls } from "../../services/window";
import { useAppearance, type WindowSettings } from "../../stores/appearance";

const shapeClass = { square: "rounded-none", round: "rounded-lg", pill: "rounded-full" } as const;

interface Actions { minimize: () => void; maximize: () => void; close: () => void; maximized: boolean }

/** Conventional Windows caption buttons (minimise, maximise/restore, close). */
function WindowsControls({ w, a }: { w: WindowSettings; a: Actions }) {
  const btn = (label: string, onClick: () => void, children: ReactNode, danger?: boolean) => (
    <button
      key={label} type="button" aria-label={label} onClick={onClick}
      style={{ width: w.buttonSize, height: w.shape === "square" ? "100%" : Math.min(32, w.buttonSize) } as CSSProperties}
      className={cn(
        "no-drag grid place-items-center text-muted transition-colors duration-150",
        shapeClass[w.shape],
        danger
          ? cn("hover:bg-[#c42b1c] hover:text-white", w.colored && "text-danger")
          : cn("hover:bg-surface-alt hover:text-ink", w.colored && "text-accent"),
      )}
    >
      {children}
    </button>
  );
  return (
    <div className="flex h-full items-center" style={{ gap: w.spacing }}>
      {btn("Minimize", a.minimize, <Minus className="size-4" />)}
      {btn(a.maximized ? "Restore" : "Maximize", a.maximize, a.maximized ? <Copy className="size-3.5 -scale-x-100" /> : <Square className="size-3.5" />)}
      {btn("Close", a.close, <X className="size-4" />, true)}
    </div>
  );
}

/** macOS-inspired traffic lights (order: close, minimise, maximise). Glyphs appear on hover/focus. */
function TrafficLights({ w, a }: { w: WindowSettings; a: Actions }) {
  const d = Math.min(20, Math.max(12, Math.round(w.buttonSize * 0.36)));
  const colors = w.colored ? { close: "#ff5f57", min: "#febc2e", max: "#28c840" } : { close: "var(--c-muted)", min: "var(--c-muted)", max: "var(--c-muted)" };
  const shape = w.shape === "square" ? "rounded-[4px]" : "rounded-full";
  const dot = (label: string, onClick: () => void, color: string, glyph: ReactNode) => (
    <button
      key={label} type="button" aria-label={label} onClick={onClick}
      style={{ width: w.shape === "pill" ? d * 1.7 : d, height: d, background: color, opacity: w.colored ? 1 : 0.55 } as CSSProperties}
      className={cn("no-drag group grid place-items-center text-black/60 transition-[filter,opacity] duration-150 hover:opacity-100 hover:brightness-95", shape, w.shape === "pill" && "rounded-full")}
    >
      <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">{glyph}</span>
    </button>
  );
  const g = Math.max(8, d - 7);
  return (
    <div className="flex h-full items-center" style={{ gap: 6 + w.spacing }}>
      {dot("Close", a.close, colors.close, <X width={g} height={g} strokeWidth={3} />)}
      {dot("Minimize", a.minimize, colors.min, <Minus width={g} height={g} strokeWidth={3} />)}
      {dot(a.maximized ? "Restore" : "Maximize", a.maximize, colors.max, a.maximized ? <Copy width={g - 1} height={g - 1} strokeWidth={3} /> : <Square width={g - 1} height={g - 1} strokeWidth={3} />)}
    </div>
  );
}

/** Three icon buttons inside one soft capsule. */
function CapsuleControls({ w, a }: { w: WindowSettings; a: Actions }) {
  const h = Math.min(30, Math.max(22, Math.round(w.buttonSize * 0.62)));
  const b = (label: string, onClick: () => void, icon: ReactNode, danger?: boolean) => (
    <button key={label} type="button" aria-label={label} onClick={onClick} style={{ height: h - 6, width: Math.round(h * 1.15) }}
      className={cn("no-drag grid place-items-center rounded-full text-muted transition-colors duration-150", danger ? "hover:bg-danger hover:text-white" : "hover:bg-surface hover:text-ink", w.colored && !danger && "text-accent")}>{icon}</button>
  );
  return (
    <div className={cn("no-drag flex items-center border border-line bg-surface-alt px-1", w.shape === "square" ? "rounded-lg" : "rounded-full")} style={{ height: h, gap: w.spacing }}>
      {b("Minimize", a.minimize, <Minus className="size-3.5" />)}
      {b(a.maximized ? "Restore" : "Maximize", a.maximize, a.maximized ? <Copy className="size-3 -scale-x-100" /> : <Square className="size-3" />)}
      {b("Close", a.close, <X className="size-3.5" />, true)}
    </div>
  );
}

/** Outlined round buttons with the glyph always visible. */
function RingControls({ w, a }: { w: WindowSettings; a: Actions }) {
  const d = Math.min(30, Math.max(18, Math.round(w.buttonSize * 0.58)));
  const b = (label: string, onClick: () => void, icon: ReactNode, tone: string) => (
    <button key={label} type="button" aria-label={label} onClick={onClick} style={{ width: d, height: d, borderColor: w.colored ? tone : undefined, color: w.colored ? tone : undefined }}
      className={cn("no-drag grid place-items-center border border-line text-muted transition-colors duration-150 hover:bg-surface-alt hover:text-ink", w.shape === "square" ? "rounded-md" : "rounded-full")}>{icon}</button>
  );
  return (
    <div className="flex h-full items-center" style={{ gap: 6 + w.spacing }}>
      {b("Minimize", a.minimize, <Minus className="size-3" />, "var(--c-warning)")}
      {b(a.maximized ? "Restore" : "Maximize", a.maximize, a.maximized ? <Copy className="size-2.5 -scale-x-100" /> : <Square className="size-2.5" />, "var(--c-success)")}
      {b("Close", a.close, <X className="size-3" />, "var(--c-danger)")}
    </div>
  );
}

/** Tiny always-visible dots (minimise, maximise, close). The hit area stays comfortably large. */
function DotControls({ w, a }: { w: WindowSettings; a: Actions }) {
  const d = Math.min(14, Math.max(7, Math.round(w.buttonSize * 0.24)));
  const b = (label: string, onClick: () => void, color: string) => (
    <button key={label} type="button" aria-label={label} onClick={onClick} className="no-drag group grid size-6 place-items-center rounded-full outline-offset-0">
      <span className="block rounded-full transition-transform duration-150 group-hover:scale-125" style={{ width: d, height: d, background: w.colored ? color : "var(--c-muted)", opacity: w.colored ? 1 : 0.6 }} />
    </button>
  );
  return (
    <div className="flex h-full items-center" style={{ gap: w.spacing }}>
      {b("Minimize", a.minimize, "var(--c-warning)")}
      {b(a.maximized ? "Restore" : "Maximize", a.maximize, "var(--c-success)")}
      {b("Close", a.close, "var(--c-danger)")}
    </div>
  );
}

/** Plain words instead of icons. */
function TextControls({ w, a }: { w: WindowSettings; a: Actions }) {
  const b = (label: string, text: string, onClick: () => void, danger?: boolean) => (
    <button key={label} type="button" aria-label={label} onClick={onClick}
      className={cn("no-drag t-small px-2.5 py-1 font-medium text-muted transition-colors duration-150", w.shape === "square" ? "rounded-md" : "rounded-full", danger ? "hover:bg-danger hover:text-white" : "hover:bg-surface-alt hover:text-ink", w.colored && !danger && "text-accent")}>{text}</button>
  );
  return (
    <div className="flex h-full items-center" style={{ gap: w.spacing }}>
      {b("Minimize", "Min", a.minimize)}
      {b(a.maximized ? "Restore" : "Maximize", a.maximized ? "Restore" : "Max", a.maximize)}
      {b("Close", "Close", a.close, true)}
    </div>
  );
}

function Controls({ w, a }: { w: WindowSettings; a: Actions }) {
  switch (w.titleStyle) {
    case "traffic": return <TrafficLights w={w} a={a} />;
    case "capsule": return <CapsuleControls w={w} a={a} />;
    case "ring": return <RingControls w={w} a={a} />;
    case "dots": return <DotControls w={w} a={a} />;
    case "text": return <TextControls w={w} a={a} />;
    default: return <WindowsControls w={w} a={a} />;
  }
}

/** Visual-only preview used in Settings > Window. */
export function WindowControlsPreview({ w }: { w: WindowSettings }) {
  const a: Actions = { minimize: () => {}, maximize: () => {}, close: () => {}, maximized: false };
  return (
    <div className="pointer-events-none flex h-10 items-center justify-between rounded-xl border border-line bg-chrome px-3" aria-hidden>
      <div className={cn("flex h-full items-center", w.controlsSide === "left" ? "order-2" : "order-1")}>
        <span className="t-small text-muted">{APP_NAME}</span>
      </div>
      <div className={cn("flex h-full items-center", w.controlsSide === "left" ? "order-1" : "order-2")}>
        <Controls w={w} a={a} />
      </div>
    </div>
  );
}

/** Custom title bar. The Tauri window is created with `decorations: false`. */
export function TitleBar() {
  const w = useAppearance((s) => s.window);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    const sync = () => void windowControls.isMaximized().then((m) => !cancelled && setMaximized(m)).catch(() => {});
    sync();
    void windowControls.onResized(sync).then((u) => (cancelled ? u() : (off = u))).catch(() => {});
    return () => { cancelled = true; off?.(); };
  }, []);

  const a: Actions = {
    maximized,
    minimize: () => void windowControls.minimize().catch(() => {}),
    maximize: () => void windowControls.toggleMaximize().catch(() => {}),
    close: () => void windowControls.close().catch(() => {}),
  };
  const left = w.controlsSide === "left";
  const controls = <Controls w={w} a={a} />;
  const title = (
    <div data-tauri-drag-region className={cn("flex h-full min-w-0 flex-1 items-center", left ? "pl-4" : "pl-3")}>
      <div className="pointer-events-none flex items-center gap-2.5 text-[12px] font-medium text-muted">
        <BrandMark size={20} />
        <span>{APP_NAME}</span>
      </div>
    </div>
  );

  return (
    <div data-tauri-drag-region className="relative z-20 flex h-10 shrink-0 select-none items-center border-b border-line bg-chrome">
      {left && <div className="flex h-full items-center pl-3">{controls}</div>}
      {title}
      <div className={cn("flex h-full items-center", left && "pr-2")}>
        <ClockSlot where="titlebar" className="pointer-events-none mr-2 hidden sm:inline-flex" />
        <NotificationBell />
        <ThemeModeMenu />
        {!left && <div className="mx-1 h-4 w-px bg-line" aria-hidden />}
        {!left && controls}
      </div>
    </div>
  );
}
