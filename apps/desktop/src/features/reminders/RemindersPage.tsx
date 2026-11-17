import { useState } from "react";
import { Bell, BellOff, Pencil, Pill, Plus, Send, Trash2, CalendarClock, PenLine } from "lucide-react";
import { cn } from "@mt/ui";
import type { Reminder, ReminderKind } from "@mt/domain";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { Select, SettingRow } from "../../components/ui/controls";
import { Dialog, DialogContent } from "../../components/ui/Dialog";
import { EmptyState, StorageBanner, toast } from "../../components/common/feedback";
import { Chip } from "../../components/common/Chip";
import { newId, useRecords } from "../../stores/records";
import { useAppearance } from "../../stores/appearance";
import { notificationText } from "./logic";
import { sendTestNotification } from "./scheduler";

const KIND_META: Record<ReminderKind, { label: string; icon: typeof Bell; defaults: Partial<Reminder> }> = {
  period: { label: "Period reminder", icon: CalendarClock, defaults: { label: "Period expected soon", time: "09:00", leadDays: 2 } },
  checkin: { label: "Daily check-in", icon: PenLine, defaults: { label: "Daily check-in", time: "20:00" } },
  medication: { label: "Medication", icon: Pill, defaults: { label: "Take medication", time: "08:00" } },
  custom: { label: "Custom", icon: Bell, defaults: { label: "Reminder", time: "12:00" } },
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function summary(r: Reminder): string {
  if (r.kind === "period") return `${r.leadDays === 0 ? "On the estimated day" : `${r.leadDays} day${r.leadDays === 1 ? "" : "s"} before the estimate`} at ${r.time}`;
  return `${r.days.length === 0 || r.days.length === 7 ? "Every day" : r.days.map((d) => DAY_NAMES[d]).join(", ")} at ${r.time}`;
}

function Editor({ initial, onClose }: { initial: Reminder; onClose: () => void }) {
  const [r, setR] = useState(initial);
  const valid = r.label.trim().length > 0 && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time);
  const toggleDay = (d: number) => setR((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((n) => n !== d) : [...x.days, d].sort() }));
  return (
    <div className="space-y-4">
      <label className="t-small block text-muted">Name (only shown inside the app)
        <input value={r.label} maxLength={60} onChange={(e) => setR({ ...r, label: e.target.value })} className="t-body mt-1 h-10 w-full rounded-control border border-line bg-surface px-3 text-ink outline-none focus-visible:border-accent" />
      </label>
      <label className="t-small block text-muted">Time
        <input type="time" value={r.time} onChange={(e) => setR({ ...r, time: e.target.value })} className="t-body mt-1 h-10 w-full rounded-control border border-line bg-surface px-3 text-ink" />
      </label>
      {r.kind === "period" ? (
        <label className="t-small block text-muted">Remind me
          <Select className="mt-1 w-full" value={r.leadDays} onChange={(e) => setR({ ...r, leadDays: Number(e.target.value) })}>
            {[0, 1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n === 0 ? "On the estimated day" : `${n} day${n === 1 ? "" : "s"} before`}</option>)}
          </Select>
        </label>
      ) : (
        <fieldset>
          <legend className="t-small mb-2 text-muted">Repeat on (none selected = every day)</legend>
          <div className="flex flex-wrap gap-1.5">{DAY_NAMES.map((n, i) => <Chip key={n} selected={r.days.includes(i)} onClick={() => toggleDay(i)}>{n}</Chip>)}</div>
        </fieldset>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => { useRecords.getState().upsertReminder({ ...r, label: r.label.trim() }); toast.success("Reminder saved."); onClose(); }}>Save reminder</Button>
      </div>
    </div>
  );
}

