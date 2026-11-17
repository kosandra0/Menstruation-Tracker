import { useEffect, useRef, useState, type ReactNode } from "react";
import { APP_NAME, APP_VERSION } from "@mt/config";
import { useAppearance } from "../../stores/appearance";
import { useRecords } from "../../stores/records";
import { logoSrc } from "../../lib/logos";
import { shell } from "../../services/shell";
import { NATIVE_EVENTS } from "@mt/config";

type Phase = "starting" | "running" | "exiting";

const MIN_SPLASH_MS = 1500;
const MIN_SPLASH_REDUCED_MS = 500;
const EXIT_ANIMATION_MS = 1300;
const EXIT_ANIMATION_REDUCED_MS = 400;
/** Never wait longer than this for the vault to flush on exit (native side also has a 4 s watchdog). */
const FLUSH_TIMEOUT_MS = 2500;

function prefersReduced(motion: "system" | "reduced" | "full"): boolean {
  if (motion === "reduced") return true;
  if (motion === "full") return false;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Full-window screen showing the user's chosen logo in their chosen theme. */
function LifecycleScreen({ phase, reduced, leaving = false }: { phase: "starting" | "exiting"; reduced: boolean; leaving?: boolean }) {
  const logoId = useAppearance((s) => s.logoId);
  const exiting = phase === "exiting";
  const barSeconds = (exiting ? (reduced ? EXIT_ANIMATION_REDUCED_MS : EXIT_ANIMATION_MS) : reduced ? MIN_SPLASH_REDUCED_MS : MIN_SPLASH_MS) / 1000;
  return (
    <div
      role="status" aria-live="polite" aria-label={exiting ? "Closing Menstruation Tracker" : "Starting Menstruation Tracker"}
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-canvas"
      style={{
        backgroundImage: "radial-gradient(60% 55% at 50% 42%, color-mix(in oklab, var(--c-accent) 14%, transparent), transparent 70%)",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.45s ease",
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center gap-7">
        <div className="relative grid size-40 place-items-center">
          {!reduced && (
            <>
              <span aria-hidden className="life-ring absolute inset-4 rounded-full border border-accent/50" />
              <span aria-hidden className="life-ring absolute inset-4 rounded-full border border-accent/30" style={{ animationDelay: "0.7s" }} />
            </>
          )}
          <img
            src={logoSrc(logoId)} alt="" draggable={false} width={112} height={112}
            className={`relative size-28 rounded-[24%] shadow-lift ${exiting ? "life-logo-out" : "life-logo-in"}`}
          />
        </div>
        <div className="life-text-in text-center">
          <div className="font-display text-[1.65rem] leading-tight text-ink">{APP_NAME}</div>
          <p className="t-small mt-1.5 text-muted">{exiting ? "Saving your latest changes and closing…" : "Preparing your private space…"}</p>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
          <div className="life-bar h-full rounded-full bg-accent-gradient" style={{ ["--life-bar-duration" as string]: `${barSeconds}s` }} />
        </div>
      </div>
      <span className="t-small absolute bottom-6 text-muted">v{APP_VERSION}</span>
    </div>
  );
}

/**
 * Orchestrates the startup screen and the exit sequence.
 * - Startup: shown until the record vault has loaded (or failed - the error is surfaced in-app) and a minimum
 *   display time has passed so the animation reads as intentional, not as a flash.
 * - Exit: triggered by the native `mt://exit` event (title-bar close, tray "Exit", second instance...). Plays the exit
 *   animation, flushes unsaved records, then asks the native side to terminate the process.
 */
export function Lifecycle({ children }: { children: ReactNode }) {
  const motion = useAppearance((s) => s.motion);
  const loadStatus = useRecords((s) => s.loadStatus);
  const [phase, setPhase] = useState<Phase>("starting");
  const [minElapsed, setMinElapsed] = useState(false);
  const [splash, setSplash] = useState<"on" | "leaving" | "off">("on");
  const exitStarted = useRef(false);
  const reduced = prefersReduced(motion);

  useEffect(() => {
    void useRecords.getState().load();
    const t = window.setTimeout(() => setMinElapsed(true), reduced ? MIN_SPLASH_REDUCED_MS : MIN_SPLASH_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "starting" && minElapsed && (loadStatus === "ready" || loadStatus === "error")) setPhase("running");
  }, [phase, minElapsed, loadStatus]);

  useEffect(() => {
    if (phase === "running" && splash === "on") setSplash("leaving");
  }, [phase, splash]);

  useEffect(() => {
    if (splash !== "leaving") return;
    const t = window.setTimeout(() => setSplash("off"), 480);
    return () => window.clearTimeout(t);
  }, [splash]);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    void shell.on(NATIVE_EVENTS.exit, () => {
      if (exitStarted.current) return;
      exitStarted.current = true;
      setPhase("exiting");
      const wait = new Promise<void>((r) => window.setTimeout(r, reduced ? EXIT_ANIMATION_REDUCED_MS : EXIT_ANIMATION_MS));
      const flush = Promise.race([
        useRecords.getState().flush().catch((e) => console.warn("[exit] flush failed", e?.code)),
        new Promise<void>((r) => window.setTimeout(r, FLUSH_TIMEOUT_MS)),
      ]);
      void Promise.all([wait, flush]).then(() => shell.quit());
    }).then((u) => (cancelled ? u() : (off = u)));
    return () => { cancelled = true; off?.(); };
  }, [reduced]);

  return (
    <>
      {children}
      {phase !== "exiting" && splash !== "off" && <LifecycleScreen phase="starting" reduced={reduced} leaving={splash === "leaving"} />}
      {phase === "exiting" && <LifecycleScreen phase="exiting" reduced={reduced} />}
    </>
  );
}
