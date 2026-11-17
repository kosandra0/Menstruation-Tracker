import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { cn } from "@mt/ui";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState, toast } from "../../components/common/feedback";
import { Button } from "../../components/ui/Button";
import { Segmented } from "../../components/ui/controls";
import { useNotifications, unreadCount, type NotificationItem } from "../../stores/notifications";
import { useAppearance } from "../../stores/appearance";
import { useRecords } from "../../stores/records";
import { CATEGORY_ICON } from "./ToastStack";
import { describeNotification, timeAgo } from "./templates";
import { groupByDay } from "./historyGroups";

/** One history entry: its kind, wording, time, and whether it has been opened yet. Shared with the bell panel. */
export function HistoryRow({ item, name, onOpen, onRemove }: { item: NotificationItem; name: string; onOpen: (item: NotificationItem, route: string) => void; onRemove: (id: string) => void }) {
  const reminders = useRecords((s) => s.data.reminders);
  const label = item.ref ? reminders.find((r) => r.id === item.ref)?.label : undefined;
  const t = describeNotification(item.category, { reminderLabel: label, name: name || undefined });
  const Icon = CATEGORY_ICON[item.category];
  const when = new Date(item.at);
  return (
    <li className="group flex items-start gap-3 px-4 py-3">
      <span aria-hidden className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl", item.read ? "bg-surface-alt text-muted" : "bg-accent-soft text-accent")}><Icon className="size-4" /></span>
      <button type="button" onClick={() => onOpen(item, t.route)} className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
        <span className={cn("t-body block leading-snug", item.read ? "text-ink" : "font-medium text-ink")}>{t.title}</span>
        <span className="t-small mt-0.5 block text-muted">{t.body}</span>
        <span className="t-small mt-1 block text-muted">
          {Number.isNaN(when.getTime()) ? "" : when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {timeAgo(item.at)}
          {!item.read && <span className="ml-2 inline-flex items-center gap-1 text-accent"><span className="size-1.5 rounded-full bg-accent" aria-hidden />Not opened</span>}
        </span>
      </button>
      <button type="button" onClick={() => onRemove(item.id)} aria-label="Remove this notification from history" className="rounded-md p-1 text-muted opacity-0 transition-opacity hover:bg-surface-alt hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"><X className="size-3.5" /></button>
    </li>
  );
}

/**
 * Full notification history: every reminder and prompt the app showed, newest first, grouped by day. Entries that were
 * never opened stay marked, so a popup that faded away while the user was busy can still be found here.
 */
export function NotificationHistoryPage() {
  const navigate = useNavigate();
  const history = useNotifications((s) => s.history);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const remove = useNotifications((s) => s.remove);
  const clear = useNotifications((s) => s.clear);
  const name = useAppearance((s) => s.userName);
  const [filter, setFilter] = useState<"all" | "unopened">("all");
  const unopened = unreadCount(history);
  const groups = useMemo(
    () => groupByDay([...history].reverse().filter((h) => filter === "all" || !h.read)),
    [history, filter],
  );

  const open = (item: NotificationItem, route: string) => {
    markRead(item.id);
    navigate(route);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notification history"
        description="Every reminder and prompt the app showed you, newest first. Anything you have not opened stays marked, so nothing you missed is lost. It stores only the kind of notification and when it appeared, never your notes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="soft" disabled={unopened === 0} onClick={() => { markAllRead(); toast.info("Everything marked as opened."); }}><CheckCheck className="size-4" />Mark all opened</Button>
            <Button size="sm" variant="soft" disabled={history.length === 0} onClick={() => { clear(); toast.info("Notification history cleared."); }}><Trash2 className="size-4" />Clear history</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All (${history.length})` },
            { value: "unopened", label: `Not opened (${unopened})` },
          ]}
        />
      </div>

      {history.length === 0 ? (
        <EmptyState icon={<Bell className="size-5" aria-hidden />} title="No notifications yet">
          Reminders and prompts will be listed here as they appear, even after their popup has faded away.
        </EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState icon={<CheckCheck className="size-5" aria-hidden />} title="Nothing waiting">
          You have opened everything the app showed you.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <h2 className="t-label mb-2 px-1 text-muted">{g.label}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface" aria-label={`Notifications, ${g.label}`}>
                {g.items.map((it) => (
                  <HistoryRow key={it.id} item={it} name={name} onOpen={open} onRemove={remove} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
