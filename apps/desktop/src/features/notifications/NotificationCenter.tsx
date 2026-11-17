import { useState } from "react";
import { useNavigate } from "react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bell, BellOff, CheckCheck, History, Settings as SettingsIcon, Trash2, X } from "lucide-react";
import { useNotifications, unreadCount, type NotificationItem } from "../../stores/notifications";
import { useAppearance } from "../../stores/appearance";
import { HistoryRow } from "./HistoryPage";

/** The bell in the title bar: opens the in-app notification panel. */
export function NotificationBell() {
  const history = useNotifications((s) => s.history);
  const enabled = useNotifications((s) => s.settings.enabled);
  const [open, setOpen] = useState(false);
  const unread = unreadCount(history);
  const Icon = enabled ? Bell : BellOff;
  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)}
        aria-label={unread ? `Notifications, ${unread} not opened` : "Notifications"} aria-haspopup="dialog"
        className="relative grid h-full w-10 place-items-center text-muted transition-colors hover:bg-surface-alt hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
      >
        <Icon className="size-[17px]" strokeWidth={1.8} aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-contrast">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      <NotificationPanel open={open} onOpenChange={setOpen} />
    </>
  );
}

function NotificationPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const history = useNotifications((s) => s.history);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const remove = useNotifications((s) => s.remove);
  const clear = useNotifications((s) => s.clear);
  const name = useAppearance((s) => s.userName);
  const items = [...history].reverse().slice(0, 30);
  const unread = unreadCount(history);

  const go = (item: NotificationItem, route: string) => {
    markRead(item.id);
    onOpenChange(false);
    navigate(route);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay fixed inset-0 z-40 bg-ink/20" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="dialog-content fixed right-3 top-12 z-50 flex max-h-[min(80vh,640px)] w-[min(94vw,400px)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-lift"
        >
          <div className="flex items-center gap-2 border-b border-line bg-chrome px-4 py-3">
            <DialogPrimitive.Title className="font-display flex-1 text-[1.05rem] text-ink">Notifications{unread ? ` (${unread} not opened)` : ""}</DialogPrimitive.Title>
            <button type="button" onClick={() => { onOpenChange(false); navigate("/settings#notifications"); }} aria-label="Notification settings" className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-ink"><SettingsIcon className="size-4" /></button>
            <DialogPrimitive.Close aria-label="Close notifications" className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-ink"><X className="size-4" /></DialogPrimitive.Close>
          </div>

          {items.length === 0 ? (
            <div className="grid place-items-center gap-2 px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Bell className="size-5" aria-hidden /></span>
              <p className="t-body font-medium text-ink">Nothing yet</p>
              <p className="t-small max-w-[26ch] text-muted">Reminders and gentle prompts are listed here as they appear, even after their popup has faded.</p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto" aria-label="Recent notifications">
              {items.map((it) => (
                <HistoryRow key={it.id} item={it} name={name} onOpen={go} onRemove={remove} />
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-chrome px-3 py-2">
            <button type="button" onClick={() => { onOpenChange(false); navigate("/notifications"); }} className="t-small inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-accent hover:bg-surface-alt"><History className="size-4" aria-hidden />Full history</button>
            <div className="flex items-center gap-1">
              <button type="button" onClick={markAllRead} disabled={unread === 0} className="t-small inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-ink hover:bg-surface-alt disabled:text-muted disabled:hover:bg-transparent"><CheckCheck className="size-4" aria-hidden />Mark all opened</button>
              <button type="button" onClick={clear} disabled={history.length === 0} className="t-small inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-ink hover:bg-surface-alt disabled:text-muted disabled:hover:bg-transparent"><Trash2 className="size-4" aria-hidden />Clear all</button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
