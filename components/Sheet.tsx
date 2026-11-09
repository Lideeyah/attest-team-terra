"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { scrimIn, sheetIn } from "@/lib/motion";

type SheetProps = {
  open: boolean;
  title: string;
  /** A sheet holding unsaved input does not close on escape or scrim click. */
  holdsUnsavedInput?: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** A sheet enters from the right at 480px for detail views. */
export function Sheet({
  open,
  title,
  holdsUnsavedInput = false,
  onClose,
  children,
}: SheetProps) {
  useEffect(() => {
    if (!open || holdsUnsavedInput) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, holdsUnsavedInput, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="scrim"
            variants={scrimIn}
            initial="rest"
            animate="shown"
            exit="gone"
            onClick={holdsUnsavedInput ? undefined : onClose}
          />
          <motion.aside
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={sheetIn}
            initial="rest"
            animate="shown"
            exit="gone"
          >
            <header className="sheet-head">
              <h2 className="h3-display">{title}</h2>
              <button type="button" className="btn-quiet btn-sm" onClick={onClose}>
                Close
              </button>
            </header>
            <div className="sheet-body">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
