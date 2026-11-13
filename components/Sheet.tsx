"use client";

import { useRef, type ReactNode } from "react";
import {useDialogFocus} from './useDialogFocus';
import {OverlayPortal} from "./OverlayPortal";
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
  const panel=useRef<HTMLElement>(null);
  useDialogFocus(open,panel,onClose,holdsUnsavedInput);

  return (
    <OverlayPortal><AnimatePresence>
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
            ref={panel}
            tabIndex={-1}
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
    </AnimatePresence></OverlayPortal>
  );
}
