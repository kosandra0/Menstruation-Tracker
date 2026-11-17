import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUp, BookOpen, CalendarDays, Eye, EyeOff, LineChart, PenLine, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { cn } from "@mt/ui";
import {
  cycleDay, dataQuality, estimateNextPeriodStart, lastNDays, logsInRange, summarize, symptomFrequency, todayIso,
} from "@mt/domain";
import { Card, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Reveal } from "../../components/common/Reveal";
import { EmptyState, EstimateDisclaimer, Skeleton, StorageBanner } from "../../components/common/feedback";
import { MoodBar } from "../../components/common/MoodBar";
import { CycleRing } from "./CycleRing";
import { useRecords } from "../../stores/records";
import { DASHBOARD_CARDS, useAppearance, type VisualMood } from "../../stores/appearance";
import { MOODS } from "../../lib/palette";
import { fmtLong, fmtMedium, fmtShort, greeting } from "../../lib/format";
import { useToday } from "../../hooks/useToday";
import { ClockSlot } from "../clock/ClockWidget";

const CARD_TITLES: Record<string, string> = {
  cycle: "Cycle overview", estimate: "Looking ahead", checkin: "Today's check-in", mood: "How should today feel?",
  symptoms: "Recent symptoms", journal: "Recent journal", insights: "Insights at a glance",
};

const QUALITY_TEXT = {
  none: "No cycles recorded yet", limited: "Limited history", fair: "Fair history", good: "Good history",
} as const;

function useDashboardData() {
  const data = useRecords((s) => s.data);
  const today = useToday();
  return useMemo(() => {
    const summary = summarize(data.periods);
    return {
      today,
      summary,
      estimate: estimateNextPeriodStart(data.periods),
      day: cycleDay(data.periods, today),
      quality: dataQuality(data.periods),
      todayLog: data.logs[today],
      recentLogs: logsInRange(data.logs, lastNDays(today, 7)),
      journal: [...data.journal].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3),
      lastPeriod: [...data.periods].sort((a, b) => (a.start < b.start ? 1 : -1))[0],
    };
  }, [data, today]);
}

function CycleCard({ d }: { d: ReturnType<typeof useDashboardData> }) {
  if (!d.lastPeriod) {
    return (
      <EmptyState icon={<CalendarDays className="size-5" />} title="Your cycle starts here" action={<Link to="/calendar"><Button size="sm">Record a period</Button></Link>}>
        When you record the first day of a period, your cycle day and history appear here. You decide what to add.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-7">
      {d.day !== null && <CycleRing day={d.day} typical={d.summary.averageLengthDays} />}
      <dl className="t-body grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-3">
        <div><dt className="t-label text-muted">Last period began</dt><dd className="mt-1 text-ink">{fmtMedium(d.lastPeriod.start)}</dd></div>
        <div><dt className="t-label text-muted">Recorded cycles</dt><dd className="mt-1 text-ink">{d.summary.recordedCycles}</dd></div>
        <div><dt className="t-label text-muted">Average cycle</dt><dd className="mt-1 text-ink">{d.summary.averageLengthDays ? `${d.summary.averageLengthDays} days` : "Needs one more period"}</dd></div>
        <div><dt className="t-label text-muted">Average period</dt><dd className="mt-1 text-ink">{d.summary.averagePeriodDays ? `${d.summary.averagePeriodDays} days` : "Add an end date"}</dd></div>
      </dl>
    </div>
  );
}

function EstimateCard({ d }: { d: ReturnType<typeof useDashboardData> }) {
  if (!d.estimate) {
    return <p className="t-body leading-relaxed text-muted">An estimate for your next period appears after you have recorded the start of at least two periods. Until then nothing is guessed.</p>;
  }
  const e = d.estimate;
  return (
    <div className="space-y-3">
      <div>
        <div className="t-label text-muted">Estimated start</div>
        <div className="font-display text-[1.7rem] leading-tight text-ink">{fmtShort(e.value)}</div>
        <div className="t-body text-muted">Likely between {fmtShort(e.range.earliest)} and {fmtShort(e.range.latest)}</div>
      </div>
      <p className="t-small leading-relaxed text-muted">{e.uncertaintyNote}</p>
      <EstimateDisclaimer />
    </div>
  );
}

function CheckinCard({ d }: { d: ReturnType<typeof useDashboardData> }) {
  const log = d.todayLog;
  const logged = log && (log.mood || log.energy || log.flow || log.symptoms.length || log.notes);
  return (
    <div className="space-y-4">
      {logged ? (
        <div className="space-y-3">
          <MoodBar label="Mood" value={log!.mood} />
          <MoodBar label="Energy" value={log!.energy} />
        </div>
      ) : (
        <p className="t-body leading-relaxed text-muted">Nothing logged today. A short note about how you feel helps patterns appear over time, and every field is optional.</p>
      )}
      <Link to="/log"><Button size="sm" variant={logged ? "soft" : "primary"}><PenLine className="size-4" />{logged ? "Edit today's log" : "Start today's log"}</Button></Link>
    </div>
  );
}

function VisualMoodCard() {
  const today = todayIso();
  const visual = useAppearance((s) => s.visualMood);
  const adaptive = useAppearance((s) => s.moodBars.adaptive);
  const set = useAppearance((s) => s.set);
  const active = visual && visual.date === today ? visual.mood : null;
  const choose = (mood: VisualMood) => set("visualMood", active === mood ? null : { date: today, mood });
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Today's visual mood" className="flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.id} type="button" aria-pressed={active === m.id} onClick={() => choose(m.id)} title={m.hint}
            className={cn("t-small flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors", active === m.id ? "border-transparent bg-accent-soft text-ink" : "border-line text-muted hover:text-ink")}
          >
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>
      <p className="t-small leading-relaxed text-muted">
        {adaptive ? "The interface gently takes on this mood's accent today." : "This only changes how the app looks and is turned off by default."}{" "}
        It is never saved as a health record. <Link className="underline underline-offset-2 hover:text-ink" to="/settings#personalization">Personalise</Link>
      </p>
    </div>
  );
}