export function RemindersPage() {
  const reminders = useRecords((s) => s.data.reminders);
  const ready = useRecords((s) => s.loadStatus === "ready");
  const { upsertReminder, deleteReminder } = useRecords.getState();
  const neutral = useAppearance((s) => s.neutralNotifications);
  const quiet = useAppearance((s) => s.quietHours);
  const set = useAppearance((s) => s.set);
  const patch = useAppearance((s) => s.patch);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [testing, setTesting] = useState(false);

  const add = (kind: ReminderKind) => setEditing({ id: newId(), kind, label: "", time: "09:00", days: [], leadDays: 0, enabled: true, ...KIND_META[kind].defaults } as Reminder);
  const preview = notificationText({ id: "p", kind: "custom", label: "Take medication", time: "08:00", days: [], leadDays: 0, enabled: true }, neutral);

  const test = async () => {
    setTesting(true);
    try {
      const ok = await sendTestNotification("reminder");
      if (ok) toast.success("Preview popup shown.");
      else toast.error("The popup could not be shown.");
    } catch {
      toast.error("The notification could not be sent.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Reminders" description="Gentle nudges that work while the app is open or running in the tray. Wording is discreet by default." />
      <StorageBanner />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(KIND_META) as ReminderKind[]).map((k) => {
              const Icon = KIND_META[k].icon;
              return <Button key={k} size="sm" variant="soft" disabled={!ready} onClick={() => add(k)}><Plus className="size-4" /><Icon className="size-4" />{KIND_META[k].label}</Button>;
            })}
          </div>
          {reminders.length === 0 ? (
            <EmptyState icon={<BellOff className="size-5" />} title="No reminders yet">Add a daily check-in, a period reminder or a medication reminder. You can turn each one on or off at any time.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {[...reminders].sort((a, b) => (a.time < b.time ? -1 : 1)).map((r) => {
                const Icon = KIND_META[r.kind].icon;
                return (
                  <li key={r.id}>
                    <Card className={cn("flex items-center gap-4 p-4", !r.enabled && "opacity-60")}>
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent" aria-hidden><Icon className="size-[18px]" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="t-body truncate font-medium text-ink">{r.label}</div>
                        <div className="t-small text-muted">{KIND_META[r.kind].label} · {summary(r)}</div>
                      </div>
                      <Switch checked={r.enabled} onCheckedChange={(v) => upsertReminder({ ...r, enabled: v })} aria-label={`${r.label} enabled`} />
                      <Button size="sm" variant="ghost" aria-label={`Edit ${r.label}`} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete ${r.label}`} onClick={() => { deleteReminder(r.id); toast.info("Reminder removed."); }}><Trash2 className="size-4" /></Button>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Card>
          <CardTitle>Notifications</CardTitle>
          <SettingRow title="Discreet wording" description="Notifications say only “You have a reminder” so nothing sensitive shows on a lock screen.">
            <Switch checked={neutral} onCheckedChange={(v) => set("neutralNotifications", v)} aria-label="Discreet notification wording" />
          </SettingRow>
          <div className="t-small rounded-xl bg-surface-alt p-3 text-muted" aria-label="Notification preview">
            <div className="t-label mb-1">Preview</div>
            <div className="t-body font-medium text-ink">{preview.title}</div>
            <div>{preview.body}</div>
          </div>
          <SettingRow title="Quiet hours" description="Reminders that fall inside this window are skipped, not delayed.">
            <Switch checked={quiet.enabled} onCheckedChange={(v) => patch("quietHours", { enabled: v })} aria-label="Quiet hours" />
          </SettingRow>
          {quiet.enabled && (
            <div className="flex items-center gap-2 pb-3">
              <input type="time" aria-label="Quiet hours start" value={quiet.from} onChange={(e) => e.target.value && patch("quietHours", { from: e.target.value })} className="t-body h-9 rounded-control border border-line bg-surface px-2 text-ink" />
              <span className="t-small text-muted">to</span>
              <input type="time" aria-label="Quiet hours end" value={quiet.to} onChange={(e) => e.target.value && patch("quietHours", { to: e.target.value })} className="t-body h-9 rounded-control border border-line bg-surface px-2 text-ink" />
            </div>
          )}
          <p className="t-small leading-relaxed text-muted">Windows asks for permission the first time a notification is sent. Times follow this computer's clock, so time-zone and daylight-saving changes are handled automatically.</p>
          <Button className="mt-3 w-full" variant="soft" onClick={() => void test()} disabled={testing}><Send className="size-4" />{testing ? "Sending…" : "Send a test notification"}</Button>
        </Card>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing && reminders.some((x) => x.id === editing.id) ? "Edit reminder" : "New reminder"}>
          {editing && <Editor initial={editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
