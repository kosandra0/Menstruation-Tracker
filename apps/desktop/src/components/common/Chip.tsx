import type { ButtonHTMLAttributes } from "react";
import { cn } from "@mt/ui";

export function Chip({ selected, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13px] transition-all duration-200",
        selected
          ? "border-transparent bg-accent text-accent-contrast shadow-soft"
          : "border-line bg-surface text-muted hover:border-accent/40 hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}
