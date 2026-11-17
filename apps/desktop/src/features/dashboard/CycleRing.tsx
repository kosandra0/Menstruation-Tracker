/**
 * Cycle progress ring built from the user's own data: `day` is the recorded cycle day, `typical` the average
 * recorded cycle length. The arc is progress through a typical cycle, not a prediction of any phase.
 */
export function CycleRing({ day, typical }: { day: number; typical: number | null }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const progress = typical ? Math.min(1, day / typical) : 0;
  const overdue = typical !== null && day > typical;
  return (
    <div
      className="relative size-48 shrink-0"
      role="img"
      aria-label={typical ? `Cycle day ${day}, a typical recorded cycle is ${Math.round(typical)} days` : `Cycle day ${day}`}
    >
      <svg viewBox="0 0 180 180" className="size-full -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--c-surface-alt)" strokeWidth="12" />
        {typical && (
          <circle
            cx="90" cy="90" r={r} fill="none" stroke="var(--c-accent)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${Math.max(progress * c, 0.1)} ${c}`}
            style={{ transition: "stroke-dasharray 0.8s var(--ease-out)" }}
          />
        )}
        {typical && !overdue && (
          <circle cx={90 + r * Math.cos(progress * 2 * Math.PI)} cy={90 + r * Math.sin(progress * 2 * Math.PI)} r="8" fill="var(--c-surface)" stroke="var(--c-accent)" strokeWidth="3" />
        )}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="t-label text-muted">Day</div>
        <div className="font-display text-5xl leading-none text-ink">{day}</div>
        {typical && <div className="t-small mt-1 text-muted">of about {Math.round(typical)}</div>}
      </div>
    </div>
  );
}
