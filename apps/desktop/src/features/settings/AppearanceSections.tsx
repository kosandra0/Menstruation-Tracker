import { useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Palette as PaletteIcon, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { cn } from "@mt/ui";
import { todayIso } from "@mt/domain";
import { THEMES, auditPalette, generatePalette, hasOverrides, normalizeHex, type OverrideKey } from "@mt/design-tokens";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { ColorField, Segmented, SettingRow, Select, Slider } from "../../components/ui/controls";
import { Dialog, DialogContent } from "../../components/ui/Dialog";
import { toast } from "../../components/common/feedback";
import { useResolvedMode } from "../../app/providers/ThemeProvider";
import { useAppearance, exportPalette, parsePaletteFile, type CustomPalette, type ModePreference } from "../../stores/appearance";
import { baseThemePalette, resolvePalette } from "../../lib/palette";
import { availableFonts, resolveFont } from "../../lib/fonts";
import { downloadText } from "../../lib/format";
import { PalettePreview } from "./PalettePreview";

const MODE_OPTIONS = [
  { value: "system", label: "System default" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" },
] as const;

/* ---------------------------------------------------------------- Themes */

export function ThemesSection() {
  const themeId = useAppearance((s) => s.themeId);
  const mode = useAppearance((s) => s.mode);
  const custom = useAppearance((s) => s.customPalettes);
  const set = useAppearance((s) => s.set);
  const resolved = useResolvedMode();

  const entries = useMemo(
    () => [
      ...THEMES.map((t) => ({ id: t.id as string, name: t.name, description: t.description, palette: t[resolved] })),
      ...custom.map((c) => ({ id: `custom:${c.id}`, name: c.name, description: "Your palette", palette: generatePalette({ accent: c.accent, accent2: c.accent2 }, resolved) })),
    ],
    [custom, resolved],
  );

  return (
    <div>
      <SettingRow title="Appearance" description="Light, dark, or follow Windows. Changes apply immediately.">
        <Segmented label="Appearance" value={mode} options={MODE_OPTIONS} onChange={(v: ModePreference) => set("mode", v)} />
      </SettingRow>
      <div role="radiogroup" aria-label="Theme" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((t) => {
          const active = t.id === themeId;
          return (
            <button
              key={t.id} type="button" role="radio" aria-checked={active} onClick={() => set("themeId", t.id)}
              className={cn("rounded-2xl border p-2.5 text-left transition-all duration-200", active ? "border-accent bg-accent-soft/50 shadow-soft" : "border-line bg-surface hover:border-accent/40")}
            >
              <PalettePreview palette={t.palette} mode={resolved} label={`${t.name} preview`} className="pointer-events-none" />
              <div className="mt-2.5 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <div className="t-body font-medium text-ink">{t.name}</div>
                  <div className="t-small truncate text-muted">{t.description}</div>
                </div>
                {active && <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Colors */

const COLOR_FIELDS: { key: OverrideKey; label: string; pick: (p: ReturnType<typeof baseThemePalette>) => string }[] = [
  { key: "accent", label: "Primary accent", pick: (p) => p.accent },
  { key: "accent2", label: "Secondary accent", pick: (p) => p.accent2 },
  { key: "background", label: "Background", pick: (p) => p.canvas },
  { key: "surface", label: "Cards and surfaces", pick: (p) => p.surface },
  { key: "text", label: "Text", pick: (p) => p.ink },
  { key: "border", label: "Borders", pick: (p) => p.border },
];

function PaletteManager() {
  const { customPalettes, themeId, addPalette, updatePalette, duplicatePalette, removePalette, set } = useAppearance();
  const resolved = useResolvedMode();
  const [name, setName] = useState("My palette");
  const [accent, setAccent] = useState("#7c5cbf");
  const [accent2, setAccent2] = useState<string | undefined>(undefined);
  const [toDelete, setToDelete] = useState<CustomPalette | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => generatePalette({ accent, accent2 }, resolved), [accent, accent2, resolved]);

  const create = () => {
    const id = addPalette({ name: name.trim() || "My palette", accent: normalizeHex(accent, "#7c5cbf"), accent2 });
    set("themeId", `custom:${id}`);
    toast.success("Palette saved and applied.");
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 100_000) return toast.error("That file is too large to be a palette.");
    const parsed = parsePaletteFile(await file.text());
    if (!parsed.ok) return toast.error(parsed.error);
    const id = addPalette(parsed.palette);
    set("themeId", `custom:${id}`);
    toast.success(`Imported “${parsed.palette.name}”.`);
  };

  return (
    <div className="mt-2 space-y-5">
      <div className="grid gap-4 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-3">
          <h4 className="t-body font-medium text-ink">Create a palette</h4>
          <label className="t-small flex items-center gap-3 text-muted"><span className="w-28 shrink-0">Name</span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="t-body h-9 flex-1 rounded-control border border-line bg-surface px-3 text-ink outline-none focus-visible:border-accent" />
          </label>
          <ColorField label="Accent" value={accent} onChange={setAccent} placeholder="#7c5cbf" />
          <ColorField label="Second accent" value={accent2} onChange={setAccent2} onClear={() => setAccent2(undefined)} placeholder={preview.accent2} showRgb={false} />
          <div className="flex gap-2">
            <Button size="sm" onClick={create}><Plus className="size-4" />Save palette</Button>
            <Button size="sm" variant="soft" onClick={() => fileRef.current?.click()}><Upload className="size-4" />Import palette</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Import palette file" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
        <PalettePreview palette={preview} mode={resolved} label="New palette preview" />
      </div>

      {customPalettes.length > 0 && (
        <ul className="space-y-2">
          {customPalettes.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
              <span aria-hidden className="size-5 rounded-full border border-line" style={{ background: p.accent }} />
              <input aria-label={`Name of ${p.name}`} value={p.name} maxLength={40} onChange={(e) => updatePalette(p.id, { name: e.target.value })} className="t-body h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-ink outline-none hover:border-line focus-visible:border-accent" />
              <input type="color" aria-label={`Accent of ${p.name}`} value={p.accent} onChange={(e) => updatePalette(p.id, { accent: e.target.value })} className="size-8 cursor-pointer rounded-md border border-line bg-surface p-0.5" />
              <Button size="sm" variant={themeId === `custom:${p.id}` ? "primary" : "soft"} onClick={() => set("themeId", `custom:${p.id}`)}>{themeId === `custom:${p.id}` ? "In use" : "Use"}</Button>
              <Button size="sm" variant="ghost" aria-label={`Duplicate ${p.name}`} onClick={() => duplicatePalette(p.id)}><Copy className="size-4" /></Button>
              <Button size="sm" variant="ghost" aria-label={`Export ${p.name}`} onClick={() => downloadText(`palette-${p.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`, exportPalette(p), "application/json")}><Download className="size-4" /></Button>
              <Button size="sm" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => setToDelete(p)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent title="Delete this palette?" description={toDelete ? `“${toDelete.name}” will be removed. If it is in use, the default theme is restored.` : undefined}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setToDelete(null)}>Keep it</Button>
            <Button className="bg-danger bg-none text-white" onClick={() => { if (toDelete) removePalette(toDelete.id); setToDelete(null); }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ColorsSection() {
  const a = useAppearance();
  const resolved = useResolvedMode();
  const base = baseThemePalette(a.themeId, a.customPalettes, resolved);
  const final = resolvePalette(a, resolved, todayIso());
  const audit = useMemo(() => auditPalette(final), [final]);
  const problems = audit.filter((c) => !c.ok);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-3.5">
          {COLOR_FIELDS.map((f) => (
            <ColorField
              key={f.key} label={f.label} value={a.overrides[f.key]} placeholder={f.pick(base)}
              onChange={(hex) => a.setOverride(f.key, hex)} onClear={() => a.setOverride(f.key, undefined)}
              against={f.key === "text" ? final.surface : f.key === "accent" ? final.surface : undefined}
            />
          ))}
          <SettingRow title="Keep text readable" description="Automatically adjusts text and accent-button colours when your choices would be hard to read.">
            <Switch checked={a.enforceReadable} onCheckedChange={(v) => a.set("enforceReadable", v)} aria-label="Keep text readable automatically" />
          </SettingRow>
          <Button size="sm" variant="soft" disabled={!hasOverrides(a.overrides)} onClick={() => a.resetColors()}><RotateCcw className="size-4" />Restore theme colours</Button>
        </div>
        <div className="space-y-3">
          <PalettePreview palette={final} mode={resolved} label="Live colour preview" />
          <ul aria-label="Contrast report" className="space-y-1.5">
            {audit.map((c) => (
              <li key={c.id} className="t-small flex items-center justify-between gap-2">
                <span className="text-muted">{c.label}</span>
                <span className={cn("tabular-nums", c.ok ? "text-success" : "text-danger")}>{c.ratio.toFixed(1)}:1 {c.ok ? "✓" : `needs ${c.required}:1`}</span>
              </li>
            ))}
          </ul>
          {problems.length > 0 && <p role="alert" className="t-small text-warning">{problems.length} combination{problems.length === 1 ? " is" : "s are"} hard to read. Turn on “Keep text readable” or adjust the colours.</p>}
        </div>
      </div>
      <div>
        <h3 className="font-display t-title mb-1 flex items-center gap-2 text-ink"><PaletteIcon className="size-4 text-accent" aria-hidden />Your palettes</h3>
        <p className="t-small text-muted">Create, rename, duplicate, import and export palettes. Built-in palettes are in the Themes section.</p>
        <PaletteManager />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Typography */

export function TypographySection() {
  const ty = useAppearance((s) => s.typography);
  const patch = useAppearance((s) => s.patch);
  const reset = useAppearance((s) => s.resetGroup);
  const fonts = useMemo(() => availableFonts(), []);
  const { fellBack } = resolveFont(ty.family);
  const groups = [["sans", "Modern sans-serif"], ["serif", "Serif"], ["mono", "Monospace"]] as const;

  return (
    <div className="space-y-2">
      <SettingRow title="Font" description="Only fonts installed on this computer are listed. Nothing is downloaded.">
        <Select aria-label="Font family" value={ty.family} onChange={(e) => patch("typography", { family: e.target.value })} className="w-64">
          {groups.map(([cat, label]) => {
            const list = fonts.filter((f) => f.category === cat);
            return list.length ? <optgroup key={cat} label={label}>{list.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup> : null;
          })}
        </Select>
      </SettingRow>
      {fellBack && <p role="status" className="t-small text-warning">Your chosen font is no longer installed, so the default is being used.</p>}
      <div className="space-y-3 py-3">
        <Slider label="Overall size" value={ty.scale} min={0.85} max={1.3} step={0.025} onChange={(v) => patch("typography", { scale: v })} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Headings" value={ty.headingScale} min={0.8} max={1.3} step={0.025} onChange={(v) => patch("typography", { headingScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Body text" value={ty.bodyScale} min={0.85} max={1.3} step={0.025} onChange={(v) => patch("typography", { bodyScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Labels" value={ty.labelScale} min={0.85} max={1.3} step={0.025} onChange={(v) => patch("typography", { labelScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Line height" value={ty.lineHeight} min={1.3} max={1.9} step={0.05} onChange={(v) => patch("typography", { lineHeight: v })} format={(v) => v.toFixed(2)} />
        <Slider label="Letter spacing" value={ty.letterSpacing} min={-0.02} max={0.08} step={0.005} onChange={(v) => patch("typography", { letterSpacing: v })} format={(v) => `${(v * 100).toFixed(1)}%`} />
      </div>
      <SettingRow title="Text weight" description="Weight of ordinary text. Some fonts only offer regular and bold.">
        <Segmented label="Text weight" value={ty.weight} options={[{ value: 400, label: "Regular" }, { value: 500, label: "Medium" }, { value: 600, label: "Semibold" }]} onChange={(v) => patch("typography", { weight: v })} />
      </SettingRow>
      <div className="rounded-2xl border border-line bg-surface p-5" aria-label="Typography preview">
        <div className="t-label text-muted">Preview</div>
        <h3 className="font-display t-heading mt-1 text-ink">A calm place to reflect</h3>
        <p className="t-body mt-2 max-w-prose leading-relaxed text-ink">Your cycle is personal. These words show how headings, body text and small labels look with your current settings, so you can choose what feels easiest to read.</p>
        <p className="t-small mt-2 text-muted">Small supporting text looks like this.</p>
      </div>
      <Button size="sm" variant="soft" onClick={() => reset("typography")}><RotateCcw className="size-4" />Reset typography</Button>
    </div>
  );
}
