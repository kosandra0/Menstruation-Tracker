import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CalendarCheck, CalendarClock, Droplet, Heart, PenLine, Sparkles, X, type LucideIcon } from "lucide-react";
import { cn } from "@mt/ui";
import { getTheme, paletteToCssVars, type ThemeId } from "@mt/design-tokens";
import { logoSrc } from "../../lib/logos";
import { useAppearance } from "../../stores/appearance";
import type { NotificationCategory, ToastLook } from "../../stores/notifications";
import { useResolvedMode } from "../../app/providers/ThemeProvider";
import { resolvePalette } from "../../lib/palette";
import { useToday } from "../../hooks/useToday";
import { advanceLifetime, pointerLeft, startLifetime } from "./popupLifetime";

/** What travels from the main window to the popup window (and into the in-app fallback). */
export interface ToastPayload {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  route: string;
  look: ToastLook;
  at: string;
}

export const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
  reminder: Bell,
  "daily-log": PenLine,
  "period-soon": CalendarClock,
  "period-late": CalendarCheck,
  "period-end": Droplet,
  welcome: Heart,
  system: Sparkles,
};

const WIDTH: Record<ToastLook["size"], number> = { compact: 316, comfortable: 364, large: 412 };

/** CSS variables of the popup's own theme (empty when it follows the app, so the app's palette is inherited). */
function useLookVars(look: ToastLook): CSSProperties {
  const appMode = useResolvedMode();
  const themeId = useAppearance((s) => s.themeId);
  const customPalettes = useAppearance((s) => s.customPalettes);
  const overrides = useAppearance((s) => s.overrides);
  const enforceReadable = useAppearance((s) => s.enforceReadable);
  const today = useToday();
  return useMemo(() => {
    if (look.themeId === "app" && look.mode === "app") return {};
    const mode = look.mode === "app" ? appMode : look.mode;
    const palette = look.themeId === "app"
      ? resolvePalette({ themeId, customPalettes, overrides, enforceReadable, moodBars: { adaptive: false } as never, visualMood: null }, mode, today)
      : getTheme(look.themeId as ThemeId)[mode];
    return paletteToCssVars(palette, mode) as CSSProperties;
  }, [look.themeId, look.mode, appMode, themeId, customPalettes, overrides, enforceReadable, today]);
}

interface CardProps {
  look: ToastLook;
  category: NotificationCategory;
  title: string;
  body: string;
  onClose?: () => void;
  onOpen?: () => void;
  /** Auto-dismiss countdown bar (milliseconds). Omit for static previews. */
  countdownMs?: number;
  paused?: boolean;
  className?: string;
}

