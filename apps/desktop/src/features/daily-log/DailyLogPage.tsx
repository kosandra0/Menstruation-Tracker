import { useEffect, useMemo, useState } from "react";
import { useBlocker, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Minus, Plus, Save, Trash2, X } from "lucide-react";
import {
  addDays, COMMON_SYMPTOMS, DISCHARGE_TYPES, FLOW_LEVELS, isIsoDate, todayIso, type DailyLog, type FlowLevel, type IsoDate,
} from "@mt/domain";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/common/Chip";
import { Dialog, DialogContent } from "../../components/ui/Dialog";
import { StorageBanner, toast } from "../../components/common/feedback";
import { MoodBar } from "../../components/common/MoodBar";
import { useRecords } from "../../stores/records";
import { fmtLong } from "../../lib/format";

type Draft = Omit<DailyLog, "date" | "updatedAt">;

const MOOD_LABELS = ["Very low", "Low", "Okay", "Good", "Great"];
const PAIN_LABELS = ["None", "Mild", "Moderate", "Strong", "Severe"];
const STRESS_LABELS = ["Very calm", "Calm", "Some stress", "Stressed", "Very stressed"];
const TEMP_RANGE: [number, number] = [34, 42];
const WEIGHT_RANGE: [number, number] = [20, 400];

const toDraft = (l: DailyLog | undefined): Draft => ({
  flow: l?.flow, mood: l?.mood, energy: l?.energy, pain: l?.pain, sleepHours: l?.sleepHours,
  symptoms: [...(l?.symptoms ?? [])], hydrationGlasses: l?.hydrationGlasses, exerciseMinutes: l?.exerciseMinutes,
  medications: [...(l?.medications ?? [])], notes: l?.notes,
  stress: l?.stress, temperatureC: l?.temperatureC, weightKg: l?.weightKg, discharge: l?.discharge, intimacy: l?.intimacy,
});
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);
const isEmpty = (d: Draft) =>
  !d.flow && d.mood === undefined && d.energy === undefined && d.pain === undefined && d.sleepHours === undefined &&
  !d.symptoms.length && !d.hydrationGlasses && !d.exerciseMinutes && !d.medications.length && !d.notes?.trim() &&
  d.stress === undefined && d.temperatureC === undefined && d.weightKg === undefined && !d.discharge && d.intimacy === undefined;

/** Decimal field that keeps what is being typed and reports a number (or nothing) to the form. */
function NumField({ label, value, onChange, range, step, unit }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; range: [number, number]; step: number; unit: string }) {
  const [text, setText] = useState<string>(value === undefined ? "" : String(value));
  useEffect(() => setText(value === undefined ? "" : String(value)), [value]);
  const n = text.trim() === "" ? undefined : Number(text.replace(",", "."));
  const bad = n !== undefined && (!Number.isFinite(n) || n < range[0] || n > range[1]);
  return (
    <div>
      <label className="t-small mb-2 block text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" inputMode="decimal" step={step} min={range[0]} max={range[1]} value={text} aria-label={label} aria-invalid={bad}
          onChange={(e) => {
            setText(e.target.value);
            const v = e.target.value.trim() === "" ? undefined : Number(e.target.value.replace(",", "."));
            onChange(v === undefined ? undefined : Number.isFinite(v) ? v : undefined);
          }}
          className={`t-body h-9 w-28 rounded-control border bg-surface px-3 tabular-nums text-ink outline-none focus-visible:border-accent ${bad ? "border-danger" : "border-line"}`}
        />
        <span className="t-small text-muted">{unit}</span>
      </div>
      {bad && <p role="alert" className="t-small mt-1 text-danger">Enter a value between {range[0]} and {range[1]} {unit}.</p>}
    </div>
  );
}

function ScaleRow({ label, value, labels, onChange, min = 1 }: { label: string; value: number | undefined; labels: string[]; onChange: (v: number | undefined) => void; min?: number }) {
  return (
    <fieldset>
      <legend className="t-small mb-2 text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {labels.map((l, i) => {
          const v = i + min;
          return <Chip key={l} selected={value === v} onClick={() => onChange(value === v ? undefined : v)}>{l}</Chip>;
        })}
      </div>
    </fieldset>
  );
}

