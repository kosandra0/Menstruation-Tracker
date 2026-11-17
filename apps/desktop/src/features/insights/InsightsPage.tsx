import { useMemo, useState } from "react";
import { ChevronDown, Download, LineChart as LineIcon } from "lucide-react";
import {
  average, averagesByCycleDay, coverage, cycleLengthTrend, cycleLengths, dataQuality, fieldRelation, fieldUsage, loggingStats, recentChange, sleepAndMood, symptomPairs, symptomsByStage, valueByCycleDay, weekdayAverages, STAGES, MIN_SAMPLES, MIN_CORRELATION_SAMPLES, daysBetween, fieldSeries, flowDistribution, lastNDays, logsInRange, monthSummary,
  periodDuration, sortPeriods, summarize, symptomFrequency, todayIso, type DailyLog, type NumericField,
} from "@mt/domain";
import { cn } from "@mt/ui";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Segmented } from "../../components/ui/controls";
import { EmptyState, EstimateDisclaimer, StorageBanner, toast } from "../../components/common/feedback";
import { BarChart, LineChart } from "../../components/common/charts";
import { useRecords } from "../../stores/records";
import { csvCell, downloadText, fmtShort, monthKey, parseIso } from "../../lib/format";

type Range = "30" | "90" | "180" | "365" | "all";
const RANGES = [{ value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "180", label: "6 months" }, { value: "365", label: "1 year" }, { value: "all", label: "All" }] as const;

const FIELD_META: Record<NumericField, { title: string; min: number; max: number; unit: string }> = {
  mood: { title: "Mood", min: 1, max: 5, unit: "out of 5" },
  energy: { title: "Energy", min: 1, max: 5, unit: "out of 5" },
  pain: { title: "Pain", min: 0, max: 4, unit: "0 none - 4 severe" },
  sleepHours: { title: "Sleep", min: 0, max: 12, unit: "hours" },
  stress: { title: "Stress", min: 1, max: 5, unit: "1 calm - 5 stressed" },
  temperatureC: { title: "Temperature", min: 35, max: 39, unit: "°C" },
  weightKg: { title: "Weight", min: 30, max: 150, unit: "kg" },
  hydrationGlasses: { title: "Water", min: 0, max: 15, unit: "glasses" },
  exerciseMinutes: { title: "Exercise", min: 0, max: 120, unit: "minutes" },
};

const FIELD_LABEL: Partial<Record<NumericField, string>> = { mood: "mood", energy: "energy", pain: "pain", sleepHours: "sleep", stress: "stress", hydrationGlasses: "water", exerciseMinutes: "exercise" };
const RELATIONS: [NumericField, NumericField][] = [["stress", "pain"], ["stress", "mood"], ["sleepHours", "mood"], ["sleepHours", "energy"], ["pain", "mood"], ["exerciseMinutes", "mood"], ["hydrationGlasses", "energy"]];
const USAGE_LABEL: Record<string, string> = {
  flow: "Flow", mood: "Mood", energy: "Energy", pain: "Pain", sleep: "Sleep", symptoms: "Symptoms", water: "Water", exercise: "Exercise", medication: "Medication",
  notes: "Notes", stress: "Stress", temperature: "Temperature", weight: "Weight", discharge: "Discharge", intimacy: "Intimacy",
};

/** Axis range that hugs the data (temperature and weight vary in a narrow band), with a little padding. */
function paddedRange(values: number[], fallback: [number, number]): [number, number] {
  if (!values.length) return fallback;
  const lo = Math.min(...values), hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.2, (fallback[1] - fallback[0]) * 0.02);
  return [Math.floor((lo - pad) * 10) / 10, Math.ceil((hi + pad) * 10) / 10];
}