/** One notification, drawn in the app's own look (never a Windows toast). Used by the popup window, the settings preview and the fallback. */
export function NotificationCard({ look, category, title, body, onClose, onOpen, countdownMs, paused, className }: CardProps) {
  const logoId = useAppearance((s) => s.logoId);
  const vars = useLookVars(look);
  const Icon = CATEGORY_ICON[category];
  const accent = look.style === "accent";
  const compact = look.style === "compact" || look.size === "compact";
  const minimal = look.style === "minimal";

  const shell = {
    soft: "border-line bg-surface text-ink",
    accent: "border-transparent bg-accent text-accent-contrast",
    tinted: "border-accent/30 bg-accent-soft text-ink",
    minimal: "border-line bg-surface text-ink",
    compact: "border-line bg-surface text-ink",
  }[look.style];
  const muted = accent ? "text-accent-contrast/85" : "text-muted";

  return (
    <div
      style={{ ...vars, width: WIDTH[look.size], borderRadius: look.radius, maxWidth: "100%" }}
      className={cn("group relative overflow-hidden border shadow-lift", shell, className)}
      role="group" aria-label={`Notification: ${title}`}
    >
      {look.style === "soft" && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent" />}
      <div className={cn("flex items-start gap-3", minimal || compact ? "px-3.5 py-2.5" : "px-4 py-3.5", look.style === "soft" && "pl-5")}>
        {!minimal && (
          <span
            aria-hidden
            className={cn("mt-0.5 grid size-8 shrink-0 place-items-center", accent ? "bg-accent-contrast/15 text-accent-contrast" : "bg-accent-soft text-accent")}
            style={{ borderRadius: Math.min(look.radius, 12) }}
          >
            <Icon className="size-4" strokeWidth={1.9} />
          </span>
        )}
        <button
          type="button" onClick={onOpen} disabled={!onOpen}
          className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-default"
        >
          <span className={cn("block font-medium leading-snug", compact ? "text-[0.82rem]" : "text-[0.92rem]")}>{title}</span>
          {!(look.style === "compact") && <span className={cn("mt-0.5 block text-[0.8rem] leading-snug", muted)}>{body}</span>}
        </button>
        {look.showLogo && !minimal && (
          <img src={logoSrc(logoId)} alt="" width={20} height={20} draggable={false} className="mt-0.5 size-5 shrink-0 rounded-md opacity-90" />
        )}
        {onClose && (
          <button
            type="button" onClick={onClose} aria-label="Dismiss notification"
            className={cn("-mr-1 -mt-0.5 shrink-0 rounded-md p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60", accent ? "text-accent-contrast/80 hover:bg-accent-contrast/15" : "text-muted hover:bg-surface-alt hover:text-ink")}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {countdownMs !== undefined && look.showProgress && !look.sticky && (
        <span aria-hidden className={cn("toast-progress absolute inset-x-0 bottom-0 h-[3px] origin-left", accent ? "bg-accent-contrast/50" : "bg-accent/70")} style={{ animationDuration: `${countdownMs}ms`, animationPlayState: paused ? "paused" : "running" }} />
      )}
    </div>
  );
}

function ToastItem({ item, onDismiss, onOpen }: { item: ToastPayload; onDismiss: (id: string) => void; onOpen: (p: ToastPayload) => void }) {
  const { look } = item;
  const [paused, setPaused] = useState(false);
  const total = look.durationSec * 1000;
  // Lifetime rules (see popupLifetime.ts): paused automatic timer while hovered, grace on leave, hard ceiling.
  const life = useRef(startLifetime(look.durationSec));
  const hovered = useRef(false);
  const last = useRef(0);
  const finished = useRef(false);

  // One ticking clock per notification. Sticky popups (chosen by the user) are closed only by the user.
  useEffect(() => {
    if (look.sticky) return;
    last.current = Date.now();
    const tick = window.setInterval(() => {
      const now = Date.now();
      const { lifetime, expired } = advanceLifetime(life.current, now - last.current, hovered.current);
      last.current = now;
      life.current = lifetime;
      if (expired && !finished.current) {
        finished.current = true;
        onDismiss(item.id);
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [look.sticky, item.id, onDismiss]);

  const enter = () => { hovered.current = true; setPaused(true); };
  const leave = () => {
    hovered.current = false;
    setPaused(false);
    life.current = pointerLeft(life.current);
  };

  const right = look.corner.endsWith("right");
  const variants = {
    slide: { initial: { opacity: 0, x: right ? 48 : -48 }, animate: { opacity: 1, x: 0 } },
    fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
    pop: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } },
    none: { initial: { opacity: 1 }, animate: { opacity: 1 } },
  }[look.animation];
  // Every popup leaves with a slow fade (instant only when the user chose "none").
  const exit = look.animation === "none"
    ? { opacity: 0, transition: { duration: 0 } }
    : { opacity: 0, scale: 0.98, transition: { duration: 0.6, ease: "easeInOut" as const } };

  return (
    <motion.div
      layout="position" {...variants} exit={exit}
      transition={{ duration: look.animation === "none" ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={enter} onPointerLeave={leave}
      onFocus={enter} onBlur={leave}
      className={cn("flex", right ? "justify-end" : "justify-start")}
    >
      <NotificationCard
        look={look} category={item.category} title={item.title} body={item.body}
        onClose={() => onDismiss(item.id)} onOpen={() => onOpen(item)}
        countdownMs={total} paused={paused}
      />
    </motion.div>
  );
}

/** The visible stack. The newest notification is nearest the screen corner it is anchored to. */
export function ToastStack({ items, onDismiss, onOpen }: { items: readonly ToastPayload[]; onDismiss: (id: string) => void; onOpen: (p: ToastPayload) => void }) {
  const top = items[0]?.look.corner.startsWith("top");
  const ordered = top ? [...items].reverse() : items;
  return (
    <div aria-live="polite" aria-label="Notifications" className={cn("flex flex-col gap-2.5", !top && "justify-end")}>
      <AnimatePresence initial={false} mode="popLayout">
        {ordered.map((it) => <ToastItem key={it.id} item={it} onDismiss={onDismiss} onOpen={onOpen} />)}
      </AnimatePresence>
    </div>
  );
}