function Stepper({ label, value, onChange, step = 1, max, unit }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; step?: number; max: number; unit: string }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="t-small mb-2 text-muted">{label}</div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="soft" aria-label={`Decrease ${label}`} disabled={v <= 0} onClick={() => onChange(Math.max(0, +(v - step).toFixed(1)) || undefined)}><Minus className="size-4" /></Button>
        <span className="t-body w-24 text-center tabular-nums text-ink">{value === undefined ? "Not logged" : `${value} ${unit}`}</span>
        <Button size="sm" variant="soft" aria-label={`Increase ${label}`} disabled={v >= max} onClick={() => onChange(Math.min(max, +(v + step).toFixed(1)))}><Plus className="size-4" /></Button>
      </div>
    </div>
  );
}

function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim().slice(0, 40);
    if (t && !values.includes(t)) onChange([...values, t]);
    setText("");
  };
  return (
    <div>
      <label className="t-small mb-2 block text-muted">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        {values.map((m) => (
          <span key={m} className="t-small inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1.5 text-ink">
            {m}<button type="button" aria-label={`Remove ${m}`} onClick={() => onChange(values.filter((x) => x !== m))} className="rounded-full p-0.5 hover:bg-surface/60"><X className="size-3" /></button>
          </span>
        ))}
        <input
          type="text" value={text} placeholder={placeholder} aria-label={label} maxLength={40}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          onBlur={add}
          className="t-body h-9 min-w-40 flex-1 rounded-control border border-line bg-surface px-3 text-ink outline-none focus-visible:border-accent"
        />
      </div>
    </div>
  );
}

