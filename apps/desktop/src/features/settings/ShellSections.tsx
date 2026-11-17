import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@mt/ui";
import { LOGO_IDS } from "@mt/config";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { Segmented, SettingRow, Slider } from "../../components/ui/controls";
import { cleanName, DEFAULT_CORNER_RADIUS } from "../../stores/appearance";
import { MoodBar } from "../../components/common/MoodBar";
import { toast } from "../../components/common/feedback";
import { WindowControlsPreview } from "../../components/layout/TitleBar";
import { useAppearance, type ControlShape, type MoodStyle, type TitleStyle } from "../../stores/appearance";
import { LOGOS } from "../../lib/logos";
import { startup } from "../../services/shell";
import { isNative } from "../../services/native";

/* ---------------------------------------------------------------- Animation */

export function AnimationSection() {
  const motion = useAppearance((s) => s.motion);
  const intensity = useAppearance((s) => s.motionIntensity);
  const set = useAppearance((s) => s.set);
  const reset = useAppearance((s) => s.resetGroup);
  return (
    <div>
      <SettingRow title="Motion" description="“System default” follows the Windows setting for reducing animations. Reduced motion removes all movement, including the start-up and exit screens' pulses.">
        <Segmented label="Motion" value={motion} options={[{ value: "system", label: "System default" }, { value: "reduced", label: "Reduced" }, { value: "full", label: "Full" }]} onChange={(v) => set("motion", v)} />
      </SettingRow>
      <SettingRow title="Intensity" description="Gentle halves how far things travel when screens and cards appear.">
        <Segmented label="Animation intensity" value={intensity} options={[{ value: "gentle", label: "Gentle" }, { value: "standard", label: "Standard" }]} onChange={(v) => set("motionIntensity", v)} />
      </SettingRow>
      <p className="t-small py-3 text-muted">There are no endless background animations: everything moves once and then rests, which keeps the app light on battery and processor.</p>
      <Button size="sm" variant="soft" onClick={() => reset("motion")}><RotateCcw className="size-4" />Reset animation</Button>
    </div>
  );
}

/* ---------------------------------------------------------------- Window */

function StartupSwitch() {
  const [state, setState] = useState<"loading" | "on" | "off" | "unavailable" | "error">("loading");
  useEffect(() => {
    let live = true;
    if (!startup.available()) { setState("unavailable"); return; }
    startup.isEnabled().then((on) => live && setState(on ? "on" : "off")).catch(() => live && setState("error"));
    return () => { live = false; };
  }, []);
  const toggle = async (on: boolean) => {
    try {
      const actual = await startup.setEnabled(on);
      setState(actual ? "on" : "off");
      toast.success(actual ? "The app will start with Windows." : "The app will no longer start with Windows.");
    } catch {
      setState("error");
      toast.error("Windows did not allow this change. Try again, or check Settings > Apps > Startup.");
    }
  };
  return (
    <SettingRow title="Start with Windows" description="Adds this app to your Windows sign-in startup list (current user only, no administrator rights). Turning it off removes the entry. Nothing is registered unless you switch this on.">
      <div className="flex items-center gap-3">
        {state === "unavailable" && <span className="t-small text-muted">Available in the Windows app</span>}
        {state === "error" && <span role="alert" className="t-small text-danger">Could not read the startup setting</span>}
        <Switch checked={state === "on"} disabled={state === "loading" || state === "unavailable"} onCheckedChange={(v) => void toggle(v)} aria-label="Start with Windows" />
      </div>
    </SettingRow>
  );
}