function CoverageGrid({ days }: { days: { date: string; fields: number }[] }) {
  const lead = days.length ? parseIso(days[0].date).getDay() : 0;
  const max = Math.max(1, ...days.map((d) => d.fields));
  return (
    <div role="img" aria-label={`Recording coverage for the last ${days.length} days: ${days.filter((d) => d.fields > 0).length} days with at least one entry.`}>
      <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: "minmax(0, 1fr)" }}>
        {Array.from({ length: lead }, (_, i) => <span key={`p${i}`} aria-hidden />)}
        {days.map((d) => (
          <span key={d.date} title={`${fmtShort(d.date)}: ${d.fields === 0 ? "nothing recorded" : `${d.fields} thing${d.fields === 1 ? "" : "s"} recorded`}`}
            className="aspect-square rounded-[3px] bg-accent" style={{ opacity: d.fields === 0 ? 0.1 : 0.25 + 0.75 * (d.fields / max) }} />
        ))}
      </div>
      <div className="t-small mt-2 flex items-center justify-between text-muted"><span>{fmtShort(days[0]?.date ?? "")}</span><span>Darker = more recorded that day</span><span>Today</span></div>
    </div>
  );
}

const QUALITY = {
  none: { label: "No data yet", note: "Record at least two period starts to see cycle statistics." },
  limited: { label: "Limited", note: "Fewer than 3 recorded cycles. Treat numbers as a first impression." },
  fair: { label: "Fair", note: "3-5 recorded cycles. Patterns are starting to show." },
  good: { label: "Good", note: "6 or more recorded cycles." },
} as const;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="t-label text-muted">{label}</div>
      <div className="font-display mt-1.5 text-[1.55rem] leading-tight text-ink">{value}</div>
      {hint && <div className="t-small mt-0.5 text-muted">{hint}</div>}
    </Card>
  );
}

