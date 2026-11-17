import type { CSSProperties } from "react";
import { paletteToCssVars, type Palette, type ThemeMode } from "@mt/design-tokens";
import { cn } from "@mt/ui";

/**
 * A miniature app drawn with a given palette. Colours are applied as CSS variables on this element only, so it can
 * show any theme without touching the real UI (live previews, image-theme candidates, theme gallery).
 */
export function PalettePreview({ palette, mode, className, label }: { palette: Palette; mode: ThemeMode; className?: string; label?: string }) {
  const vars = paletteToCssVars(palette, mode) as CSSProperties;
  return (
    <div
      role="img" aria-label={label ?? "Colour preview"} style={vars}
      className={cn("overflow-hidden rounded-xl border border-line bg-canvas text-ink", className)}
    >
      <div className="flex h-5 items-center gap-1.5 border-b border-line bg-chrome px-2">
        <span className="size-1.5 rounded-full bg-accent" /><span className="h-1 w-8 rounded-full bg-muted/50" />
      </div>
      <div className="flex gap-2 p-2.5">
        <div className="w-8 space-y-1.5">
          <div className="h-2 rounded bg-accent-soft" /><div className="h-2 rounded bg-surface-alt" /><div className="h-2 rounded bg-surface-alt" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="rounded-lg border border-line bg-surface p-2">
            <div className="h-1.5 w-12 rounded bg-ink" /><div className="mt-1.5 h-1 w-20 rounded bg-muted/70" />
            <div className="mt-2 flex gap-1.5">
              <span className="h-3.5 w-9 rounded-md bg-accent" /><span className="h-3.5 w-7 rounded-md bg-accent-soft" /><span className="size-3.5 rounded-full bg-accent-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