export function WindowSection() {
  const w = useAppearance((s) => s.window);
  const patch = useAppearance((s) => s.patch);
  const reset = useAppearance((s) => s.resetGroup);
  return (
    <div>
      <h3 className="font-display t-title mb-3 text-ink">Title bar</h3>
      <WindowControlsPreview w={w} />
      <div className="mt-2">
        <SettingRow title="Style" description="Pick the look that suits your mood. They all do the same three things: minimise, maximise and close." stacked>
          <Segmented<TitleStyle> label="Title bar style" className="flex-wrap" value={w.titleStyle} options={TITLE_OPTIONS} onChange={(v) => patch("window", { titleStyle: v, ...(v === "traffic" && w.controlsSide === "right" && w.titleStyle === "windows" ? { controlsSide: "left" as const } : {}) })} />
        </SettingRow>
        <SettingRow title="Position"><Segmented label="Button position" value={w.controlsSide} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} onChange={(v) => patch("window", { controlsSide: v })} /></SettingRow>
        <SettingRow title="Shape"><Segmented<ControlShape> label="Button shape" value={w.shape} options={[{ value: "square", label: "Square" }, { value: "round", label: "Rounded" }, { value: "pill", label: "Pill" }]} onChange={(v) => patch("window", { shape: v })} /></SettingRow>
        <div className="space-y-3 py-3">
          <Slider label="Button size" value={w.buttonSize} min={24} max={48} onChange={(v) => patch("window", { buttonSize: v })} format={(v) => `${v}px`} />
          <Slider label="Spacing" value={w.spacing} min={0} max={12} onChange={(v) => patch("window", { spacing: v })} format={(v) => `${v}px`} />
        </div>
        <SettingRow title="Coloured buttons" description="Off gives a calm monochrome look."><Switch checked={w.colored} onCheckedChange={(v) => patch("window", { colored: v })} aria-label="Coloured window buttons" /></SettingRow>
      </div>

      <h3 className="font-display t-title mb-1 mt-7 text-ink">Closing and the tray</h3>
      <SettingRow title="Close button keeps the app in the tray" description="When on, closing the window hides it and the app keeps running (for reminders). When off, closing exits the app. Either way “Exit Application” in the tray menu always quits completely.">
        <Switch checked={w.closeToTray} onCheckedChange={(v) => patch("window", { closeToTray: v })} aria-label="Close to tray" />
      </SettingRow>
      <SettingRow title="Minimise to the tray" description="Minimising hides the window to the tray instead of the taskbar.">
        <Switch checked={w.minimizeToTray} onCheckedChange={(v) => patch("window", { minimizeToTray: v })} aria-label="Minimise to tray" />
      </SettingRow>
      <StartupSwitch />
      {!isNative() && <p className="t-small text-muted">Tray and startup options take effect in the Windows app, not in a browser preview.</p>}
      <div className="mt-3"><Button size="sm" variant="soft" onClick={() => reset("window")}><RotateCcw className="size-4" />Reset window options</Button></div>
    </div>
  );
}

/* ---------------------------------------------------------------- Personalization */

const TITLE_OPTIONS: { value: TitleStyle; label: string }[] = [
  { value: "windows", label: "Windows" }, { value: "traffic", label: "Traffic lights" }, { value: "capsule", label: "Capsule" },
  { value: "ring", label: "Rings" }, { value: "dots", label: "Dots" }, { value: "text", label: "Text" },
];

const MOOD_STYLES: { value: MoodStyle; label: string }[] = [
  { value: "soft", label: "Soft rounded" }, { value: "line", label: "Minimal line" }, { value: "gradient", label: "Gradient" }, { value: "compact", label: "Compact" }, { value: "pill", label: "Pill" },
];

