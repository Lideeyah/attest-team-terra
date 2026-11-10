"use client";

import {
  createContext,
  useContext,
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

/* The landing page is one object through six movements, so the movements share
   one screen rather than each taking a screen of their own. A track of six
   screens of scroll drives a single pinned stage; each movement owns a sixth
   of the track, and its composition enters, holds and leaves in place while
   the next one takes over. The reader is never shown empty paper between two
   of them, because there is no between: there is one stage. */

type StageValue = {
  progress: MotionValue<number>;
  count: number;
};

const StageContext = createContext<StageValue | null>(null);

export function Stage({ count, children }: { count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <StageContext.Provider value={{ progress: scrollYProgress, count }}>
      <div
        className="landing-track"
        ref={ref}
        style={{ height: `${count * 100}vh` }}
      >
        <div className="landing-stage">{children}</div>
      </div>
    </StageContext.Provider>
  );
}

function useStage(): StageValue {
  const stage = useContext(StageContext);
  if (!stage) {
    throw new Error("A movement must be rendered inside the stage");
  }
  return stage;
}

type MovementProps = {
  name: string;
  index: number;
  children: (progress: MotionValue<number>) => ReactNode;
};

/* A movement's own progress runs from the moment it takes the stage to the
   moment it begins to hand it over, so everything it does happens while it is
   the thing on screen. The handover overlaps: the next composition is already
   arriving as this one leaves, so there is never a frame with neither. */
const ENTER = 0.04;
const HANDOVER = 0.12;
/* The short travel the system uses for a screen transition. */
const TRAVEL = 24;

export function Movement({ name, index, children }: MovementProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { progress: track, count } = useStage();

  const span = 1 / count;
  const start = index * span;
  const overlap = HANDOVER * span;
  const last = index === count - 1;

  /* The composition plays from just after it takes the stage until the
     handover begins, so everything completes while it is the thing on
     screen. */
  const played = useTransform(
    track,
    [start + ENTER * span, start + span - overlap],
    [0, 1],
    { clamp: true },
  );

  /* It arrives while the one before it is still leaving, and leaves while the
     next is already arriving, so the screen is never empty between two. The
     first movement is already on the stage and the last one stays on it, so
     each has one fewer point than the movements in between. */
  const marks = [start - overlap, start, start + span - overlap, start + span];
  const fade: { input: number[]; opacity: number[]; travel: number[] } =
    index === 0
      ? { input: [marks[1], marks[2], marks[3]], opacity: [1, 1, 0], travel: [0, 0, -TRAVEL] }
      : last
        ? { input: [marks[0], marks[1], marks[3]], opacity: [0, 1, 1], travel: [TRAVEL, 0, 0] }
        : { input: marks, opacity: [0, 1, 1, 0], travel: [TRAVEL, 0, 0, -TRAVEL] };

  const liveOpacity = useTransform(track, fade.input, fade.opacity);
  const liveY = useTransform(track, fade.input, fade.travel);

  const resting = useMotionValue(1);
  const restingY = useMotionValue(0);

  const opacity = reduced ? resting : liveOpacity;
  const y = reduced ? restingY : liveY;

  useMotionValueEvent(played, "change", (value) => {
    if (value >= 0.9 && ref.current) {
      ref.current.setAttribute("data-resolved", "true");
    }
  });

  useEffect(() => {
    if (reduced && ref.current) {
      ref.current.setAttribute("data-resolved", "true");
    }
  }, [reduced]);

  return (
    <motion.section
      ref={ref}
      data-movement={name}
      data-resolved="false"
      className="movement"
      style={{ opacity, y }}
    >
      <div className="measure">{children(played)}</div>
    </motion.section>
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
