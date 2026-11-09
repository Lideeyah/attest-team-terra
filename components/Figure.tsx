"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { tallyTo } from "@/lib/motion";

type FigureProps = {
  /** The eyebrow label above the figure. */
  label: string;
  /** The figure itself, already formatted. */
  value: string;
  /** The unit, set inside the figure at 0.6em. */
  unit?: string;
  /** The denominator. A figure is never shown without one. */
  denominator: string;
  /** Count to this number on first entry into view. The formatted value is
      what renders until the count begins and after it ends, so the figure is
      never wrong — a reader without JavaScript sees the real number. */
  tally?: number;
  /** Formats each intermediate count. Defaults to a plain thousands group. */
  format?: (value: number) => string;
};

export function Figure({
  label,
  value,
  unit,
  denominator,
  tally,
  format,
}: FigureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion() ?? false;
  const [counting, setCounting] = useState<string | null>(null);

  useEffect(() => {
    if (tally === undefined || !inView || reduced) {
      return;
    }
    const render = format ?? ((count: number) => count.toLocaleString("en-NG"));
    return tallyTo(tally, (count) => {
      setCounting(count === tally ? null : render(count));
    });
  }, [inView, tally, reduced, format]);

  return (
    <div className="figure" ref={ref}>
      <p className="eyebrow">{label}</p>
      <p className="figure-value">
        {counting ?? value}
        {unit ? <span className="figure-unit">{unit}</span> : null}
      </p>
      <p className="figure-denominator">{denominator}</p>
    </div>
  );
}