export function PersonalizationSection() {
  const logoId = useAppearance((s) => s.logoId);
  const userName = useAppearance((s) => s.userName);
  const cornerRadius = useAppearance((s) => s.cornerRadius);
  const windowRadius = useAppearance((s) => s.windowRadius);
  const m = useAppearance((s) => s.moodBars);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const set = useAppearance((s) => s.set);
  const patch = useAppearance((s) => s.patch);
  const reset = useAppearance((s) => s.resetGroup);
  return (
    <div>
      <h3 className="font-display t-title mb-1 text-ink">Your name</h3>
      <p className="t-small mb-3 max-w-xl text-muted">Optional. The app greets you with it on the dashboard and in welcome-back messages. It is stored only on this computer.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text" aria-label="Your name" maxLength={40} placeholder="What should we call you?" autoComplete="off"
          value={nameDraft ?? userName}
          onChange={(e) => { setNameDraft(e.target.value); set("userName", cleanName(e.target.value)); }}
          onBlur={() => setNameDraft(null)}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="t-body h-10 w-72 max-w-full rounded-control border border-line bg-surface px-3 text-ink outline-none focus-visible:border-accent"
        />
        {userName && <Button size="sm" variant="ghost" onClick={() => { set("userName", ""); setNameDraft(null); }}>Remove name</Button>}
      </div>

      <h3 className="font-display t-title mb-1 mt-8 text-ink">App logo</h3>
      <p className="t-small mb-3 text-muted">Used on the start-up and exit screens, the sidebar, the title bar, the taskbar icon, the tray icon and notifications.</p>
      <div role="radiogroup" aria-label="App logo" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {LOGOS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={logoId === l.id} onClick={() => set("logoId", l.id)}
            className={cn("flex h-full flex-col items-center rounded-2xl border p-3 text-center transition-all duration-200", logoId === l.id ? "border-accent bg-accent-soft/50 shadow-soft" : "border-line bg-surface hover:border-accent/40")}>
            <img src={l.src} alt="" width={64} height={64} draggable={false} className="mx-auto size-16 rounded-[22%] shadow-soft" />
            <div className="t-body mt-2.5 flex items-center justify-center gap-1.5 font-medium text-ink">{l.name}{logoId === l.id && <Check className="size-4 text-accent" aria-hidden />}</div>
            <div className="t-small min-h-[2.6em] text-muted">{l.description}</div>
          </button>
        ))}
      </div>
      <p className="t-small mt-3 text-muted">{LOGO_IDS.length} logos available. The taskbar and tray icons update right away; the icon of the .exe file in File Explorer is fixed when the app is built and stays Bloom Petal.</p>

      <h3 className="font-display t-title mb-1 mt-8 text-ink">Interface roundness</h3>
      <p className="t-small mb-2 max-w-xl text-muted">How round the corners of cards, panels and buttons are across the whole app. 0 is square, 24 is very round.</p>
      <div className="space-y-3 py-2">
        <Slider label="Corner radius" value={cornerRadius} min={0} max={24} onChange={(v) => set("cornerRadius", v)} format={(v) => `${v}px`} />
        <Slider label="Window corners" value={windowRadius} min={0} max={24} onChange={(v) => set("windowRadius", v)} format={(v) => `${v}px`} />
      </div>
      <p className="t-small mb-2 max-w-xl text-muted">“Window corners” rounds the app window itself. A maximised window is always square, so it fills the screen.</p>
      <div className="flex gap-2">
        <div aria-hidden className="h-14 w-28 border border-line bg-surface-alt" style={{ borderRadius: cornerRadius }} />
        <div aria-hidden className="grid h-14 place-items-center border border-accent bg-accent px-5 text-accent-contrast" style={{ borderRadius: Math.round(cornerRadius * 0.6) }}>Button</div>
        {cornerRadius !== DEFAULT_CORNER_RADIUS && <Button size="sm" variant="ghost" className="self-center" onClick={() => set("cornerRadius", DEFAULT_CORNER_RADIUS)}>Back to default</Button>}
      </div>

      <h3 id="mood-bars" className="font-display t-title mb-1 mt-8 text-ink">Mood and progress bars</h3>
      <SettingRow title="Mood-adaptive interface" description="Optional. When on, the accent gently follows the mood you pick on the dashboard for today. It never guesses your mood and is never stored as a health record.">
        <Switch checked={m.adaptive} onCheckedChange={(v) => patch("moodBars", { adaptive: v })} aria-label="Mood-adaptive interface" />
      </SettingRow>
      <SettingRow title="Bar style" description="The look of the filled bars that show mood, energy, pain and sleep on the Dashboard, Daily Log and Insights. The preview below changes as you choose. “Pill” is always fully round; every other style uses the corner radius below." stacked>
        <Segmented label="Bar style" className="flex-wrap" value={m.style} options={MOOD_STYLES} onChange={(v) => patch("moodBars", { style: v })} />
      </SettingRow>
      <div className="space-y-3 py-3">
        <Slider label="Bar corner radius" value={m.radius} min={0} max={24} onChange={(v) => patch("moodBars", { radius: v })} format={(v) => `${v}px`} />
        <Slider label="Bar height" value={m.height} min={4} max={28} onChange={(v) => patch("moodBars", { height: v })} format={(v) => `${v}px`} />
        <Slider label="Opacity" value={m.opacity} min={0.4} max={1} step={0.05} onChange={(v) => patch("moodBars", { opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
      </div>
      <SettingRow title="Animate" description="Bars fill once when they appear."><Switch checked={m.animate} onCheckedChange={(v) => patch("moodBars", { animate: v })} aria-label="Animate bars" /></SettingRow>
      <SettingRow title="Colour"><Segmented label="Bar colour" value={m.colorSource} options={[{ value: "accent", label: "Theme accent" }, { value: "mood", label: "By level" }]} onChange={(v) => patch("moodBars", { colorSource: v })} /></SettingRow>
      <div className="mt-2 space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Mood bar preview">
        <MoodBar label="Mood (preview)" value={4} /><MoodBar label="Energy (preview)" value={2} /><MoodBar label="Sleep (preview)" value={7} max={9} valueText="7 h" />
      </div>
      <p className="t-small mt-2 text-muted">The number is always shown beside the bar, so meaning never depends on colour alone.</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="soft" onClick={() => reset("moodBars")}><RotateCcw className="size-4" />Reset mood bars</Button>
        <Button size="sm" variant="soft" onClick={() => reset("dashboard")}><RotateCcw className="size-4" />Restore dashboard layout</Button>
      </div>
    </div>
  );
}