function Explain({ children }: { children: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="t-small flex items-center gap-1 text-muted hover:text-ink">
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />How this is calculated
      </button>
      {open && <p className="t-small mt-1.5 leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

function ValueChart({ field, logs }: { field: NumericField; logs: DailyLog[] }) {
  const m = FIELD_META[field];
  const series = fieldSeries(logs, field);
  const avg = average(series.map((p) => p.value));
  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <CardTitle>{m.title}</CardTitle>
        <span className="t-small text-muted">{series.length ? `${series.length} logged day${series.length === 1 ? "" : "s"} · average ${avg}` : "Not logged in this range"}</span>
      </div>
      {series.length === 0 ? (
        <p className="t-body py-6 text-center text-muted">Log {m.title.toLowerCase()} in the Daily Log to see its history here.</p>
      ) : (
        <LineChart
          data={series.map((p) => ({ label: fmtShort(p.date), value: p.value }))} yMin={m.min} yMax={m.max} unit={m.unit}
          summary={`${m.title} over ${series.length} logged days, average ${avg} (${m.unit}), from ${fmtShort(series[0].date)} to ${fmtShort(series[series.length - 1].date)}.`}
        />
      )}
    </Card>
  );
}

export function InsightsPage() {
  const data = useRecords((s) => s.data);
  const [range, setRange] = useState<Range>("90");
  const today = todayIso();

  const view = useMemo(() => {
    const r = range === "all" ? { from: "0000-01-01", to: today } : lastNDays(today, Number(range));
    const logs = logsInRange(data.logs, r as { from: never; to: never });
    const periods = sortPeriods(data.periods);
    const allSummary = summarize(periods);
    // Cycles whose *ending* start falls in the range.
    const cycles = periods.slice(1).map((p, i) => ({ label: fmtShort(p.start), start: p.start, value: daysBetween(periods[i].start, p.start) })).filter((c) => c.start >= r.from && c.start <= r.to);
    const durations = periods.map((p) => ({ label: fmtShort(p.start), start: p.start, value: periodDuration(p) })).filter((d): d is { label: string; start: typeof d.start; value: number } => d.value !== null && d.start >= r.from && d.start <= r.to);
    const months = [...new Set(logs.map((l) => monthKey(l.date)))].sort().reverse().map((m) => monthSummary(data.logs, m));
    const stats = loggingStats(data.logs, r.from === "0000-01-01" ? (Object.keys(data.logs).sort()[0] as typeof today) ?? today : (r.from as typeof today), today);
    const rel = RELATIONS.map(([a, b]) => fieldRelation(logs, a, b));
    const cover = coverage(data.logs, today, 84);
    const tempDays = valueByCycleDay(periods, logs, "temperatureC");
    const changes = (["weightKg", "sleepHours", "mood", "pain", "stress"] as NumericField[]).map((f) => ({ field: f, ...recentChange(data.logs, f, today, 30) }));
    return { rel, cover, usage: fieldUsage(logs), pairs: symptomPairs(logs), tempDays, changes, stats, stages: averagesByCycleDay(periods, logs), stageSymptoms: symptomsByStage(periods, logs), weekday: weekdayAverages(logs, "mood"), sleepMood: sleepAndMood(logs), trend: cycleLengthTrend(periods), logs, periods, allSummary, cycles, durations, months, quality: dataQuality(periods), symptoms: symptomFrequency(logs), flow: flowDistribution(logs) };
  }, [data, range, today]);

  const exportCsv = () => {
    const rows = [
      ["type", "date", "end_or_flow", "mood", "energy", "pain", "sleep_hours", "symptoms", "medications", "hydration_glasses", "exercise_minutes", "notes", "stress", "temperature_c", "weight_kg", "discharge", "intimacy"],
      ...view.periods.map((p) => ["period", p.start, p.end ?? "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]),
      ...Object.values(data.logs).sort((a, b) => (a.date < b.date ? -1 : 1)).map((l) => ["log", l.date, l.flow ?? "", l.mood, l.energy, l.pain, l.sleepHours, l.symptoms.join("; "), l.medications.join("; "), l.hydrationGlasses, l.exerciseMinutes, l.notes, l.stress, l.temperatureC, l.weightKg, l.discharge, l.intimacy === undefined ? "" : l.intimacy ? "yes" : "no"]),
    ];
    downloadText("cycle-report.csv", rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), "text/csv");
    toast.info("Report exported. The file is not encrypted; keep it somewhere safe.");
  };

  const empty = data.periods.length === 0 && Object.keys(data.logs).length === 0;
  const lengths = cycleLengths(view.periods);
  const s = view.allSummary;

  return (
    <div>
      <PageHeader
        title="Insights" description="Patterns from your own records. Nothing here is invented, and gaps are shown as gaps."
        actions={<div className="flex flex-wrap items-center gap-2">
          <Segmented label="Date range" value={range} options={RANGES} onChange={setRange} />
          {!empty && <Button size="sm" variant="soft" onClick={exportCsv}><Download className="size-4" />Export CSV</Button>}
        </div>}
      />
      <StorageBanner />

      {empty ? (
        <EmptyState icon={<LineIcon className="size-5" />} title="Insights will grow with your records">
          Add period dates in the calendar and a few daily logs. Charts appear as soon as there is something real to show.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Average cycle" value={s.averageLengthDays ? `${s.averageLengthDays} days` : "-"} hint={s.recordedCycles ? `${s.recordedCycles} recorded cycle${s.recordedCycles === 1 ? "" : "s"}` : "Needs two period starts"} />
            <Stat label="Variability" value={s.stdDevDays !== null ? `±${s.stdDevDays} days` : "-"} hint={s.shortestDays !== null ? `Range ${s.shortestDays}-${s.longestDays} days` : "Needs three period starts"} />
            <Stat label="Average period" value={s.averagePeriodDays ? `${s.averagePeriodDays} days` : "-"} hint="From periods with an end date" />
            <Stat label="Data quality" value={QUALITY[view.quality].label} hint={QUALITY[view.quality].note} />
          </div>
          {s.irregular && <p role="note" className="t-body rounded-xl border border-line bg-surface px-4 py-3 text-ink">Your recorded cycle lengths vary quite a lot. That is only an observation about your entries; it is not a diagnosis. If you are worried, speak to a healthcare professional.</p>}

          <Card>
            <CardTitle>Cycle length history</CardTitle>
            {view.cycles.length === 0 ? <p className="t-body py-6 text-center text-muted">{lengths.length ? "No cycles started in this date range." : "Record at least two period starts to see cycle lengths."}</p> : (
              <>
                <BarChart data={view.cycles.map((c) => ({ label: c.label, value: c.value }))} unit="days" reference={s.averageLengthDays ? { value: s.averageLengthDays, label: `average ${s.averageLengthDays}` } : undefined}
                  summary={`Cycle lengths: ${view.cycles.map((c) => `${c.label} ${c.value} days`).join(", ")}.`} />
                <Explain>A cycle is the number of days from the first day of one recorded period to the first day of the next. The average uses all recorded cycles; the dashed line marks it.</Explain>
              </>
            )}
          </Card>

          <Card>
            <CardTitle>Period duration history</CardTitle>
            {view.durations.length === 0 ? <p className="t-body py-6 text-center text-muted">Add an end date to a period to see how long it lasted.</p> : (
              <>
                <BarChart data={view.durations.map((c) => ({ label: c.label, value: c.value }))} unit="days" summary={`Period durations: ${view.durations.map((c) => `${c.label} ${c.value} days`).join(", ")}.`} />
                <Explain>Duration counts both the first and last day of bleeding (inclusive). Periods without an end date are left out.</Explain>
              </>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <ValueChart field="mood" logs={view.logs} />
            <ValueChart field="energy" logs={view.logs} />
            <ValueChart field="pain" logs={view.logs} />
            <ValueChart field="sleepHours" logs={view.logs} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle>Symptom frequency</CardTitle>
              {view.symptoms.length === 0 ? <p className="t-body py-6 text-center text-muted">No symptoms logged in this range.</p> : (
                <ul className="mt-3 space-y-2.5">
                  {view.symptoms.slice(0, 8).map((f) => (
                    <li key={f.symptom}>
                      <div className="t-body flex justify-between gap-3"><span className="capitalize text-ink">{f.symptom}</span><span className="t-small tabular-nums text-muted">{f.days} of {view.logs.length} logged days ({Math.round(f.share * 100)}%)</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-alt" aria-hidden><div className="h-full rounded-full bg-accent" style={{ width: `${f.share * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
              <Explain>Shares are calculated over the days you actually logged, not over every calendar day, so skipped days do not lower them.</Explain>
            </Card>
            <Card>
              <CardTitle>Flow levels</CardTitle>
              {Object.values(view.flow).every((n) => n === 0) ? <p className="t-body py-6 text-center text-muted">No flow recorded in this range.</p> : (
                <ul className="mt-3 space-y-2.5">
                  {(Object.entries(view.flow) as [string, number][]).map(([k, n]) => {
                    const total = Object.values(view.flow).reduce((a, b) => a + b, 0);
                    return (
                      <li key={k}>
                        <div className="t-body flex justify-between"><span className="capitalize text-ink">{k}</span><span className="t-small tabular-nums text-muted">{n} day{n === 1 ? "" : "s"}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-surface-alt" aria-hidden><div className="h-full rounded-full bg-accent-2" style={{ width: `${(n / total) * 100}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Logging consistency" value={`${Math.round(view.stats.consistency * 100)}%`} hint={`${view.stats.loggedDays} of ${view.stats.rangeDays} days logged`} />
            <Stat label="Current streak" value={`${view.stats.currentStreak} day${view.stats.currentStreak === 1 ? "" : "s"}`} hint="Consecutive logged days" />
            <Stat label="Longest streak" value={`${view.stats.longestStreak} day${view.stats.longestStreak === 1 ? "" : "s"}`} hint="Within this range" />
          </div>

          <Card>
            <CardTitle>Cycle length trend</CardTitle>
            {view.trend.change === null ? <p className="t-body py-4 text-muted">A trend needs at least {view.trend.window * 2} recorded cycles (two groups of {view.trend.window}); fewer would be guesswork.</p> : (
              <p className="t-body mt-2 text-ink">Your latest {view.trend.window} cycles averaged <strong className="font-semibold">{view.trend.recent} days</strong>, compared with <strong className="font-semibold">{view.trend.previous} days</strong> for the {view.trend.window} before. {view.trend.change === 0 ? "No change." : `That is ${Math.abs(view.trend.change)} day${Math.abs(view.trend.change) === 1 ? "" : "s"} ${view.trend.change > 0 ? "longer" : "shorter"}.`}</p>
            )}
            <Explain>Simple comparison of two averages of recorded cycle lengths. It describes your entries and says nothing about causes or health.</Explain>
          </Card>

          <Card>
            <CardTitle>By day of cycle</CardTitle>
            {view.stages.every((s) => s.n === 0) ? <p className="t-body py-4 text-muted">Log mood, energy or pain after recording a period start to compare across your cycle.</p> : (
              <div className="mt-3 overflow-x-auto">
                <table className="t-body w-full text-left">
                  <caption className="sr-only">Average mood, energy and pain by day of the recorded cycle</caption>
                  <thead><tr className="t-label text-muted"><th scope="col" className="py-2 pr-4 font-medium">Stage</th><th scope="col" className="px-2 font-medium">Logged days</th><th scope="col" className="px-2 font-medium">Mood</th><th scope="col" className="px-2 font-medium">Energy</th><th scope="col" className="px-2 font-medium">Pain (0-4)</th></tr></thead>
                  <tbody>
                    {view.stages.map((s) => (
                      <tr key={s.id} className="border-t border-line text-ink">
                        <th scope="row" className="py-2 pr-4 font-medium">{s.label}</th>
                        <td className="px-2 tabular-nums">{s.n}</td>
                        <td className="px-2 tabular-nums">{s.n >= MIN_SAMPLES ? (s.mood ?? "-") : "-"}</td>
                        <td className="px-2 tabular-nums">{s.n >= MIN_SAMPLES ? (s.energy ?? "-") : "-"}</td>
                        <td className="px-2 tabular-nums">{s.n >= MIN_SAMPLES ? (s.pain ?? "-") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Explain>{`Days are counted from the start of each recorded period. Averages appear only for stages with at least ${MIN_SAMPLES} logged days. This describes your own entries; it is not a prediction of hormonal phases.`}</Explain>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle>Symptoms across the cycle</CardTitle>
              {view.stageSymptoms.length === 0 ? <p className="t-body py-4 text-muted">No symptoms logged since your first recorded period.</p> : (
                <ul className="mt-3 space-y-3">
                  {view.stageSymptoms.map((s) => (
                    <li key={s.symptom}>
                      <div className="t-body capitalize text-ink">{s.symptom}</div>
                      <div className="mt-1 flex gap-1.5" role="img" aria-label={`${s.symptom}: ${STAGES.map((st, i) => `${st.label} ${s.counts[i]} days`).join(", ")}`}>
                        {STAGES.map((st, i) => (
                          <div key={st.id} className="flex-1 text-center">
                            <div className="grid h-7 place-items-center rounded-md bg-accent-soft t-small tabular-nums text-ink" style={{ opacity: s.counts[i] === 0 ? 0.35 : 0.5 + Math.min(0.5, s.counts[i] / Math.max(...s.counts) / 2) }}>{s.counts[i]}</div>
                            <div className="t-small mt-0.5 text-muted">{st.label.replace("Days ", "").replace("Day ", "")}</div>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardTitle>Mood by weekday</CardTitle>
              {view.weekday.every((w) => w.n === 0) ? <p className="t-body py-4 text-muted">Log mood on a few different days to see a weekly pattern.</p> : (
                <BarChart
                  data={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => ({ label, value: view.weekday[i].value ?? 0 }))} unit="out of 5" height={150}
                  summary={`Average mood by weekday: ${view.weekday.map((w, i) => `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]} ${w.value ?? "not logged"} (${w.n} days)`).join(", ")}.`}
                />
              )}
            </Card>
          </div>

          <Card>
            <CardTitle>Sleep and mood</CardTitle>
            {!view.sleepMood.enough ? <p className="t-body py-4 text-muted">Log both sleep and mood on at least {MIN_SAMPLES} days with {view.sleepMood.threshold}+ hours and {MIN_SAMPLES} days with less to compare them.</p> : (
              <p className="t-body mt-2 text-ink">On days with {view.sleepMood.threshold} or more hours of sleep ({view.sleepMood.better.n} days) your average mood was <strong className="font-semibold">{view.sleepMood.better.mood}</strong>, versus <strong className="font-semibold">{view.sleepMood.worse.mood}</strong> on days with less ({view.sleepMood.worse.n} days).</p>
            )}
            <Explain>A plain comparison of two groups of days you logged. Many things affect both sleep and mood, so this shows a coincidence in your records, not a cause.</Explain>
          </Card>

          <Card>
            <CardTitle>Monthly summaries</CardTitle>
            {view.months.length === 0 ? <p className="t-body py-6 text-center text-muted">Logged days will be summarised by month here.</p> : (
              <div className="mt-3 overflow-x-auto">
                <table className="t-body w-full text-left">
                  <caption className="sr-only">Monthly averages of logged values</caption>
                  <thead><tr className="t-label text-muted"><th scope="col" className="py-2 pr-4 font-medium">Month</th><th scope="col" className="px-2 font-medium">Logged days</th><th scope="col" className="px-2 font-medium">Flow days</th><th scope="col" className="px-2 font-medium">Mood</th><th scope="col" className="px-2 font-medium">Energy</th><th scope="col" className="px-2 font-medium">Pain</th><th scope="col" className="px-2 font-medium">Sleep (h)</th></tr></thead>
                  <tbody>
                    {view.months.map((m) => (
                      <tr key={m.month} className="border-t border-line text-ink">
                        <th scope="row" className="py-2 pr-4 font-medium">{parseIso(`${m.month}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</th>
                        <td className="px-2 tabular-nums">{m.loggedDays}</td><td className="px-2 tabular-nums">{m.flowDays}</td>
                        <td className="px-2 tabular-nums">{m.averageMood ?? "-"}</td><td className="px-2 tabular-nums">{m.averageEnergy ?? "-"}</td><td className="px-2 tabular-nums">{m.averagePain ?? "-"}</td><td className="px-2 tabular-nums">{m.averageSleep ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <h2 className="font-display t-title pt-2 text-ink">Everything you record</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle>Recording coverage</CardTitle>
              <p className="t-small mb-3 mt-1 text-muted">The last 12 weeks, one square per day.</p>
              <CoverageGrid days={view.cover} />
              <Explain>Each square is one day. Its darkness shows how many different things (flow, mood, sleep, symptoms, notes and so on) you recorded that day. Empty squares are days with nothing recorded.</Explain>
            </Card>
            <Card>
              <CardTitle>What you record most</CardTitle>
              {view.logs.length === 0 ? <p className="t-body py-4 text-muted">Log a few days to see which things you record most often.</p> : (
                <ul className="mt-3 space-y-2">
                  {view.usage.filter((u) => u.days > 0).slice(0, 8).map((u) => (
                    <li key={u.field}>
                      <div className="t-body flex justify-between gap-3"><span className="text-ink">{USAGE_LABEL[u.field]}</span><span className="t-small tabular-nums text-muted">{u.days} of {view.logs.length} days ({Math.round(u.share * 100)}%)</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-alt" aria-hidden><div className="h-full rounded-full bg-accent" style={{ width: `${u.share * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
              <Explain>For each kind of entry, on how many of the days you logged in this range it appears.</Explain>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {(["stress", "temperatureC", "weightKg"] as NumericField[]).map((f) => {
              const series = fieldSeries(view.logs, f);
              if (series.length === 0) return null;
              const meta = FIELD_META[f];
              const [lo, hi] = f === "stress" ? [meta.min, meta.max] : paddedRange(series.map((p) => p.value), [meta.min, meta.max]);
              const avg = average(series.map((p) => p.value));
              return (
                <Card key={f}>
                  <div className="mb-2 flex items-baseline justify-between gap-3"><CardTitle>{meta.title}</CardTitle><span className="t-small text-muted">{series.length} logged day{series.length === 1 ? "" : "s"} · average {avg}</span></div>
                  <LineChart data={series.map((p) => ({ label: fmtShort(p.date), value: p.value }))} yMin={lo} yMax={hi} unit={meta.unit}
                    summary={`${meta.title} over ${series.length} logged days, average ${avg} (${meta.unit}).`} />
                </Card>
              );
            })}
          </div>
          {fieldSeries(view.logs, "stress").length + fieldSeries(view.logs, "temperatureC").length + fieldSeries(view.logs, "weightKg").length === 0 && (
            <p className="t-small text-muted">Stress, temperature and weight charts appear here once you record them in the Daily Log.</p>
          )}

          <Card>
            <CardTitle>Things that move together</CardTitle>
            {view.rel.every((r) => !r.enough) ? <p className="t-body py-4 text-muted">When two things have been logged on at least {MIN_CORRELATION_SAMPLES} of the same days, you will see here whether they tended to rise and fall together.</p> : (
              <ul className="mt-3 space-y-2.5">
                {view.rel.filter((r) => r.enough).map((r) => (
                  <li key={`${r.a}-${r.b}`} className="t-body text-ink">
                    <span className="capitalize">{FIELD_LABEL[r.a]}</span> and {FIELD_LABEL[r.b]}:{" "}
                    <strong className="font-semibold">{r.strength === "none" ? "no clear link" : `${r.strength} ${r.r! > 0 ? "tendency to rise together" : "tendency to move in opposite directions"}`}</strong>
                    <span className="t-small ml-2 tabular-nums text-muted">r = {r.r} · {r.n} days</span>
                  </li>
                ))}
              </ul>
            )}
            <Explain>{`This is the Pearson correlation of the days that have both values (at least ${MIN_CORRELATION_SAMPLES} days). It describes how your entries line up, nothing more: it cannot show that one thing causes another, and a few unusual days can change it a lot.`}</Explain>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle>Symptoms that appear together</CardTitle>
              {view.pairs.length === 0 ? <p className="t-body py-4 text-muted">Pairs of symptoms logged together on at least {MIN_SAMPLES} days will be listed here.</p> : (
                <ul className="mt-3 space-y-2">
                  {view.pairs.map((p) => <li key={`${p.a}-${p.b}`} className="t-body flex justify-between gap-3 text-ink"><span className="capitalize">{p.a} + {p.b}</span><span className="t-small tabular-nums text-muted">{p.days} days</span></li>)}
                </ul>
              )}
            </Card>
            <Card>
              <CardTitle>Last 30 days compared with the 30 before</CardTitle>
              {view.changes.every((c) => c.change === null) ? <p className="t-body py-4 text-muted">Needs at least {MIN_SAMPLES} logged values in each 30-day window.</p> : (
                <ul className="mt-3 space-y-2">
                  {view.changes.filter((c) => c.change !== null).map((c) => (
                    <li key={c.field} className="t-body flex justify-between gap-3 text-ink">
                      <span>{FIELD_META[c.field].title}</span>
                      <span className="t-small tabular-nums text-muted">{c.previous} → {c.recent} {FIELD_META[c.field].unit.startsWith("0") || FIELD_META[c.field].unit.startsWith("1") || FIELD_META[c.field].unit.startsWith("out") ? "" : FIELD_META[c.field].unit} ({c.change! > 0 ? "+" : ""}{c.change})</span>
                    </li>
                  ))}
                </ul>
              )}
              <Explain>Average of what you logged in the last 30 days versus the 30 days before. Windows with fewer than 3 logged values are left out.</Explain>
            </Card>
          </div>

          {view.tempDays.length >= 5 && (
            <Card>
              <CardTitle>Temperature across the cycle</CardTitle>
              <LineChart
                data={view.tempDays.map((d) => ({ label: `Day ${d.day}`, value: d.value }))}
                yMin={paddedRange(view.tempDays.map((d) => d.value), [35, 39])[0]} yMax={paddedRange(view.tempDays.map((d) => d.value), [35, 39])[1]} unit="°C"
                summary={`Average temperature by cycle day: ${view.tempDays.map((d) => `day ${d.day} ${d.value} °C (${d.n} logs)`).join(", ")}.`}
              />
              <Explain>Average of the temperatures you logged on each day since a recorded period start. It only shows your entries. It is not an ovulation or fertility detector and must not be used to avoid or plan pregnancy.</Explain>
            </Card>
          )}
          <EstimateDisclaimer />
        </div>
      )}
    </div>
  );
}
