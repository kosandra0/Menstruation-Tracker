import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { Segmented, SettingRow, Select } from "../../components/ui/controls";
import { DEFAULT_CLOCK, useAppearance, type ClockPlacement, type ClockType } from "../../stores/appearance";
import { ClockView, regionUses12Hour, systemLocale, systemTimeZone } from "./ClockWidget";

function allZones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    return fn ? fn("timeZone") : [];
  } catch {
    return [];
  }
}

export function ClockSection() {
  const c = useAppearance((s) => s.clock);
  const patch = useAppearance((s) => s.patch);
  const zones = useMemo(allZones, []);
  const locale = systemLocale();
  const sysZone = systemTimeZone();
  const sys12 = regionUses12Hour(locale);

  return (
    <div>
      <div className="mb-4 flex min-h-[9.5rem] items-center justify-center rounded-2xl border border-line bg-canvas p-5" aria-label="Clock preview">
        {c.type === "off" ? <p className="t-small text-muted">The clock is off. Choose a digital or analog clock below.</p> : <ClockView settings={c} size="lg" />}
      </div>

      <SettingRow title="Clock type" description="Shows the current time with seconds ticking along. Analog draws hour, minute and (optionally) second hands.">
        <Segmented<ClockType> label="Clock type" value={c.type} options={[{ value: "off", label: "Off" }, { value: "digital", label: "Digital" }, { value: "analog", label: "Analog" }]} onChange={(v) => patch("clock", { type: v })} />
      </SettingRow>
      <SettingRow title="Where it appears" description="On the dashboard header, in the title bar (a small version), or both.">
        <Segmented<ClockPlacement> label="Clock placement" value={c.placement} options={[{ value: "dashboard", label: "Dashboard" }, { value: "titlebar", label: "Title bar" }, { value: "both", label: "Both" }]} onChange={(v) => patch("clock", { placement: v })} />
      </SettingRow>
      <SettingRow title="Hour format" description={`“Region default” follows the convention of your region (${locale}: ${sys12 ? "12-hour with AM/PM" : "24-hour"}).`}>
        <Segmented label="Hour format" value={c.hourCycle} options={[{ value: "auto", label: "Region default" }, { value: "12", label: "12-hour" }, { value: "24", label: "24-hour" }]} onChange={(v) => patch("clock", { hourCycle: v })} />
      </SettingRow>
      <SettingRow title="Time zone" description={`“This computer” uses the time zone Windows reports (${sysZone}). Pick another place to see its time instead.`}>
        <Select aria-label="Time zone" value={c.timeZone} onChange={(e) => patch("clock", { timeZone: e.target.value })} className="max-w-60">
          <option value="auto">This computer ({sysZone})</option>
          {zones.filter((z) => z !== sysZone).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
          {c.timeZone !== "auto" && !zones.includes(c.timeZone) && <option value={c.timeZone}>{c.timeZone}</option>}
        </Select>
      </SettingRow>
      <SettingRow title="Show the date" description="The weekday and date under the time."><Switch checked={c.showDate} onCheckedChange={(v) => patch("clock", { showDate: v })} aria-label="Show the date" /></SettingRow>
      <SettingRow title="Second hand (analog)" description="The digital clock always shows seconds."><Switch checked={c.secondHand} onCheckedChange={(v) => patch("clock", { secondHand: v })} aria-label="Show the second hand" /></SettingRow>
      <p className="t-small py-3 text-muted">Region information comes from your computer: language/region {locale}, time zone {sysZone}. Nothing is looked up online.</p>
      <Button size="sm" variant="soft" onClick={() => patch("clock", { ...DEFAULT_CLOCK })}><RotateCcw className="size-4" />Reset clock</Button>
    </div>
  );
}
