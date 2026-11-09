"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { DURATION, hashResolve } from "@/lib/motion";
import { truncateHash } from "@/lib/record";

type HashProps = {
  /** The full hash. */
  value: string;
  /** Resolve from scramble to final value on mount. */
  resolve?: boolean;
  /** Show the full hash rather than the truncation. */
  full?: boolean;
};

/** A hash with a copy affordance, and an optional resolve from scramble to
    final value, character by character, left to right. The final value is
    what renders on the server and before the animation starts, so the record
    is never blank. */
export function Hash({ value, resolve = false, full = false }: HashProps) {
  const shown = full ? value : truncateHash(value);
  const reduced = useReducedMotion() ?? false;
  const [rendered, setRendered] = useState(shown);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!resolve || reduced) {
      return;
    }
    return hashResolve(shown, setRendered);
  }, [resolve, shown, reduced]);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), DURATION.dwell * 1000);
  };

  return (
    <span className="hash">
      <span>{rendered}</span>
      <button type="button" className="hash-copy" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
