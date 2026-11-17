import { useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { makeRevealVariants } from "../../lib/motion";
import { useAppearance } from "../../stores/appearance";

/** Gentle entrance animation for cards. Honors reduced motion via MotionConfig and the user's motion intensity. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const intensity = useAppearance((s) => s.motionIntensity);
  const variants = useMemo(() => makeRevealVariants(intensity), [intensity]);
  return (
    <motion.div className={className} variants={variants} custom={delay} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}
