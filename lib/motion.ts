import type { Transition, Variants } from "motion/react";

/* The motion system, as Motion variants. Built once, used everywhere. The
   durations are the 24fps cadence in seconds; the curves are the two
   mechanical ones. Nothing here springs and nothing loops except queuePulse. */

export const FRAME = 1 / 24;

export const FRAME_MS = FRAME * 1000;

export const DURATION = {
  press: FRAME * 3,
  base: FRAME * 5,
  screen: FRAME * 5,
  stamp: FRAME * 8,
  draw: FRAME * 8,
  ink: FRAME * 8,
  resolve: FRAME * 14,
  tally: FRAME * 22,
  pulse: FRAME * 34,
  dwell: FRAME * 96,
} as const;

export const EASE = {
  shutter: [0.05, 0.7, 0.1, 1] as const,
  mechanical: [0.2, 0, 0, 1] as const,
};

export const TRAVEL = {
  nudge: 8,
  row: 12,
  step: 24,
  press: 1.5,
} as const;

const shutter = (duration: number): Transition => ({
  duration,
  ease: EASE.shutter,
});

const mechanical = (duration: number): Transition => ({
  duration,
  ease: EASE.mechanical,
});

/* The primitives that are expressed as CSS keyframes rather than as Motion
   variants carry their class name here, so there is still one module that
   names every primitive and a component never writes a class name of its
   own. The keyframes live in app/styles/motion.css. */
export const PRIMITIVE_CLASS = {
  recordArrive: "anim-record-arrive",
  stampLand: "anim-stamp-land",
  stampLandCentred: "anim-stamp-land-centred",
  ruleDraw: "anim-rule-draw",
  disclose: "anim-disclose",
  sheetIn: "anim-sheet-in",
  tick: "anim-tick",
  queuePulse: "anim-queue-pulse",
  sealedAbove: "sealed-above",
} as const;

/** Button travel on :active. The throw of a physical key. */
export const pressTravel: Variants = {
  rest: { y: 0 },
  pressed: { y: TRAVEL.press, transition: mechanical(DURATION.press) },
};

/** The one permitted loop, for a transfer genuinely in flight. */
export const queuePulse: Variants = {
  rest: { opacity: 0.3 },
  looping: {
    opacity: [0.3, 1, 0.3],
    transition: { duration: DURATION.pulse, ease: EASE.shutter, repeat: Infinity },
  },
};

/* The shutter curve, sampled, so a figure counting to its value and a hash
   resolving both move on the system's own easing rather than on a curve
   restated inside a component. */
function sampleCurve(points: readonly [number, number, number, number], t: number): number {
  const [x1, y1, x2, y2] = points;
  const bezier = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 20; step += 1) {
    const mid = (low + high) / 2;
    if (bezier(x1, x2, mid) < t) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return bezier(y1, y2, (low + high) / 2);
}

type Cancel = () => void;

/** tallyTo — a figure counting to its value on the shutter curve. Runs once;
    under reduced motion it lands on the value immediately. */
export function tallyTo(
  target: number,
  onValue: (value: number) => void,
  options: { reduced?: boolean } = {},
): Cancel {
  if (options.reduced) {
    onValue(target);
    return () => undefined;
  }
  const total = DURATION.tally * 1000;
  const started = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const elapsed = Math.min((now - started) / total, 1);
    onValue(Math.round(sampleCurve(EASE.shutter, elapsed) * target));
    if (elapsed < 1) {
      frame = window.requestAnimationFrame(step);
    }
  };
  frame = window.requestAnimationFrame(step);
  return () => window.cancelAnimationFrame(frame);
}

const SCRAMBLE = "0123456789abcdef";

/** hashResolve — a hash resolving from scramble to final value, character by
    character, left to right, on the mechanical curve. */