export function DailyLogPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("date") ?? "";
  const date: IsoDate = isIsoDate(raw) && raw <= todayIso() ? raw : todayIso();
  const today = todayIso();

  const logs = useRecords((s) => s.data.logs);
  const customSymptoms = useRecords((s) => s.data.customSymptoms);
  const ready = useRecords((s) => s.loadStatus === "ready");
  const { replaceLog, deleteLog, addCustomSymptom } = useRecords.getState();
  const saved = logs[date];

  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const [custom, setCustom] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingDate, setPendingDate] = useState<IsoDate | null>(null);

  // Load the stored entry when the date (or the stored log) changes underneath an unmodified draft.
  const baseline = useMemo(() => toDraft(saved), [saved]);
  useEffect(() => setDraft(baseline), [date, baseline]);

  const dirty = !same(draft, baseline);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = (): boolean => {
    if (!ready) { toast.error("Your records are not available, so this could not be saved."); return false; }
    if (isEmpty(draft)) {
      if (saved) { toast.info("This entry is empty. Use Delete entry to remove it."); return false; }
      toast.info("Nothing to save yet. Fill in anything you like; every field is optional.");
      return false;
    }
    if (draft.sleepHours !== undefined && (draft.sleepHours < 0 || draft.sleepHours > 24)) { toast.error("Sleep must be between 0 and 24 hours."); return false; }
    if (draft.temperatureC !== undefined && !(draft.temperatureC >= TEMP_RANGE[0] && draft.temperatureC <= TEMP_RANGE[1])) { toast.error(`Temperature must be between ${TEMP_RANGE[0]} and ${TEMP_RANGE[1]} °C.`); return false; }
    if (draft.weightKg !== undefined && !(draft.weightKg >= WEIGHT_RANGE[0] && draft.weightKg <= WEIGHT_RANGE[1])) { toast.error(`Weight must be between ${WEIGHT_RANGE[0]} and ${WEIGHT_RANGE[1]} kg.`); return false; }
    const clean: Draft = { ...draft, notes: draft.notes?.trim() || undefined };
    replaceLog({ ...clean, date, updatedAt: "" });
    toast.success(`Saved your log for ${fmtLong(date)}.`);
    return true;
  };

  const goto = (d: IsoDate) => {
    if (dirty) setPendingDate(d);
    else setParams(d === today ? {} : { date: d }, { replace: true });
  };

  const symptomChoices = useMemo(() => [...COMMON_SYMPTOMS, ...customSymptoms], [customSymptoms]);
  const toggleSymptom = (s: string) => set("symptoms", draft.symptoms.includes(s) ? draft.symptoms.filter((x) => x !== s) : [...draft.symptoms, s]);
  const addCustom = () => {
    const n = custom.trim();
    if (!n) return;
    addCustomSymptom(n);
    if (!draft.symptoms.includes(n)) set("symptoms", [...draft.symptoms, n]);
    setCustom("");
  };

  return (
    <div>
      <PageHeader title="Daily Log" description="A quick, optional record of how the day felt. Fill in only what you want to." />
      <StorageBanner />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" aria-label="Previous day" onClick={() => goto(addDays(date, -1))}><ChevronLeft className="size-4" /></Button>
        <input
          type="date" aria-label="Log date" value={date} max={today}
          onChange={(e) => e.target.value && isIsoDate(e.target.value) && goto(e.target.value)}
          className="t-body h-9 rounded-control border border-line bg-surface px-3 text-ink"
        />
        <Button size="sm" variant="ghost" aria-label="Next day" disabled={date >= today} onClick={() => goto(addDays(date, 1))}><ChevronRight className="size-4" /></Button>
        {date !== today && <Button size="sm" variant="soft" onClick={() => goto(today)}>Today</Button>}
        <span className="t-small ml-1 text-muted">{fmtLong(date)}</span>
        {dirty && <span className="t-small ml-auto rounded-full bg-accent-soft px-2.5 py-1 text-ink">Unsaved changes</span>}
        {!dirty && saved && <span className="t-small ml-auto text-muted">Saved</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-5">
          <CardTitle>Body</CardTitle>
          <fieldset>
            <legend className="t-small mb-2 text-muted">Flow</legend>
            <div className="flex flex-wrap gap-2">
              {FLOW_LEVELS.map((f) => <Chip key={f} selected={draft.flow === f} onClick={() => set("flow", draft.flow === f ? undefined : (f as FlowLevel))}>{f[0].toUpperCase() + f.slice(1)}</Chip>)}
            </div>
          </fieldset>
          <ScaleRow label="Pain" value={draft.pain === undefined ? undefined : draft.pain + 1} labels={PAIN_LABELS} onChange={(v) => set("pain", v === undefined ? undefined : ((v - 1) as 0 | 1 | 2 | 3 | 4))} />
          <fieldset>
            <legend className="t-small mb-2 text-muted">Symptoms</legend>
            <div className="flex flex-wrap gap-2">
              {symptomChoices.map((s) => <Chip key={s} selected={draft.symptoms.includes(s)} onClick={() => toggleSymptom(s)} className="capitalize">{s}</Chip>)}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} placeholder="Add your own symptom" aria-label="Custom symptom"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                className="t-body h-9 flex-1 rounded-control border border-line bg-surface px-3 text-ink outline-none focus-visible:border-accent"
              />
              <Button size="sm" variant="soft" onClick={addCustom}>Add</Button>
            </div>
          </fieldset>
        </Card>

        <Card className="space-y-5">
          <CardTitle>Mind and energy</CardTitle>
          <ScaleRow label="Mood" value={draft.mood} labels={MOOD_LABELS} onChange={(v) => set("mood", v as DailyLog["mood"])} />
          <ScaleRow label="Energy" value={draft.energy} labels={MOOD_LABELS} onChange={(v) => set("energy", v as DailyLog["energy"])} />
          <div className="space-y-3 rounded-xl bg-surface-alt p-3.5">
            <MoodBar label="Mood" value={draft.mood} />
            <MoodBar label="Energy" value={draft.energy} />
            <MoodBar label="Pain" value={draft.pain} max={4} valueText={draft.pain === undefined ? "Not logged" : PAIN_LABELS[draft.pain]} />
          </div>
        </Card>

        <Card className="space-y-5">
          <CardTitle>Lifestyle</CardTitle>
          <div className="grid grid-cols-2 gap-5">
            <Stepper label="Sleep" value={draft.sleepHours} onChange={(v) => set("sleepHours", v)} step={0.5} max={24} unit="h" />
            <Stepper label="Water" value={draft.hydrationGlasses} onChange={(v) => set("hydrationGlasses", v)} max={30} unit="glasses" />
            <Stepper label="Exercise" value={draft.exerciseMinutes} onChange={(v) => set("exerciseMinutes", v)} step={5} max={600} unit="min" />
          </div>
          <TagInput label="Medication or supplements taken" values={draft.medications} onChange={(v) => set("medications", v)} placeholder="Type a name and press Enter" />
        </Card>

        <Card className="space-y-5">
          <CardTitle>Body signals</CardTitle>
          <ScaleRow label="Stress" value={draft.stress} labels={STRESS_LABELS} onChange={(v) => set("stress", v as DailyLog["stress"])} />
          <div className="grid grid-cols-2 gap-5">
            <NumField label="Temperature" value={draft.temperatureC} onChange={(v) => set("temperatureC", v)} range={TEMP_RANGE} step={0.1} unit="°C" />
            <NumField label="Weight" value={draft.weightKg} onChange={(v) => set("weightKg", v)} range={WEIGHT_RANGE} step={0.1} unit="kg" />
          </div>
          <fieldset>
            <legend className="t-small mb-2 text-muted">Cervical fluid</legend>
            <div className="flex flex-wrap gap-2">
              {DISCHARGE_TYPES.map((t) => <Chip key={t} selected={draft.discharge === t} onClick={() => set("discharge", draft.discharge === t ? undefined : t)} className="capitalize">{t}</Chip>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="t-small mb-2 text-muted">Intimacy (private note)</legend>
            <div className="flex flex-wrap gap-2">
              <Chip selected={draft.intimacy === true} onClick={() => set("intimacy", draft.intimacy === true ? undefined : true)}>Yes</Chip>
              <Chip selected={draft.intimacy === false} onClick={() => set("intimacy", draft.intimacy === false ? undefined : false)}>No</Chip>
            </div>
          </fieldset>
          <p className="t-small text-muted">These stay in your encrypted records. They are never used to predict fertility or as contraception.</p>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Notes</CardTitle>
          <textarea
            value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={7} maxLength={5000} aria-label="Notes for this day"
            placeholder="Anything worth remembering about today…"
            className="t-body w-full resize-y rounded-control border border-line bg-surface p-3 leading-relaxed text-ink outline-none focus-visible:border-accent"
          />
          <p className="t-small text-muted">Notes stay on this device in your encrypted records.</p>
        </Card>
      </div>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift">
        <Button onClick={() => save()} disabled={!dirty || !ready}><Save className="size-4" />Save entry</Button>
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(baseline)}>Discard changes</Button>
        {saved && <Button variant="ghost" className="ml-auto text-danger" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" />Delete entry</Button>}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title="Delete this entry?" description={`This removes everything you logged for ${fmtLong(date)}. It cannot be undone.`}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button className="bg-danger bg-none text-white" onClick={() => { deleteLog(date); setConfirmDelete(false); toast.info("Entry deleted."); }}>Delete entry</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDate !== null} onOpenChange={(o) => !o && setPendingDate(null)}>
        <DialogContent title="Save your changes first?" description="You have unsaved changes for this day.">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingDate(null)}>Stay here</Button>
            <Button variant="soft" onClick={() => { const d = pendingDate!; setPendingDate(null); setDraft(baseline); setParams(d === today ? {} : { date: d }, { replace: true }); }}>Discard</Button>
            <Button onClick={() => { if (save()) { const d = pendingDate!; setPendingDate(null); setParams(d === today ? {} : { date: d }, { replace: true }); } }}>Save and continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={blocker.state === "blocked"} onOpenChange={(o) => !o && blocker.state === "blocked" && blocker.reset()}>
        <DialogContent title="Leave without saving?" description="Your changes to this day's log have not been saved.">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => blocker.state === "blocked" && blocker.reset()}>Stay here</Button>
            <Button variant="soft" onClick={() => blocker.state === "blocked" && blocker.proceed()}>Leave without saving</Button>
            <Button onClick={() => { if (save() && blocker.state === "blocked") blocker.proceed(); }}>Save and leave</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
