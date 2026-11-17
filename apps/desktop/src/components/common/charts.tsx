import { motion } from "motion/react";
import { EASE } from "../../lib/motion";

export interface Point { label: string; value: number }

const W = 560;

function niceTicks(min: number, max: number): number[] {
  const mid = Math.round(((min + max) / 2) * 10) / 10;
  return [min, mid, max];
}

/** Bar chart (e.g. cycle length per cycle). Always accompanied by a text summary for screen readers. */
export function BarChart({ data, unit, summary, height = 170, reference }: { data: Point[]; unit: string; summary: string; height?: number; reference?: { value: number; label: string } }) {
  const pad = { l: 34, r: 10, t: 12, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.value), reference?.value ?? 0);
  const top = Math.ceil(max / 5) * 5;
  const bw = Math.min(40, (W - pad.l - pad.r) / Math.max(1, data.length) - 8);
  const x = (i: number) => pad.l + ((i + 0.5) * (W - pad.l - pad.r)) / data.length;
  const y = (v: number) => pad.t + (1 - v / top) * (height - pad.t - pad.b);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={summary} className="w-full">
        {niceTicks(0, top).map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" strokeDasharray="3 4" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--c-muted)">{t}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            <motion.rect
              x={x(i) - bw / 2} width={bw} rx={Math.min(8, bw / 3)} fill="var(--c-accent)" fillOpacity={0.9}
              initial={{ y: y(0), height: 0 }} animate={{ y: y(d.value), height: y(0) - y(d.value) }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.03 }}
            >
              <title>{`${d.label}: ${d.value} ${unit}`}</title>
            </motion.rect>
            <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--c-muted)">{d.label}</text>
          </g>
        ))}
        {reference && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--c-accent-2)" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={W - pad.r} y={y(reference.value) - 4} textAnchor="end" fontSize="10" fill="var(--c-muted)">{reference.label}</text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/** Line chart for logged values; days without a value simply have no point (nothing is interpolated into data). */
export function LineChart({ data, yMin, yMax, unit, summary, height = 150 }: { data: Point[]; yMin: number; yMax: number; unit: string; summary: string; height?: number }) {
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const x = (i: number) => (data.length === 1 ? (W + pad.l - pad.r) / 2 : pad.l + (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (height - pad.t - pad.b);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={summary} className="w-full">
        {niceTicks(yMin, yMax).map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" strokeDasharray="3 4" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--c-muted)">{t}</text>
          </g>
        ))}
        {data.length > 1 && (
          <motion.path d={path} fill="none" stroke="var(--c-accent)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
        )}
        {data.map((d, i) => (
          <circle key={`${d.label}-${i}`} cx={x(i)} cy={y(d.value)} r="3.5" fill="var(--c-surface)" stroke="var(--c-accent)" strokeWidth="2">
            <title>{`${d.label}: ${d.value} ${unit}`}</title>
          </circle>
        ))}
        {data.length > 0 && <text x={pad.l} y={height - 8} fontSize="10" fill="var(--c-muted)">{data[0].label}</text>}
        {data.length > 1 && <text x={W - pad.r} y={height - 8} textAnchor="end" fontSize="10" fill="var(--c-muted)">{data[data.length - 1].label}</text>}
      </svg>
    </figure>
  );
}