export function hashResolve(
  final: string,
  onValue: (value: string) => void,
  options: { reduced?: boolean } = {},
): Cancel {
  if (options.reduced) {
    onValue(final);
    return () => undefined;
  }
  const total = DURATION.resolve * 1000;
  const started = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const elapsed = Math.min((now - started) / total, 1);
    const settled = Math.floor(sampleCurve(EASE.mechanical, elapsed) * final.length);
    let next = final.slice(0, settled);
    for (let index = settled; index < final.length; index += 1) {
      const character = final[index];
      next +=
        character === "…" || character === " "
          ? character
          : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
    }
    onValue(elapsed < 1 ? next : final);
    if (elapsed < 1) {
      frame = window.requestAnimationFrame(step);
    }
  };
  frame = window.requestAnimationFrame(step);
  return () => window.cancelAnimationFrame(frame);
}

/** A row entering a list. Children stagger by one frame. */
export const recordArrive: Variants = {
  rest: { opacity: 0, y: TRAVEL.row },
  shown: {
    opacity: 1,
    y: 0,
    transition: shutter(DURATION.base),
  },
};

export const recordList: Variants = {
  rest: {},
  shown: {
    transition: { staggerChildren: FRAME },
  },
};

/** The signature animation. Two beats: impact, then the ink setting.
    Every keyframe carries the full transform, rotation included. */
export function stampLand(rotateDegrees: number): Variants {
  return {
    rest: {
      opacity: 0,
      scale: 1.28,
      rotate: rotateDegrees,
    },
    shown: {
      /* Frames 0-8 are the impact, frames 8-16 are the ink setting. */
      opacity: [0, 1, 0.82, 1],
      scale: [1.28, 0.97, 1, 1],
      rotate: rotateDegrees,
      transition: {
        duration: DURATION.stamp + DURATION.ink,
        times: [0, 0.3, 0.5, 1],
        /* Beat one is the shutter's impact; beat two, the ink setting, is
           mechanical. */
        ease: [EASE.shutter, EASE.shutter, EASE.mechanical],
      },
    },
  };
}

export const ruleDraw: Variants = {
  rest: { scaleX: 0 },
  shown: { scaleX: 1, transition: mechanical(DURATION.draw) },
};

export const disclose: Variants = {
  rest: { opacity: 0, height: 0 },
  shown: {
    opacity: 1,
    height: "auto",
    transition: shutter(DURATION.base),
  },
};

export const sheetIn: Variants = {
  rest: { x: "100%" },
  shown: { x: 0, transition: shutter(DURATION.screen) },
  gone: { x: "100%", transition: mechanical(DURATION.screen) },
};

export const scrimIn: Variants = {
  rest: { opacity: 0 },
  shown: { opacity: 1, transition: shutter(DURATION.base) },
  gone: { opacity: 0, transition: mechanical(DURATION.base) },
};

export const modalIn: Variants = {
  rest: { opacity: 0, y: TRAVEL.nudge },
  shown: { opacity: 1, y: 0, transition: shutter(DURATION.base) },
  gone: { opacity: 0, transition: mechanical(DURATION.press) },
};

/** Console lines entering the sunken bed, staggered one frame. */
export const tick: Variants = {
  rest: { opacity: 0 },
  shown: { opacity: 1, transition: mechanical(DURATION.press) },
};

/** Shared-axis screen transition. Deeper moves forward; back reverses.
    The incoming side starts at frame 2 of the outgoing. */
export const routeForward: Variants = {
  rest: { opacity: 0, x: TRAVEL.step },
  shown: {
    opacity: 1,
    x: 0,
    transition: { ...shutter(DURATION.screen), delay: FRAME * 2 },
  },
  gone: {
    opacity: 0.6,
    x: -TRAVEL.step,
    transition: mechanical(DURATION.screen),
  },
};

export const routeBack: Variants = {
  rest: { opacity: 0, x: -TRAVEL.step },
  shown: {
    opacity: 1,
    x: 0,
    transition: { ...shutter(DURATION.screen), delay: FRAME * 2 },
  },
  gone: {
    opacity: 0.6,
    x: TRAVEL.step,
    transition: mechanical(DURATION.screen),
  },
};

/** The composite that closes a period: the seal rule draws, then everything
    above it steps back one contrast level without moving. */
export const sealPeriod = {
  rule: ruleDraw,
  above: {
    rest: {},
    shown: {
      transition: { delay: DURATION.draw, duration: DURATION.base },
    },
  } satisfies Variants,
};
