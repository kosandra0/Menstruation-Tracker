import type { ButtonHTMLAttributes } from "react";
import { cn } from "@mt/ui";

type Variant = "primary" | "soft" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-accent-gradient text-accent-contrast shadow-soft hover:brightness-105 active:brightness-95",
  soft: "bg-accent-soft text-ink hover:bg-accent-soft/70",
  ghost: "text-muted hover:bg-surface-alt hover:text-ink",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
