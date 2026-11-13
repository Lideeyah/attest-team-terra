"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {OverlayPortal} from "./OverlayPortal";
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
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  /* Read through refs by the keydown handler, so the focus effect below
     depends on `open` alone. Its first version depended on `onClose` and
     `holdsUnsavedInput` too — an inline arrow and a value that flips on the
     first keystroke — so it tore down and re-ran on every parent render,
     yanking the focus back to the Close button after each character typed. */
  const closing = useRef(onClose);
  const holding = useRef(holdsUnsavedInput);
  useEffect(() => {
    closing.current = onClose;
    holding.current = holdsUnsavedInput;
  });

  /* aria-modal tells a screen reader this is a dialog; it does not stop the
     tab key walking out of it into the page behind, and it does not move the
     focus in. Without both, a keyboard reader is told a decision is in front
     of them and then tabs through a page they cannot see. So: remember what
     had the focus, move it to the dialog's first field, hold the tab inside,
     and give the focus back on close. Keyed on `open` alone — see above. */
  useEffect(() => {
    if (!open) {
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    if (!panel.current?.contains(active)) {
      returnTo.current = active;
    }
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    /* The first thing to work on, not the Close button in the header: a
       dialog opened to collect a reason should put the caret in the reason. */
    const stops = focusable();
    const first =
      stops.find((stop) => stop.matches("input, select, textarea")) ??
      stops.find((stop) => !stop.matches(".btn-quiet")) ??
      stops[0];
    (first ?? panel.current)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !holding.current) {
        closing.current();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const inside = focusable();
      if (inside.length === 0) {
        event.preventDefault();
        return;
      }
      const edge = event.shiftKey ? inside[0] : inside[inside.length - 1];
      if (document.activeElement === edge || !panel.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? inside[inside.length - 1] : inside[0]).focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      returnTo.current?.focus();
      returnTo.current = null;
    };
  }, [open]);

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
          <div className="modal-position"><motion.div
            className="modal"
            ref={panel}
            tabIndex={-1}
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
          </motion.div></div>
        </>
      ) : null}
    </AnimatePresence></OverlayPortal>
  );
}
