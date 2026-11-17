import type { HTMLAttributes } from "react";
import { cn } from "@mt/ui";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface p-5 shadow-soft", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-[15px] font-semibold tracking-tight text-ink", className)} {...props} />;
}
