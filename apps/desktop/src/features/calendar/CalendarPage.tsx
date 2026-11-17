import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Droplet, PenLine, Trash2 } from "lucide-react";
import { cn } from "@mt/ui";
import {
  addDays, estimateNextPeriodStart, FLOW_LEVELS, toIsoDate, todayIso, validatePeriod,
  type FlowLevel, type IsoDate, type PeriodRecord,
} from "@mt/domain";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/controls";
import { EmptyState, EstimateDisclaimer, StorageBanner, toast } from "../../components/common/feedback";
import { newId, useRecords } from "../../stores/records";
import { fmtLong, fmtMonthYear, fmtShort, parseIso } from "../../lib/format";
import { useToday } from "../../hooks/useToday";
import { useAppearance } from "../../stores/appearance";
import { EASE } from "../../lib/motion";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ONGOING_MAX_DAYS = 9;

/** Monday-first 6x7 grid for the month containing `anchor`. */
function monthGrid(anchor: Date): IsoDate[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, i) => toIsoDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

function periodCovers(p: PeriodRecord, day: IsoDate, today: IsoDate): boolean {
  if (day < p.start) return false;
  if (p.end) return day <= p.end;
  const limit = addDays(p.start, ONGOING_MAX_DAYS);
  return day <= (today < limit ? today : limit) || day === p.start;
}

