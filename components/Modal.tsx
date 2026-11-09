"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { modalIn, scrimIn } from "@/lib/motion";

type ModalProps = {
  open: boolean;
  title: string;
  /** A modal holding unsaved input does not close on escape or scrim click. */
  holdsUnsavedInput?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** The decision itself. One primary action. */
  footer?: ReactNode;
};

/** A modal centres at 520px for decisions. */
export function Modal({
  open,
  title,
  holdsUnsavedInput = false,
  onClose,
  children,
  footer,
}: ModalProps) {
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
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={modalIn}
            initial="rest"
            animate="shown"
            exit="gone"
          >
            <header className="modal-head">
              <h2 className="h3-display">{title}</h2>
              <button type="button" className="btn-quiet btn-sm" onClick={onClose}>
                Close
              </button>
            </header>
            <div className="modal-body">{children}</div>
            {footer ? <div className="modal-foot">{footer}</div> : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