function SymptomsCard({ d }: { d: ReturnType<typeof useDashboardData> }) {
  const freq = symptomFrequency(d.recentLogs).slice(0, 4);
  if (!freq.length) return <p className="t-body leading-relaxed text-muted">No symptoms logged in the last 7 days.</p>;
  return (
    <ul className="space-y-2">
      {freq.map((f) => (
        <li key={f.symptom} className="t-body flex items-center justify-between gap-3">
          <span className="capitalize text-ink">{f.symptom}</span>
          <span className="t-small text-muted">{f.days} of {d.recentLogs.length} logged days</span>
        </li>
      ))}
    </ul>
  );
}

function JournalCard({ d }: { d: ReturnType<typeof useDashboardData> }) {
  if (!d.journal.length) {
    return <div className="space-y-3"><p className="t-body leading-relaxed text-muted">Your private notes will appear here.</p><Link to="/journal"><Button size="sm" variant="soft"><BookOpen className="size-4" />Write a note</Button></Link></div>;
  }
  return (
    <ul className="space-y-2.5">
      {d.journal.map((j) => (
        <li key={j.id}>
          <Link to="/journal" className="t-body block truncate text-ink hover:text-accent">{j.title || "Untitled note"}</Link>
          <span className="t-small text-muted">{fmtShort(j.date)}</span>
        </li>
      ))}
    </ul>
  );
}

function InsightsCard({ d }: { d: ReturnType<typeof useDashboardData> }) {
  return (
    <div className="space-y-3">
      <div className="t-body flex items-center justify-between gap-3">
        <span className="text-muted">Data quality</span>
        <span className="text-ink">{QUALITY_TEXT[d.quality]}</span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < ({ none: 0, limited: 1, fair: 2, good: 3 }[d.quality]) ? "bg-accent" : "bg-surface-alt")} />)}
      </div>
      {d.summary.irregular && <p className="t-small text-warning">Your recorded cycles vary quite a bit, so estimates are rough. This is not a diagnosis.</p>}
      <Link to="/insights"><Button size="sm" variant="soft"><LineChart className="size-4" />Open insights</Button></Link>
    </div>
  );
}

