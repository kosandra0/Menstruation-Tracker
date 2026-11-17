import { useEffect, useMemo, useState } from "react";
import { cn } from "@mt/ui";
import type { ClockSettings } from "../../stores/appearance";
import { useAppearance } from "../../stores/appearance";

/* ---------------------------------------------------------------- region helpers */

/** Locale used for formatting: the app's language/region as reported by the system. */
export function systemLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || "en";
  } catch {
    return "en";
  }
}

/** The time zone Windows reports for this computer (IANA name), or UTC if it cannot be read. */
export function systemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Whether the region's own convention is a 12-hour clock. */
export function regionUses12Hour(locale = systemLocale()): boolean {
  try {
    const hc = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
    return hc === "h12" || hc === "h11";
  } catch {
    return false;
  }
}

export function resolveZone(s: Pick<ClockSettings, "timeZone">): string {
  return s.timeZone === "auto" ? systemTimeZone() : s.timeZone;
}

export interface ClockParts {
  hour24: number;
  minute: number;
  second: number;
  /** "07:42:09 PM" style text in the user's format (always includes seconds). */
  text: string;
  /** Same without seconds, for assistive technology. */
  textShort: string;
  date: string;
  zoneName: string;
}

/** Everything the widgets need for one instant, computed with Intl so regional conventions are respected. */
export function clockParts(now: Date, s: ClockSettings, locale = systemLocale()): ClockParts {
  const timeZone = resolveZone(s);
  const hour12 = s.hourCycle === "auto" ? undefined : s.hourCycle === "12";
  const base: Intl.DateTimeFormatOptions = { timeZone, ...(hour12 === undefined ? {} : { hour12 }) };
  let fmt: (o: Intl.DateTimeFormatOptions) => Intl.DateTimeFormat;
  try {
    fmt = (o) => new Intl.DateTimeFormat(locale, { ...base, ...o });
    fmt({ hour: "numeric" });
  } catch {
    fmt = (o) => new Intl.DateTimeFormat("en", { ...o, timeZone: "UTC", ...(hour12 === undefined ? {} : { hour12 }) });
  }
  // Hands always use a 24-hour reading of the chosen zone, independent of the display format.
  let p: Intl.DateTimeFormatPart[];
  try {
    p = new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now);
  } catch {
    p = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now);
  }
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return {
    hour24: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
    text: fmt({ hour: "numeric", minute: "2-digit", second: "2-digit" }).format(now),
    textShort: fmt({ hour: "numeric", minute: "2-digit" }).format(now),
    date: fmt({ weekday: "long", day: "numeric", month: "long" }).format(now),
    zoneName: fmt({ timeZoneName: "short" }).formatToParts(now).find((x) => x.type === "timeZoneName")?.value ?? timeZone,
  };
}

/** Current time that re-renders on the next whole `stepMs` boundary (one timer; paused while the window is hidden). */
function useNow(stepMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number | undefined;
    const arm = () => {
      const t = Date.now();
      timer = window.setTimeout(() => { setNow(new Date()); arm(); }, stepMs - (t % stepMs) + 5);
    };
    const onVis = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === "visible") { setNow(new Date()); arm(); }
    };
    document.addEventListener("visibilitychange", onVis);
    if (document.visibilityState === "visible") arm();
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [stepMs]);
  return now;
}

/* ---------------------------------------------------------------- analog face */

