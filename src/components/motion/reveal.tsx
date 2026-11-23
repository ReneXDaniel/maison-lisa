"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Soft editorial reveal when an element scrolls into view (disabled for reduced motion). */
export function Reveal({ children, delay = 0, className, y = 28 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10% 0px" }} transition={{ duration: 1.1, delay, ease: [0.22, 0.61, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
