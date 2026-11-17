import type { NotificationCategory } from "../../stores/notifications";

export interface NotificationText {
  title: string;
  body: string;
  /** In-app route opened when the notification is clicked. */
  route: string;
}

export interface TextOptions {
  /** Label of the user's own reminder (read from the encrypted records, never stored in the history). */
  reminderLabel?: string;
  /** Daily prompt: days since the latest entry. */
  daysSinceEntry?: number | null;
  name?: string;
}

/** Wording of every notification. Warm, short, and never claims certainty about a person's body. */
export function describeNotification(category: NotificationCategory, o: TextOptions = {}): NotificationText {
  const who = o.name ? `, ${o.name}` : "";
  switch (category) {
    case "reminder":
      return { title: o.reminderLabel?.trim() || "Reminder", body: "A reminder you set in your app.", route: "/reminders" };
    case "daily-log": {
      const gap = o.daysSinceEntry ?? null;
      if (gap !== null && gap >= 2) {
        return { title: `It has been ${gap} days since your last entry${who}`, body: "Even a quick note helps. You can also fill in missed days from the Daily Log.", route: "/log" };
      }
      return { title: `Time to log today${who}`, body: "A short note about how you feel keeps your patterns accurate. Every field is optional.", route: "/log" };
    }
    case "period-soon":
      return { title: "Your period may start soon", body: "This is an estimate from your recorded cycles and can be off by a few days.", route: "/" };
    case "period-late":
      return { title: "The estimated start date has passed", body: "If your period has started, record it so your history stays accurate. Estimates are only estimates.", route: "/calendar" };
    case "period-end":
      return { title: "Did your period end?", body: "Record the last day so your cycle history stays accurate.", route: "/calendar" };
    case "welcome":
      return { title: `Welcome back${who}`, body: "Nice to see you again. Your records are right where you left them.", route: "/" };
    default:
      return { title: "Menstruation Tracker", body: "A message from your app.", route: "/" };
  }
}

/** What a popup says when discreet wording is on: nothing about the content. */
export const DISCREET_TEXT: NotificationText = { title: "Reminder", body: "You have a reminder in your app.", route: "/" };

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  reminder: "Your reminders",
  "daily-log": "Daily log prompt",
  "period-soon": "Period expected soon",
  "period-late": "Estimated start has passed",
  "period-end": "Record the end of a period",
  welcome: "Welcome back",
  system: "App messages",
};

/** "3 min ago", "2 days ago". Relative to `now`; falls back to the date for old items. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 8) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
