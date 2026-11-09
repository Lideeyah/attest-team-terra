"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { disclose } from "@/lib/motion";

type DiscloseProps = {
  /** The record leads; the evidence collapses behind this summary. */
  summary: string;
  /** Record-face count or figure shown on the summary row. */
  meta?: string;
  children: ReactNode;
  initiallyOpen?: boolean;
};

export function Disclose({
  summary,
  meta,
  children,
  initiallyOpen = false,
}: DiscloseProps) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div className="panel">
      <button
        type="button"
        className="panel-head"
        style={{ width: "100%", cursor: "pointer" }}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="h3-display">{summary}</span>
        <span className="eyebrow">
          {meta ? `${meta} · ` : ""}
          {open ? "Hide evidence" : "Show evidence"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            variants={disclose}
            initial="rest"
            animate="shown"
            exit="rest"
            style={{ overflow: "hidden" }}
          >
            <div className="panel-body">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
