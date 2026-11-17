/**
 * How long one notification popup stays on screen. Pure rules, so they are tested without a window.
 *
 * - The automatic timer (`durationSec`) runs only while the pointer is away from the popup.
 * - Leaving the popup gives it at least `HOVER_GRACE_MS` more before it fades.
 * - Visible time is also capped at `HARD_LIMIT_FACTOR` times the duration, so a popup under a resting pointer
 *   still fades away and can never stay forever.
 */
export const HOVER_GRACE_MS = 2000;
export const HARD_LIMIT_FACTOR = 2;

export interface Lifetime {
  /** Milliseconds left before the automatic fade (paused while the pointer is on the popup). */
  autoLeftMs: number;
  /** Milliseconds left before the hard limit, counted even while the pointer is on the popup. */
  ceilingLeftMs: number;
}

export function startLifetime(durationSec: number): Lifetime {
  const total = durationSec * 1000;
  return { autoLeftMs: total, ceilingLeftMs: total * HARD_LIMIT_FACTOR };
}

/** Moves the clock forward by `elapsedMs`. `expired` means the popup must fade now. */
export function advanceLifetime(l: Lifetime, elapsedMs: number, hovered: boolean): { lifetime: Lifetime; expired: boolean } {
  const autoLeftMs = hovered ? l.autoLeftMs : l.autoLeftMs - elapsedMs;
  const ceilingLeftMs = l.ceilingLeftMs - elapsedMs;
  return { lifetime: { autoLeftMs, ceilingLeftMs }, expired: autoLeftMs <= 0 || ceilingLeftMs <= 0 };
}

/** The pointer has just left the popup: it keeps at least the hover grace before fading. */
export function pointerLeft(l: Lifetime): Lifetime {
  return { ...l, autoLeftMs: Math.max(l.autoLeftMs, HOVER_GRACE_MS) };
}
