import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { create } from "zustand";
import { Heart } from "lucide-react";
import { STORAGE_KEYS } from "@mt/config";
import { Button } from "../../components/ui/Button";
import { Dialog, DialogContent } from "../../components/ui/Dialog";
import { useAppearance } from "../../stores/appearance";
import { useNotifications } from "../../stores/notifications";
import { useRecords } from "../../stores/records";
import type { BackupCounts } from "../../lib/backup";
import { welcomeBack, WELCOME_AFTER_DAYS, wholeDaysBetween, type WelcomeInfo } from "./nudges";

export interface WelcomeState extends WelcomeInfo {
  /** `restored` after importing a backup, `away` after simply being gone for a while. */
  kind: "away" | "restored";
  counts?: BackupCounts;
}

export const useWelcome = create<{ info: WelcomeState | null; show: (i: WelcomeState) => void; close: () => void }>((set) => ({
  info: null,
  show: (info) => set({ info }),
  close: () => set({ info: null }),
}));

/** Last time the user interacted with the app, kept on this computer (it is also written into backups). */
export function readLastActive(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.lastOpen);
  } catch {
    return null;
  }
}
export function touchLastActive(now = new Date()): void {
  try {
    localStorage.setItem(STORAGE_KEYS.lastOpen, now.toISOString());
  } catch {
    /* storage unavailable: the welcome-back message simply will not appear */
  }
}

/** Builds the "restored from a backup" message from the time stamps inside the backup file. */
export function welcomeAfterRestore(file: { lastActiveAt: string | null; exportedAt: string | null }, logs: Record<string, { date: string }>, counts: BackupCounts, now = new Date()): WelcomeState {
  const from = file.lastActiveAt ?? file.exportedAt;
  const daysAway = from && Number.isFinite(Date.parse(from)) ? wholeDaysBetween(new Date(from), now) : 0;
  const last = Object.keys(logs).sort().pop();
  const daysSinceLog = last ? wholeDaysBetween(new Date(`${last}T12:00:00`), now) : null;
  return { kind: "restored", daysAway, daysSinceLog, counts };
}

/**
 * Tracks when the app was last used (cheaply: at most one write a minute, on real interaction) and, when the user returns
 * after being away for {@link WELCOME_AFTER_DAYS} days or more, opens the welcome-back message. Works for a fresh launch
 * and for a window that was waiting in the tray.
 */
export function useActivityTracker() {
  const ready = useRecords((s) => s.loadStatus === "ready");
  const enabled = useNotifications((s) => s.settings.welcomeBack);
  const checked = useRef(false);
  const lastWrite = useRef(0);

  useEffect(() => {
    if (!ready) return;
    const check = () => {
      if (!enabled) return;
      const info = welcomeBack(readLastActive(), useRecords.getState().data.logs, new Date());
      if (info) useWelcome.getState().show({ ...info, kind: "away" });
    };
    if (!checked.current) {
      checked.current = true;
      check();
      touchLastActive();
      lastWrite.current = Date.now();
    }
    const touch = () => {
      const t = Date.now();
      if (t - lastWrite.current > 60_000) { lastWrite.current = t; touchLastActive(); }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      check(); // before the interaction below overwrites the previous time
      if (!useWelcome.getState().info) touch();
    };
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("keydown", touch, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, enabled]);
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function WelcomeBackDialog() {
  const info = useWelcome((s) => s.info);
  const close = useWelcome((s) => s.close);
  const name = useAppearance((s) => s.userName);
  const navigate = useNavigate();
  const go = (path: string) => { close(); navigate(path); };
  const who = name ? `, ${name}` : "";

  return (
    <Dialog open={info !== null} onOpenChange={(o) => !o && close()}>
      {info && (
        <DialogContent
          title={`Welcome back${who}!`}
          description={info.kind === "restored"
            ? `Your records were restored.${info.daysAway >= 1 ? ` You came back after ${plural(info.daysAway, "day")}.` : ""}`
            : `You came back after ${plural(info.daysAway, "day")}. It is lovely to see you again.`}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl bg-accent-soft/60 p-3.5">
              <Heart className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div className="t-body leading-relaxed text-ink">
                {info.daysSinceLog === null
                  ? "You have not logged a day yet. A short note about today is a good place to begin."
                  : info.daysSinceLog === 0
                    ? "You already logged today. Nice and steady."
                    : `Your latest daily log was ${plural(info.daysSinceLog, "day")} ago. There is no pressure: fill in what you remember, and skip what you do not.`}
              </div>
            </div>
            {info.counts && (
              <p className="t-small text-muted">
                Restored {plural(info.counts.periods, "period")}, {plural(info.counts.logs, "daily log")}, {plural(info.counts.journal, "journal entry").replace("entrys", "entries")} and {plural(info.counts.reminders, "reminder")}.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={close}>Not now</Button>
              <Button variant="soft" onClick={() => go("/calendar")}>Check my calendar</Button>
              <Button onClick={() => go("/log")}>Log today</Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

export { WELCOME_AFTER_DAYS };
