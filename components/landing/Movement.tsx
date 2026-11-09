"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
  /* Progress is measured across the pin, not across the whole travel: zero
     when the composition reaches the top of the screen and one when it
     releases. Everything a movement does therefore happens while the reader is
     looking at it, and nothing plays below the fold or sits frozen afterwards. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const progress = useTransform(scrollYProgress, [0.04, 0.92], [0, 1], {
    clamp: true,
  });

  useMotionValueEvent(progress, "change", (value) => {
    if (value >= 0.95 && ref.current) {
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

/** True once the movement's progress passes a mark. A primitive that records
    something permanent fires here and is not taken back on the way up; one
    that counts rows follows the scroll in both directions. */
export function useCrossed(
  progress: MotionValue<number>,
  mark: number,
  options: { once?: boolean } = {},
): boolean {
  const reduced = useReducedMotion();
  const once = options.once ?? true;
  const [crossed, setCrossed] = useState(reduced === true);

  useMotionValueEvent(progress, "change", (value) => {
    if (reduced) {
      return;
    }
    if (value >= mark) {
      setCrossed(true);
    } else if (!once) {
      setCrossed(false);
    }
  });

  return crossed;
}

/** How many of a list have arrived at this point in the movement. Scroll
    position drives the count, so scrolling up removes rows. */
export function useArrivedCount(
  progress: MotionValue<number>,
  total: number,
  range: [number, number],
): number {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced === true ? total : 0);

  useMotionValueEvent(progress, "change", (value) => {
    if (reduced) {
      return;
    }
    const span = range[1] - range[0];
    const ratio = Math.min(1, Math.max(0, (value - range[0]) / span));
    setCount(Math.round(ratio * total));
  });

  return count;
}

const NARROW = "(max-width: 720px)";

function subscribeToWidth(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The phone layout, so a composition can show the rows that fit rather than
    a column taller than the screen. */
export function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

export { motion };
