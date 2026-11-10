"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { tallyTo } from "@/lib/motion";
import { formatCoverage } from "@/lib/record";

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
  /** Formats each intermediate count. Defaults to a plain thousands group.
      A server component cannot pass a function across the boundary, so it
      names the formatting instead. */
  format?: (value: number) => string;
  /** How an intermediate count is written: a plain figure, or a share of
      `against`. */
  formatAs?: "count" | "coverage";
  /** The denominator a coverage share is counted against. */
  against?: number;
};

export function Figure({
  label,
  value,
  unit,
  denominator,
  tally,
  format,
  formatAs = "count",
  against,
}: FigureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion() ?? false;
  const [counting, setCounting] = useState<string | null>(null);

  useEffect(() => {
    if (tally === undefined || !inView || reduced) {
      return;
    }
    const render =
      format ??
      (formatAs === "coverage" && against !== undefined
        ? (count: number) => formatCoverage(count, against)
        : (count: number) => count.toLocaleString("en-NG"));
    return tallyTo(tally, (count) => {
      setCounting(count === tally ? null : render(count));
    });
  }, [inView, tally, reduced, format, formatAs, against]);

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
