import { useEffect } from "react";
import { estimateNextPeriodStart } from "@mt/domain";
import { useRecords } from "../../stores/records";
import { useAppearance } from "../../stores/appearance";
import { useNotifications } from "../../stores/notifications";
import { isNative } from "../../services/native";
import { dueNow, nextWake } from "./logic";
import { dueNudges, nextNudgeWake, type NudgeConfig } from "../notifications/nudges";
import { notify } from "../notifications/notify";

const FIRED_KEY = "mt.reminders.fired.v1";
const MAX_FIRED = 300;

function loadFired(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}
function saveFired(set: Set<string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-MAX_FIRED)));
  } catch {
    /* de-duplication is best effort */
  }
}

/** Shows a sample popup with the current (or given) look so the user can judge it. Never added to the history. */
export async function sendTestNotification(category: Parameters<typeof notify>[0]["category"] = "reminder"): Promise<boolean> {
  return notify({ category, preview: true, reminderLabel: "Take a short walk", daysSinceEntry: 3 });
}

/**
 * Fires due reminders and "remember to record" prompts while the app (or its tray instance) is running, as popups drawn
 * by the app itself. Exactly one timer is armed at a time and it is re-armed for the next scheduled moment, so there is
 * no polling loop; wake-ups are capped at 15 minutes so sleep, clock changes, time-zone changes and daylight-saving
 * shifts are all corrected on the next evaluation.
 */
export function useNotificationEngine() {
  const reminders = useRecords((s) => s.data.reminders);
  const periods = useRecords((s) => s.data.periods);
  const logs = useRecords((s) => s.data.logs);
  const ready = useRecords((s) => s.loadStatus === "ready");
  const quiet = useAppearance((s) => s.quietHours);
  const n = useNotifications((s) => s.settings);

  useEffect(() => {
    if (!isNative() || !ready || !n.enabled) return;
    let timer: number | undefined;
    let stopped = false;
    const config: NudgeConfig = {
      dailyLog: n.dailyLog, dailyLogTime: n.dailyLogTime, periodSoon: n.periodSoon, periodLeadDays: n.periodLeadDays,
      periodLate: n.periodLate, periodEnd: n.periodEnd, periodTime: n.periodTime,
    };
    const activeReminders = n.reminders ? reminders : [];

    const tick = async () => {
      if (stopped) return;
      const now = new Date();
      const nextPeriod = estimateNextPeriodStart(periods)?.value ?? null;
      const fired = loadFired();
      const dueR = dueNow({ now, reminders: activeReminders, nextPeriod, fired, quiet });
      const dueN = dueNudges({ now, config, logs, periods, nextPeriod, fired, quiet });
      for (const d of dueR) {
        fired.add(d.key); // suppressed (quiet hours) occurrences are consumed too: they are not repeated later
        if (!d.suppressed) await notify({ category: "reminder", ref: d.reminder.id, reminderLabel: d.reminder.label });
      }
      for (const d of dueN) {
        fired.add(d.key);
        if (!d.suppressed) await notify({ category: d.kind, daysSinceEntry: d.daysSinceLastEntry });
      }
      if (dueR.length || dueN.length) saveFired(fired);
      if (stopped) return;
      const wake = Math.min(
        nextWake({ now: new Date(), reminders: activeReminders, nextPeriod }),
        nextNudgeWake(new Date(), config) ?? Infinity,
      );
      timer = window.setTimeout(() => void tick(), Math.max(1000, wake + 250));
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reminders, periods, logs, ready, quiet, n]);
}

/** @deprecated kept for older imports; use {@link useNotificationEngine}. */
export const useReminderScheduler = useNotificationEngine;
