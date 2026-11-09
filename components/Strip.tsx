import type { ReactNode } from "react";
import { PRIMITIVE_CLASS } from "@/lib/motion";

type StripProps = {
  /** Omit for a neutral row. */
  state?: "flagged" | "blocked" | "review";
  /** A transfer genuinely in flight carries the one permitted loop. */
  inFlight?: boolean;
  children: ReactNode;
};

/** A row with a 3px left edge carrying its state, keeping its paper fill so a
    table of thirty rows still scans as a table rather than a stack of alerts. */
export function Strip({ state, inFlight = false, children }: StripProps) {
  return (
    <div>
      <div className={["strip", state ? `strip-${state}` : null].filter(Boolean).join(" ")}>
        {children}
      </div>
      {inFlight ? <span className={`queue-underline ${PRIMITIVE_CLASS.queuePulse}`} /> : null}
    </div>
  );
}
