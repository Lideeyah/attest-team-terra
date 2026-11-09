"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/* Reduced motion is honoured once, here, so no component has to think about
   it. Motion's own reducedMotion setting only suppresses transform and layout
   animation, so the whole transition is collapsed as well: under
   prefers-reduced-motion every animation lands at its resting state, which is
   what foundation 2.7 requires. */

const COLLAPSED_SECONDS = 0.000001;

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <MotionConfig
      reducedMotion="user"
      transition={reduced ? { duration: COLLAPSED_SECONDS } : undefined}
    >
      {children}
    </MotionConfig>
  );
}
