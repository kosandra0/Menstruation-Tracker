import { describe, expect, it } from "vitest";
import { HOVER_GRACE_MS, advanceLifetime, pointerLeft, startLifetime } from "./popupLifetime";

/** Runs the clock in steps of `stepMs` for `totalMs`, with the pointer state given by `hovered(t)`. */
function run(start: ReturnType<typeof startLifetime>, totalMs: number, stepMs: number, hovered: (t: number) => boolean) {
  let life = start;
  let t = 0;
  while (t < totalMs) {
    t += stepMs;
    const r = advanceLifetime(life, stepMs, hovered(t));
    life = r.lifetime;
    if (r.expired) return { expiredAt: t, life };
  }
  return { expiredAt: null as number | null, life };
}

describe("popup lifetime", () => {
  it("fades after its duration when the pointer is away", () => {
    const r = run(startLifetime(8), 60_000, 100, () => false);
    expect(r.expiredAt).toBe(8000);
  });

  it("does not fade while the pointer rests on it, but the hard limit still fades it", () => {
    // 8 s duration: the hard limit is 16 s, so a resting pointer cannot keep it past 16 s.
    const r = run(startLifetime(8), 120_000, 100, () => true);
    expect(r.expiredAt).toBe(16_000);
  });

  it("never stays forever, even if the pointer never leaves", () => {
    for (const dur of [3, 8, 30]) {
      const r = run(startLifetime(dur), 10 * 60_000, 100, () => true);
      expect(r.expiredAt).not.toBeNull();
      expect(r.expiredAt).toBeLessThanOrEqual(dur * 2 * 1000);
    }
  });

  it("gives at least the hover grace after the pointer leaves", () => {
    // Leaves at 7.5 s with 0.5 s of automatic time left: it must still stay the full grace period.
    let life = startLifetime(8);
    life = advanceLifetime(life, 7500, false).lifetime;
    life = pointerLeft(life);
    expect(life.autoLeftMs).toBe(HOVER_GRACE_MS);
    const r = run(life, 60_000, 100, () => false);
    expect(r.expiredAt).toBe(HOVER_GRACE_MS);
  });

  it("time spent under the pointer does not use up the automatic timer", () => {
    // Hover for 5 s, leave: the full 8 s automatic time is still available (the 16 s ceiling is the only cap).
    let life = startLifetime(8);
    life = advanceLifetime(life, 5000, true).lifetime;
    life = pointerLeft(life);
    expect(life.autoLeftMs).toBe(8000);
    expect(life.ceilingLeftMs).toBe(11_000);
    const r = run(life, 60_000, 100, () => false);
    expect(r.expiredAt).toBe(8000);
  });

  it("a long hover followed by leaving fades at the hard limit, not after another full duration", () => {
    let life = startLifetime(8);
    life = advanceLifetime(life, 15_000, true).lifetime; // 1 s of ceiling left
    life = pointerLeft(life);
    const r = run(life, 60_000, 100, () => false);
    expect(r.expiredAt).toBe(1000);
  });
});
