"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import type { MotionValue } from "motion/react";

/* One movement of the landing composition. It reports its own progress and
   marks itself resolved once it has played, so the sequence can be read from
   the page rather than inferred from a scroll position. */

type MovementProps = {
  name: string;
  children: (progress: MotionValue<number>) => ReactNode;
  /** A movement that does not pin, used by the stillness movement. */
  still?: boolean;
};

export function Movement({ name, children, still = false }: MovementProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  /* The movement's own progress: zero as it arrives, one as it leaves. */
  const progress = useTransform(scrollYProgress, [0.15, 0.75], [0, 1], {
    clamp: true,
  });

  useMotionValueEvent(progress, "change", (value) => {
    if (value >= 0.98 && ref.current) {
      ref.current.setAttribute("data-resolved", "true");
    }
  });

  /* Under reduced motion the movement renders at its resting state, which is
     its resolved state. The six compositions still read as a sequence. */
  useEffect(() => {
    if ((reduced || still) && ref.current) {
      ref.current.setAttribute("data-resolved", "true");
    }
  }, [reduced, still]);

  return (
    <section
      ref={ref}
      data-movement={name}
      data-resolved="false"
      className={still ? "movement movement-still" : "movement"}
    >
      <div className="movement-pinned">
        <div className="measure">{children(progress)}</div>
      </div>
    </section>
  );
}

/** Writes a motion value into a node's text without re-rendering React. */
export function useTextFromMotion(
  value: MotionValue<number>,
  format: (input: number) => string,
) {
  const ref = useRef<HTMLSpanElement>(null);
  useMotionValueEvent(value, "change", (next) => {
    if (ref.current) {
      ref.current.textContent = format(next);
    }
  });
  return ref;
}

export { motion };

/** A value driven by a movement's progress, or its resting value when the
    reader has asked for reduced motion. */
export function useReveal(
  progress: MotionValue<number>,
  range: [number, number],
  output: [number, number],
): MotionValue<number> {
  const reduced = useReducedMotion();
  const driven = useTransform(progress, range, output, { clamp: true });
  const resting = useMotionValue(output[1]);
  return reduced ? resting : driven;
}
