import { motion } from "motion/react";
import { cn } from "@mt/ui";
import { useAppearance } from "../../stores/appearance";
import { EASE } from "../../lib/motion";

const SCORE_COLOR = ["#6a7a8c", "#7b7fa8", "#4f8f9b", "#c0647f", "#d9923b"]; // low -> bright

/**
 * Rounded progress bar driven by the user's "Mood bar" appearance settings. The numeric value is always printed
 * so meaning never depends on colour alone.
 */
export function MoodBar({ label, value, max = 5, valueText, className }: { label: string; value: number | undefined; max?: number; valueText?: string; className?: string }) {
  const s = useAppearance((a) => a.moodBars);
  const has = typeof value === "number";
  const pct = has ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  const color = s.colorSource === "mood" && has ? SCORE_COLOR[Math.min(4, Math.max(0, Math.round((value / max) * 4)))] : "var(--c-accent)";
  const height = s.style === "line" ? Math.min(3, s.height) : s.style === "compact" ? Math.min(6, s.height) : s.height;
  const radius = s.style === "pill" ? 999 : s.radius;
  const fill = s.style === "gradient" ? `linear-gradient(90deg, ${color}, var(--c-accent-2))` : color;
  const text = valueText ?? (has ? `${value} of ${max}` : "Not logged");

  return (
    <div className={cn(s.style === "compact" ? "flex items-center gap-3" : "space-y-1.5", className)}>
      <div className={cn("flex items-baseline justify-between gap-2", s.style === "compact" && "w-40 shrink-0")}>
        <span className="t-small text-muted">{label}</span>
        <span className="t-small tabular-nums text-ink">{text}</span>
      </div>
      <div
        role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={has ? value : undefined} aria-valuetext={text}
        className={cn("overflow-hidden bg-surface-alt", s.style === "compact" && "flex-1")}
        style={{ height, borderRadius: radius }}
      >
        <motion.div
          initial={s.animate ? { width: 0 } : false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: s.animate ? 0.6 : 0, ease: EASE }}
          className="h-full"
          style={{ background: fill, opacity: s.opacity, borderRadius: radius }}
        />
      </div>
    </div>
  );
}
