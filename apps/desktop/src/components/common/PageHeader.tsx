import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2rem] leading-tight tracking-tight text-ink">{title}</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {actions}
    </header>
  );
}
