import { useState } from "react";
import { useNavigate } from "react-router";
import { History, RotateCcw, Send, Trash2 } from "lucide-react";
import { cn } from "@mt/ui";
import { THEMES } from "@mt/design-tokens";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { Segmented, SettingRow, Select, Slider } from "../../components/ui/controls";
import { toast } from "../../components/common/feedback";
import { useAppearance } from "../../stores/appearance";
import {
  DEFAULT_LOOK, TOAST_CORNERS, useNotifications, type NotificationCategory, type ToastAnimation, type ToastCorner, type ToastSize, type ToastStyle,
} from "../../stores/notifications";
import { isNative } from "../../services/native";
import { NotificationCard } from "./ToastStack";
import { describeNotification, CATEGORY_LABELS } from "./templates";
import { notify } from "./notify";

const STYLE_OPTIONS: { value: ToastStyle; label: string }[] = [
  { value: "soft", label: "Soft card" }, { value: "accent", label: "Accent" }, { value: "tinted", label: "Tinted" }, { value: "minimal", label: "Minimal" }, { value: "compact", label: "Compact" },
];
const ANIMATION_OPTIONS: { value: ToastAnimation; label: string }[] = [
  { value: "slide", label: "Slide" }, { value: "fade", label: "Fade" }, { value: "pop", label: "Pop" }, { value: "none", label: "None" },
];
const CORNER_LABEL: Record<ToastCorner, string> = { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right" };

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time" aria-label={label} value={value} onChange={(e) => e.target.value && onChange(e.target.value)}
      className="t-body h-9 rounded-control border border-line bg-surface px-2 text-ink outline-none focus-visible:border-accent"
    />
  );
}

function NumberField({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="t-small inline-flex items-center gap-2 text-muted">
      {label}
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => Number.isFinite(e.target.valueAsNumber) && onChange(Math.min(max, Math.max(min, Math.round(e.target.valueAsNumber))))}
        className="t-body h-9 w-16 rounded-control border border-line bg-surface px-2 text-center tabular-nums text-ink outline-none focus-visible:border-accent"
      />
      {unit}
    </label>
  );
}

function Group({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mb-8 last:mb-0">
      <h3 className="font-display t-title mb-1 text-ink">{title}</h3>
      {note && <p className="t-small mb-2 max-w-xl text-muted">{note}</p>}
      {children}
    </section>
  );
}