function AnalogFace({ parts, size, second }: { parts: ClockParts; size: number; second: boolean }) {
  const h = ((parts.hour24 % 12) + parts.minute / 60 + parts.second / 3600) * 30;
  const m = (parts.minute + parts.second / 60) * 6;
  const s = parts.second * 6;
  const small = size < 48;
  const ticks = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const hand = (deg: number, len: number, width: number, cls: string) => (
    <line x1="50" y1="50" x2="50" y2={50 - len} strokeWidth={width} strokeLinecap="round" className={cls} transform={`rotate(${deg} 50 50)`} />
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden focusable="false">
      <circle cx="50" cy="50" r="47" className="fill-surface stroke-line" strokeWidth="2" />
      {!small && ticks.map((i) => (
        <line key={i} x1="50" y1={i % 3 === 0 ? 8 : 10} x2="50" y2="14" strokeWidth={i % 3 === 0 ? 2.4 : 1.2} strokeLinecap="round" className="stroke-muted" transform={`rotate(${i * 30} 50 50)`} />
      ))}
      {small && [0, 3, 6, 9].map((i) => <line key={i} x1="50" y1="9" x2="50" y2="14" strokeWidth="3" strokeLinecap="round" className="stroke-muted" transform={`rotate(${i * 30} 50 50)`} />)}
      {hand(h, 24, small ? 5 : 4, "stroke-ink")}
      {hand(m, 35, small ? 3.5 : 2.6, "stroke-ink")}
      {second && !small && hand(s, 38, 1.2, "stroke-accent")}
      <circle cx="50" cy="50" r={small ? 4 : 3} className="fill-accent" />
    </svg>
  );
}

/* ---------------------------------------------------------------- widget */

export function ClockView({ settings, size = "md", className }: { settings: ClockSettings; size?: "sm" | "md" | "lg"; className?: string }) {
  const analog = settings.type === "analog";
  const needsSeconds = settings.type === "digital" || (analog && settings.secondHand && size !== "sm");
  const now = useNow(needsSeconds ? 1000 : 15_000);
  const parts = useMemo(() => clockParts(now, settings), [now, settings]);
  if (settings.type === "off") return null;

  if (analog) {
    const px = size === "sm" ? 26 : size === "lg" ? 150 : 76;
    return (
      <div role="img" aria-label={`Clock: ${parts.textShort}, ${parts.date}`} className={cn("inline-flex items-center gap-3", className)}>
        <AnalogFace parts={parts} size={px} second={settings.secondHand} />
        {size !== "sm" && (
          <div className="leading-tight">
            <div className="font-display text-[1.15rem] tabular-nums text-ink">{parts.textShort}</div>
            {settings.showDate && <div className="t-small text-muted">{parts.date}</div>}
            <div className="t-small text-muted">{parts.zoneName}</div>
          </div>
        )}
      </div>
    );
  }
  const [main, suffix] = splitSuffix(parts.text);
  if (size === "sm") {
    return <time role="img" aria-label={`Time: ${parts.textShort}`} dateTime={now.toISOString()} className={cn("t-small tabular-nums text-muted", className)}>{parts.text}</time>;
  }
  return (
    <div role="img" aria-label={`Clock: ${parts.textShort}, ${parts.date}`} className={cn("leading-tight", className)}>
      <div className={cn("font-display tabular-nums tracking-tight text-ink", size === "lg" ? "text-[2.6rem]" : "text-[1.7rem]")}>
        {main}{suffix && <span className="ml-1.5 align-baseline text-[0.5em] text-muted">{suffix}</span>}
      </div>
      {settings.showDate && <div className="t-small text-muted">{parts.date}</div>}
      <div className="t-small text-muted">{parts.zoneName}</div>
    </div>
  );
}

/** "07:42:09 PM" -> ["07:42:09", "PM"]; "19:42:09" -> ["19:42:09", ""]. Works for suffixes before or after the time. */
function splitSuffix(text: string): [string, string] {
  const m = text.match(/^(\D*?)(\d[\d:.\s]*\d)(\D*)$/u);
  if (!m) return [text, ""];
  return [m[2].trim(), `${m[1]}${m[3]}`.trim()];
}

/** Clock placed on the dashboard header or the title bar, depending on the user's choice. */
export function ClockSlot({ where, className }: { where: "dashboard" | "titlebar"; className?: string }) {
  const clock = useAppearance((s) => s.clock);
  if (clock.type === "off") return null;
  if (clock.placement !== "both" && clock.placement !== where) return null;
  return <ClockView settings={clock} size={where === "titlebar" ? "sm" : "md"} className={className} />;
}
