import type { NotificationItem } from "../../stores/notifications";

/** Calendar-day label for a history group: "Today", "Yesterday" or the full date. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Groups entries by calendar day, keeping their order (the caller passes newest first). */
export function groupByDay(items: readonly NotificationItem[], now: Date = new Date()): { key: string; label: string; items: NotificationItem[] }[] {
  const groups: { key: string; label: string; items: NotificationItem[] }[] = [];
  for (const it of items) {
    const key = new Date(it.at).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(it);
    else groups.push({ key, label: dayLabel(it.at, now), items: [it] });
  }
  return groups;
}
