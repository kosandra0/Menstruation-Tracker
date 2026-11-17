import type { Transition, Variants } from "motion/react";

/**
 * Centralised motion language: short, soft ease-out; never bouncy, never an endless loop.
 * Durations mirror the CSS tokens (--dur-fast/base/slow). Reduced motion is enforced globally by MotionConfig + CSS.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = { fast: 0.14, base: 0.24, slow: 0.42 } as const;

export const softTransition: Transition = { duration: 0.35, ease: EASE };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };

/** Vertical travel in px; "gentle" intensity halves it. */
export const travel = (intensity: "gentle" | "standard") => (intensity === "gentle" ? 5 : 10);

export function makePageVariants(intensity: "gentle" | "standard" = "standard"): Variants {
  const y = travel(intensity);
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
  };
}

export function makeRevealVariants(intensity: "gentle" | "standard" = "standard"): Variants {
  const y = travel(intensity) + 4;
  return {
    hidden: { opacity: 0, y },
    visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay } }),
  };
}

export const pageVariants = makePageVariants("standard");
export const revealVariants = makeRevealVariants("standard");

/** Presets for common surfaces. */
export const presets = {
  modal: { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 }, transition: { duration: DURATION.base, ease: EASE } },
  dropdown: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: DURATION.fast, ease: EASE } },
  hoverLift: { whileHover: { y: -2 }, transition: { duration: DURATION.fast, ease: EASE } },
} as const;
