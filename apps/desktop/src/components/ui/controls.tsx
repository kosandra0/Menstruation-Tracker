import { useId, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@mt/ui";
import { contrastRatio, isHex, normalizeHex, parseHex, toHex } from "@mt/design-tokens";

/* ---------- Slider ---------- */

export function Slider({
  label, value, min, max, step = 1, onChange, format, className,
}: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
  format?: (v: number) => string; className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <label htmlFor={id} className="t-small w-28 shrink-0 text-muted">{label}</label>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-surface-alt accent-[var(--c-accent)]"
        aria-valuetext={format ? format(value) : String(value)}
      />
      <span className="t-small w-12 shrink-0 text-right tabular-nums text-ink">{format ? format(value) : value}</span>
    </div>
  );
}

/* ---------- Segmented control (radio group) ---------- */

export function Segmented<T extends string | number>({
  label, value, options, onChange, className,
}: {
  label: string; value: T; options: readonly { value: T; label: ReactNode; ariaLabel?: string }[]; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-control border border-line bg-surface-alt p-0.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} aria-label={o.ariaLabel}
          onClick={() => onChange(o.value)}
          className={cn(
            "t-small rounded-[0.6rem] px-3 py-1.5 font-medium transition-colors duration-150",
            o.value === value ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Select ---------- */

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("t-body h-10 rounded-control border border-line bg-surface px-3 text-ink outline-none transition-colors hover:border-accent/40 focus-visible:border-accent", className)}
      {...props}
    />
  );
}

/* ---------- Colour field: swatch + hex + RGB + contrast hint ---------- */

export function ColorField({
  label, value, onChange, onClear, against, showRgb = true, placeholder,
}: {
  label: string;
  /** Hex or undefined (= use theme colour). */
  value: string | undefined;
  onChange: (hex: string) => void;
  onClear?: () => void;
  /** Colour this one is read against; shows the contrast ratio. */
  against?: string;
  showRgb?: boolean;
  /** Theme colour shown when no custom value is set. */
  placeholder: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value ?? placeholder;
  const rgb = parseHex(shown) ?? { r: 0, g: 0, b: 0 };
  const text = draft ?? shown;
  const invalid = draft !== null && !isHex(draft);
  const ratio = against ? contrastRatio(shown, against) : null;

  // Commit while typing only once a full 6-digit colour is present; short forms (#abc) commit on blur.
  const commit = (v: string) => {
    if (/^#?[0-9a-f]{6}$/i.test(v.trim())) {
      setDraft(null);
      onChange(normalizeHex(v, shown));
    } else {
      setDraft(v);
    }
  };
  const onBlur = () => {
    if (draft !== null && isHex(draft)) onChange(normalizeHex(draft, shown));
    setDraft(null);
  };
  const setChannel = (k: "r" | "g" | "b", n: number) => {
    if (Number.isNaN(n)) return;
    onChange(toHex({ ...rgb, [k]: Math.min(255, Math.max(0, Math.round(n))) }));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={id} className="t-small w-28 shrink-0 text-muted">{label}</label>
      <input
        type="color" aria-label={`${label} colour picker`} value={normalizeHex(shown, "#000000")}
        onChange={(e) => { setDraft(null); onChange(e.target.value); }}
        className="size-9 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
      />
      <input
        id={id} type="text" value={text} spellCheck={false} maxLength={7}
        onChange={(e) => commit(e.target.value)} onBlur={onBlur}
        aria-invalid={invalid} aria-describedby={invalid ? `${id}-err` : undefined}
        className={cn("t-body h-9 w-24 rounded-control border bg-surface px-2.5 font-mono uppercase outline-none focus-visible:border-accent", invalid ? "border-danger" : "border-line")}
      />
      {showRgb && (
        <div className="flex items-center gap-1" aria-label={`${label} RGB`}>
          {(["r", "g", "b"] as const).map((k) => (
            <input
              key={k} type="number" min={0} max={255} aria-label={`${label} ${k.toUpperCase()}`} value={rgb[k]}
              onChange={(e) => setChannel(k, e.target.valueAsNumber)}
              className="t-small h-9 w-14 rounded-control border border-line bg-surface px-1.5 text-center tabular-nums outline-none focus-visible:border-accent"
            />
          ))}
        </div>
      )}
      {ratio !== null && (
        <span className={cn("t-small tabular-nums", ratio >= 4.5 ? "text-success" : ratio >= 3 ? "text-warning" : "text-danger")}>
          {ratio.toFixed(1)}:1 {ratio >= 4.5 ? "readable" : ratio >= 3 ? "low contrast" : "hard to read"}
        </span>
      )}
      {value && onClear && (
        <button type="button" onClick={onClear} className="t-small text-muted underline-offset-2 hover:text-ink hover:underline">Use theme colour</button>
      )}
      {invalid && <span id={`${id}-err`} role="alert" className="t-small basis-full pl-[7.75rem] text-danger">Use a hex colour such as #7c5cbf.</span>}
    </div>
  );
}

/* ---------- Setting row ---------- */

export function SettingRow({ title, description, children, stacked }: { title: string; description?: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={cn("flex gap-x-4 gap-y-3 border-b border-line py-4 last:border-b-0", stacked ? "flex-col" : "flex-wrap items-center justify-between")}>
      <div className="min-w-0 max-w-md">
        <div className="t-body font-medium text-ink">{title}</div>
        {description && <p className="t-small mt-0.5 leading-relaxed text-muted">{description}</p>}
      </div>
      <div className={cn(stacked ? "w-full" : "shrink-0")}>{children}</div>
    </div>
  );
}