export function CalendarPage() {
  const today = useToday();
  const data = useRecords((s) => s.data);
  const loadStatus = useRecords((s) => s.loadStatus);
  const { upsertPeriod, deletePeriod, setLog } = useRecords.getState();
  const motionIntensity = useAppearance((s) => s.motionIntensity);

  const [month, setMonth] = useState(() => new Date(parseIso(todayIso()).getFullYear(), parseIso(todayIso()).getMonth(), 1));
  const [selected, setSelected] = useState<IsoDate>(todayIso());
  const [dir, setDir] = useState<1 | -1>(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const estimate = useMemo(() => estimateNextPeriodStart(data.periods), [data.periods]);
  const cells = useMemo(() => monthGrid(month), [month]);
  const monthIdx = month.getMonth();
  const ready = loadStatus === "ready";

  const periodFor = (day: IsoDate) => data.periods.find((p) => periodCovers(p, day, today));
  const inEstimate = (day: IsoDate) => !!estimate && day >= estimate.range.earliest && day <= estimate.range.latest && day >= today;

  const goMonth = (delta: number) => {
    setDir(delta > 0 ? 1 : -1);
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };
  const select = (day: IsoDate) => {
    setSelected(day);
    setError(null);
    const d = parseIso(day);
    if (d.getMonth() !== monthIdx || d.getFullYear() !== month.getFullYear()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const onGridKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) {
      e.preventDefault();
      const next = addDays(selected, step[e.key]);
      select(next);
      requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const d = parseIso(selected);
      const target = new Date(d.getFullYear(), d.getMonth() + (e.key === "PageUp" ? -1 : 1), Math.min(d.getDate(), 28));
      setDir(e.key === "PageUp" ? -1 : 1);
      select(toIsoDate(target));
    }
  };

  const selPeriod = periodFor(selected);
  const selLog = data.logs[selected];
  const isFuture = selected > today;

  const startPeriod = () => {
    const p: PeriodRecord = { id: newId(), start: selected, end: null };
    const err = upsertPeriod(p);
    setError(err);
    if (!err) toast.success(`Period start recorded for ${fmtShort(selected)}.`);
  };
  const endPeriod = () => {
    const open = [...data.periods].filter((p) => p.start <= selected).sort((a, b) => (a.start < b.start ? 1 : -1))[0];
    if (!open) return setError("Record when the period started first.");
    const updated = { ...open, end: selected };
    const err = validatePeriod(updated, data.periods);
    setError(err);
    if (!err) { upsertPeriod(updated); toast.success(`Period end recorded for ${fmtShort(selected)}.`); }
  };
  const editPeriod = (p: PeriodRecord, patch: Partial<PeriodRecord>) => {
    const err = upsertPeriod({ ...p, ...patch });
    setError(err);
    if (!err) toast.success("Period updated.");
  };

  return (
    <div>
      <PageHeader title="Cycle Calendar" description="Record the days of your period and see how they fit together. Dashed days are estimates, not facts." />
      <StorageBanner />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display t-title text-ink" aria-live="polite">{fmtMonthYear(month)}</h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => goMonth(-1)}><ChevronLeft className="size-4" /></Button>
              <Button size="sm" variant="soft" onClick={() => { select(todayIso()); setMonth(new Date(parseIso(todayIso()).getFullYear(), parseIso(todayIso()).getMonth(), 1)); }}>Today</Button>
              <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => goMonth(1)}><ChevronRight className="size-4" /></Button>
            </div>
          </div>

          <div role="grid" aria-label={`${fmtMonthYear(month)} calendar`} onKeyDown={onGridKey} ref={gridRef}>
            <div role="row" className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((w) => <div key={w} role="columnheader" className="t-label py-1.5 text-center text-muted">{w}</div>)}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${month.getFullYear()}-${monthIdx}`}
                initial={{ opacity: 0, x: dir * (motionIntensity === "gentle" ? 6 : 14) }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }} className="grid grid-cols-7 gap-1"
              >
                {cells.map((day) => {
                  const d = parseIso(day);
                  const outside = d.getMonth() !== monthIdx;
                  const p = periodFor(day);
                  const log = data.logs[day];
                  const spotting = log?.flow === "spotting";
                  const est = inEstimate(day);
                  const isSel = day === selected;
                  const label = [
                    fmtLong(day), p ? "recorded period day" : "", spotting ? "spotting" : "", est ? "estimated period window" : "", log ? "has a log" : "", day === today ? "today" : "",
                  ].filter(Boolean).join(", ");
                  return (
                    <button
                      key={day} type="button" role="gridcell" data-day={day} aria-label={label} aria-selected={isSel} tabIndex={isSel ? 0 : -1}
                      onClick={() => select(day)}
                      className={cn(
                        "relative grid aspect-square min-h-11 place-items-center rounded-xl border text-sm transition-colors",
                        outside && "opacity-40",
                        p ? "border-transparent bg-accent text-accent-contrast" : "border-transparent hover:bg-surface-alt",
                        !p && est && "border-dashed border-accent/70 bg-accent-soft/60",
                        isSel && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                      )}
                    >
                      <span className={cn("tabular-nums", day === today && !p && "font-semibold text-accent")}>{d.getDate()}</span>
                      {spotting && !p && <Droplet aria-hidden className="absolute right-1.5 top-1.5 size-2.5 text-accent" />}
                      {log && <span aria-hidden className={cn("absolute bottom-1.5 size-1 rounded-full", p ? "bg-accent-contrast/80" : "bg-muted")} />}
                      {day === today && <span aria-hidden className={cn("absolute inset-x-3 bottom-0.5 h-0.5 rounded-full", p ? "bg-accent-contrast/70" : "bg-accent")} />}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <ul className="t-small mt-4 flex flex-wrap gap-x-5 gap-y-2 text-muted" aria-label="Legend">
            <li className="flex items-center gap-2"><span aria-hidden className="size-3.5 rounded-md bg-accent" />Recorded period</li>
            <li className="flex items-center gap-2"><span aria-hidden className="size-3.5 rounded-md border border-dashed border-accent/80 bg-accent-soft/60" />Estimated window</li>
            <li className="flex items-center gap-2"><Droplet aria-hidden className="size-3.5 text-accent" />Spotting</li>
            <li className="flex items-center gap-2"><span aria-hidden className="size-1.5 rounded-full bg-muted" />Day has a log</li>
          </ul>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardTitle>{fmtLong(selected)}</CardTitle>
            {!ready ? (
              <p className="t-body mt-3 text-muted">Your records are not available yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {selPeriod ? (
                  <div className="space-y-3 rounded-xl bg-surface-alt p-3.5">
                    <p className="t-body text-ink">Part of a recorded period.</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="t-small text-muted">Started
                        <input type="date" value={selPeriod.start} max={todayIso()} onChange={(e) => e.target.value && editPeriod(selPeriod, { start: e.target.value as IsoDate })} className="t-body mt-1 h-9 w-full rounded-control border border-line bg-surface px-2 text-ink" />
                      </label>
                      <label className="t-small text-muted">Ended
                        <input type="date" value={selPeriod.end ?? ""} min={selPeriod.start} max={todayIso()} onChange={(e) => editPeriod(selPeriod, { end: (e.target.value || null) as IsoDate | null })} className="t-body mt-1 h-9 w-full rounded-control border border-line bg-surface px-2 text-ink" />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!selPeriod.end && selected >= selPeriod.start && <Button size="sm" variant="soft" onClick={endPeriod}>Period ended this day</Button>}
                      <Button size="sm" variant="ghost" onClick={() => { deletePeriod(selPeriod.id); toast.info("Period removed."); }}><Trash2 className="size-4" />Remove period</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={startPeriod} disabled={isFuture}><Droplet className="size-4" />Period started this day</Button>
                    {data.periods.length > 0 && <Button size="sm" variant="soft" onClick={endPeriod} disabled={isFuture}>Period ended this day</Button>}
                  </div>
                )}
                {isFuture && <p className="t-small text-muted">Future days can't be recorded yet.</p>}
                {error && <p role="alert" className="t-small text-danger">{error}</p>}

                <label className="t-small block text-muted">Flow on this day
                  <Select
                    className="mt-1 w-full" value={selLog?.flow ?? ""} disabled={isFuture}
                    onChange={(e) => { setLog(selected, { flow: (e.target.value || undefined) as FlowLevel | undefined }); }}
                  >
                    <option value="">Not recorded</option>
                    {FLOW_LEVELS.map((f) => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
                  </Select>
                </label>
                <Link to={`/log?date=${selected}`}><Button size="sm" variant="soft" className="w-full"><PenLine className="size-4" />Open daily log for this day</Button></Link>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Estimate</CardTitle>
            {estimate ? (
              <div className="mt-3 space-y-2">
                <p className="t-body text-ink">Next period likely starts around <strong className="font-semibold">{fmtShort(estimate.value)}</strong>, between {fmtShort(estimate.range.earliest)} and {fmtShort(estimate.range.latest)}.</p>
                <p className="t-small text-muted">{estimate.uncertaintyNote}</p>
                <EstimateDisclaimer />
              </div>
            ) : (
              <div className="mt-3"><EmptyState icon={<CalendarDays className="size-5" />} title="No estimate yet">Record the start of two periods and a range will appear on the calendar.</EmptyState></div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