export function DashboardPage() {
  const d = useDashboardData();
  const loadStatus = useRecords((s) => s.loadStatus);
  const layout = useAppearance((s) => s.dashboard);
  const userName = useAppearance((s) => s.userName);
  const set = useAppearance((s) => s.set);
  const resetGroup = useAppearance((s) => s.resetGroup);
  const [editing, setEditing] = useState(false);

  const renderers: Record<string, () => ReactNode> = {
    cycle: () => <CycleCard d={d} />,
    estimate: () => <EstimateCard d={d} />,
    checkin: () => <CheckinCard d={d} />,
    mood: () => <VisualMoodCard />,
    symptoms: () => <SymptomsCard d={d} />,
    journal: () => <JournalCard d={d} />,
    insights: () => <InsightsCard d={d} />,
  };
  const wide = new Set(["cycle"]);

  const move = (id: string, delta: -1 | 1) => {
    const order = [...layout.order];
    const i = order.indexOf(id), j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set("dashboard", { ...layout, order });
  };
  const toggleHidden = (id: string) =>
    set("dashboard", { ...layout, hidden: layout.hidden.includes(id) ? layout.hidden.filter((x) => x !== id) : [...layout.hidden, id] });

  const visible = layout.order.filter((id) => editing || !layout.hidden.includes(id));

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 basis-80">
          <p className="t-label text-muted">{fmtLong(d.today)}</p>
          <h1 className="font-display t-heading mt-1 tracking-tight text-ink">{greeting()}{userName ? `, ${userName}` : ""}.</h1>
          <p className="t-body mt-1.5 max-w-xl leading-relaxed text-muted">A calm place to understand your patterns and look after yourself. Everything stays on this device.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ClockSlot where="dashboard" className="mr-2" />
          {editing && <Button variant="ghost" size="sm" onClick={() => resetGroup("dashboard")}><RotateCcw className="size-4" />Restore default layout</Button>}
          <Button variant={editing ? "primary" : "soft"} size="sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            <Settings2 className="size-4" />{editing ? "Done" : "Customise"}
          </Button>
        </div>
      </header>

      <StorageBanner />

      {loadStatus === "loading" || loadStatus === "idle" ? (
        <div className="grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading your overview">
          <Skeleton className="h-56 md:col-span-2" /><Skeleton className="h-44" /><Skeleton className="h-44" />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((id, i) => {
            const hidden = layout.hidden.includes(id);
            return (
              <Reveal key={id} delay={i * 0.04} className={cn(wide.has(id) && "md:col-span-2", hidden && "opacity-55")}>
                <Card className="h-full">
                  <div className="mb-3.5 flex items-center justify-between gap-2">
                    <CardTitle>{CARD_TITLES[id]}</CardTitle>
                    {editing && (
                      <div className="flex items-center gap-0.5" role="group" aria-label={`Arrange ${CARD_TITLES[id]}`}>
                        <button type="button" aria-label={`Move ${CARD_TITLES[id]} earlier`} disabled={layout.order.indexOf(id) === 0} onClick={() => move(id, -1)} className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-ink disabled:opacity-30"><ArrowUp className="size-4" /></button>
                        <button type="button" aria-label={`Move ${CARD_TITLES[id]} later`} disabled={layout.order.indexOf(id) === DASHBOARD_CARDS.length - 1} onClick={() => move(id, 1)} className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-ink disabled:opacity-30"><ArrowDown className="size-4" /></button>
                        <button type="button" aria-label={hidden ? `Show ${CARD_TITLES[id]}` : `Hide ${CARD_TITLES[id]}`} onClick={() => toggleHidden(id)} className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-ink">{hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                      </div>
                    )}
                  </div>
                  {renderers[id]?.()}
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/calendar"><Button variant="soft" size="sm"><CalendarDays className="size-4" />Calendar</Button></Link>
        <Link to="/log"><Button variant="soft" size="sm"><PenLine className="size-4" />Daily log</Button></Link>
        <Link to="/journal"><Button variant="soft" size="sm"><BookOpen className="size-4" />Journal</Button></Link>
        <Link to="/insights"><Button variant="soft" size="sm"><Sparkles className="size-4" />View insights</Button></Link>
      </div>
    </div>
  );
}