export function NotificationsSection() {
  const navigate = useNavigate();
  const s = useNotifications((x) => x.settings);
  const set = useNotifications((x) => x.set);
  const reset = useNotifications((x) => x.reset);
  const historyCount = useNotifications((x) => x.history.length);
  const clear = useNotifications((x) => x.clear);
  const name = useAppearance((a) => a.userName);
  const neutral = useAppearance((a) => a.neutralNotifications);
  const quiet = useAppearance((a) => a.quietHours);
  const setApp = useAppearance((a) => a.set);
  const patchApp = useAppearance((a) => a.patch);
  const [previewCat, setPreviewCat] = useState<NotificationCategory>("daily-log");

  const preview = async (category: NotificationCategory) => {
    const ok = await notify({ category, preview: true, reminderLabel: "Take a short walk", daysSinceEntry: category === "daily-log" ? 3 : undefined });
    if (!ok) toast.error("The popup could not be shown.");
  };
  const sample = describeNotification(previewCat, { reminderLabel: "Take a short walk", daysSinceEntry: previewCat === "daily-log" ? 3 : undefined, name: name || undefined });
  const shownText = neutral ? { title: "Reminder", body: "You have a reminder in your app." } : sample;

  const row = (cat: NotificationCategory, title: string, description: string, on: boolean, toggle: (v: boolean) => void, extra?: React.ReactNode) => (
    <SettingRow title={title} description={description}>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {extra}
        <Button size="sm" variant="ghost" onClick={() => void preview(cat)} aria-label={`Preview: ${title}`}>Preview</Button>
        <Switch checked={on} onCheckedChange={toggle} disabled={!s.enabled} aria-label={title} />
      </div>
    </SettingRow>
  );

  return (
    <div>
      <Group title="Popups" note="Popups are drawn by this app, in your theme, and never use the Windows notification style. They appear in a corner of your main screen, even while the app is in the tray, and are also listed under the bell in the title bar.">
        <SettingRow title="Show notifications" description="The master switch. When off, no reminder or prompt is shown.">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="soft" onClick={() => void preview(previewCat)}><Send className="size-4" />Show a preview popup</Button>
            <Switch checked={s.enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label="Show notifications" />
          </div>
        </SettingRow>
        {!isNative() && <p className="t-small text-muted">In a browser preview the popup appears inside the page instead of in the corner of your screen.</p>}
      </Group>

      <Group title="What to be reminded about" note="Each one is optional. Prompts never show your notes, and anything about timing is an estimate.">
        {row("reminder", "Your reminders", "Reminders you create on the Reminders screen.", s.reminders, (v) => set({ reminders: v }))}
        {row("daily-log", "Daily log prompt", "A nudge at this time if you have not logged today. After a few quiet days it says how long it has been.", s.dailyLog, (v) => set({ dailyLog: v }),
          <>
            <TimeField label="Daily log prompt time" value={s.dailyLogTime} onChange={(v) => set({ dailyLogTime: v })} />
            <NumberField label="after" value={s.inactivityDays} min={2} max={14} unit="quiet days" onChange={(v) => set({ inactivityDays: v })} />
          </>)}
        {row("period-soon", "Period expected soon", "Shown a few days before the estimated start. Estimates can be off.", s.periodSoon, (v) => set({ periodSoon: v }),
          <NumberField label="" value={s.periodLeadDays} min={0} max={7} unit="days before" onChange={(v) => set({ periodLeadDays: v })} />)}
        {row("period-late", "Estimated start has passed", "A gentle reminder to record it if it has started.", s.periodLate, (v) => set({ periodLate: v }))}
        {row("period-end", "Record the end of a period", "If a period has no end date after about a week.", s.periodEnd, (v) => set({ periodEnd: v }))}
        <SettingRow title="Time for period prompts" description="Used by the three period prompts above.">
          <TimeField label="Period prompts time" value={s.periodTime} onChange={(v) => set({ periodTime: v })} />
        </SettingRow>
        {row("welcome", "Welcome back message", "A friendly message when you return after a few days away.", s.welcomeBack, (v) => set({ welcomeBack: v }))}
      </Group>

      <Group title="How popups look">
        <div className="mb-4 rounded-2xl border border-dashed border-line bg-canvas p-4" aria-label="Notification preview">
          <div className="t-small mb-2 flex flex-wrap items-center gap-2 text-muted">
            Preview of
            <Select aria-label="Preview wording" value={previewCat} onChange={(e) => setPreviewCat(e.target.value as NotificationCategory)} className="h-8 text-[0.8rem]">
              {(["daily-log", "reminder", "period-soon", "period-late", "period-end", "welcome"] as NotificationCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </Select>
          </div>
          <div className={cn("flex", s.corner.endsWith("left") ? "justify-start" : "justify-end")}>
            <NotificationCard look={s} category={previewCat} title={shownText.title} body={shownText.body} onClose={() => {}} />
          </div>
        </div>

        <SettingRow title="Style" stacked><Segmented<ToastStyle> label="Popup style" className="flex-wrap" value={s.style} options={STYLE_OPTIONS} onChange={(v) => set({ style: v })} /></SettingRow>
        <SettingRow title="Size"><Segmented<ToastSize> label="Popup size" value={s.size} options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "large", label: "Large" }]} onChange={(v) => set({ size: v })} /></SettingRow>
        <SettingRow title="Position" description="The corner of your main screen where popups appear.">
          <div role="radiogroup" aria-label="Popup position" className="grid grid-cols-2 gap-1.5">
            {TOAST_CORNERS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={s.corner === c} aria-label={CORNER_LABEL[c]} onClick={() => set({ corner: c })}
                className={cn("relative h-9 w-14 rounded-md border transition-colors", s.corner === c ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50")}>
                <span aria-hidden className={cn("absolute size-2.5 rounded-sm bg-accent", c.startsWith("top") ? "top-1" : "bottom-1", c.endsWith("left") ? "left-1" : "right-1")} />
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow title="Theme" description="Use the app's theme, or give notifications their own look.">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select aria-label="Popup theme" value={s.themeId} onChange={(e) => set({ themeId: e.target.value })}>
              <option value="app">Same as the app</option>
              {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Segmented label="Popup light or dark" value={s.mode} options={[{ value: "app", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} onChange={(v) => set({ mode: v })} />
          </div>
        </SettingRow>
        <div className="space-y-3 py-3">
          <Slider label="Corner radius" value={s.radius} min={0} max={24} onChange={(v) => set({ radius: v })} format={(v) => `${v}px`} />
          <Slider label="Visible for" value={s.durationSec} min={3} max={30} onChange={(v) => set({ durationSec: v })} format={(v) => `${v}s`} className={s.sticky ? "opacity-50" : undefined} />
          <Slider label="Shown at once" value={s.maxVisible} min={1} max={4} onChange={(v) => set({ maxVisible: v })} />
        </div>
        <SettingRow title="Stay until dismissed" description="Popups remain on screen until you close or click them."><Switch checked={s.sticky} onCheckedChange={(v) => set({ sticky: v })} aria-label="Stay until dismissed" /></SettingRow>
        <SettingRow title="Entrance animation"><Segmented<ToastAnimation> label="Popup animation" value={s.animation} options={ANIMATION_OPTIONS} onChange={(v) => set({ animation: v })} /></SettingRow>
        <SettingRow title="Show app logo"><Switch checked={s.showLogo} onCheckedChange={(v) => set({ showLogo: v })} aria-label="Show app logo on popups" /></SettingRow>
        <SettingRow title="Show countdown bar" description="A thin bar that shows how long the popup stays."><Switch checked={s.showProgress} onCheckedChange={(v) => set({ showProgress: v })} aria-label="Show countdown bar" /></SettingRow>
        <div className="mt-3"><Button size="sm" variant="soft" onClick={() => set({ ...DEFAULT_LOOK })}><RotateCcw className="size-4" />Reset popup look</Button></div>
      </Group>

      <Group title="Privacy and quiet time">
        <SettingRow title="Discreet wording" description="Popups say only “You have a reminder in your app.” so nothing sensitive appears on screen when someone is nearby.">
          <Switch checked={neutral} onCheckedChange={(v) => setApp("neutralNotifications", v)} aria-label="Discreet wording" />
        </SettingRow>
        <SettingRow title="Quiet hours" description="Reminders that fall inside quiet hours are skipped, not delayed.">
          <Switch checked={quiet.enabled} onCheckedChange={(v) => patchApp("quietHours", { enabled: v })} aria-label="Quiet hours" />
        </SettingRow>
        {quiet.enabled && (
          <div className="flex items-center gap-2 py-3">
            <TimeField label="Quiet hours start" value={quiet.from} onChange={(v) => patchApp("quietHours", { from: v })} />
            <span className="t-small text-muted">to</span>
            <TimeField label="Quiet hours end" value={quiet.to} onChange={(v) => patchApp("quietHours", { to: v })} />
          </div>
        )}
        <p className="t-small py-2 text-muted">Because these popups are not Windows notifications, Windows “Focus assist” does not silence them. Use quiet hours or the master switch instead.</p>
        <SettingRow title="Notification history" description={`${historyCount} item${historyCount === 1 ? "" : "s"} recorded. Anything you did not open stays marked there. It stores only the kind of notification and when it appeared, never your notes.`}>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="soft" onClick={() => navigate("/notifications")}><History className="size-4" />Open history</Button>
            <Button size="sm" variant="soft" disabled={historyCount === 0} onClick={() => { clear(); toast.info("Notification history cleared."); }}><Trash2 className="size-4" />Clear history</Button>
          </div>
        </SettingRow>
        <div className="mt-3"><Button size="sm" variant="soft" onClick={() => { reset(); toast.info("Notification settings were reset."); }}><RotateCcw className="size-4" />Reset all notification settings</Button></div>
      </Group>
    </div>
  );
}
