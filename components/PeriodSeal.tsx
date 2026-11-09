"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Rule } from "@/components/Rule";
import { Button } from "@/components/Button";
import { DURATION } from "@/lib/motion";

type PeriodSealProps = {
  /** Everything above the seal line. */
  children: ReactNode;
  /** What just became impossible, stated beside the seal. */
  consequence: string;
  /** Rendered already sealed, as a closed period is. */
  sealed?: boolean;
  /** Plays the composite shortly after mount. Used by the motion reference. */
  sealOnMount?: boolean;
  /** Omitted on a period that is already closed. */
  action?: { label: string; onSeal: () => void };
};

/** The composite that closes a period. The heavy rule draws across, then
    everything above it steps back one contrast level without moving and
    without disappearing. Nothing is ever removed. */
export function PeriodSeal({
  children,
  consequence,
  sealed = false,
  sealOnMount = false,
  action,
}: PeriodSealProps) {
  const [isSealed, setIsSealed] = useState(sealed);

  useEffect(() => {
    if (!sealOnMount || isSealed) {
      return;
    }
    const timer = window.setTimeout(() => setIsSealed(true), DURATION.base * 1000);
    return () => window.clearTimeout(timer);
  }, [sealOnMount, isSealed]);

  return (
    <div className="stack-lg">
      <div className="sealed-above" data-sealed={isSealed ? "true" : "false"}>
        {children}
      </div>
      <Rule weight="heavy" animated={isSealed} />
      <div className="row-between">
        <p className="prose-muted">{consequence}</p>
        {action && !isSealed ? (
          <Button
            onClick={() => {
              setIsSealed(true);
              action.onSeal();
            }}
          >
            {action.label}
          </Button>
        ) : (
          <p className="eyebrow">Sealed</p>
        )}
      </div>
    </div>
  );
}
