import type { ReactNode } from "react";
import { MotionProvider } from "@/components/MotionProvider";
import { ToastProvider } from "@/components/Toast";
import { typeset } from "@/lib/fonts";

/* Everything an Attest surface carries: the three faces, the one place
   reduced motion is honoured, and the toast stack. A surface that must stay
   small does not use it. */
export function Surface({ children }: { children: ReactNode }) {
  return (
    <div className={typeset}>
      <MotionProvider>
        <ToastProvider>{children}</ToastProvider>
      </MotionProvider>
    </div>
  );
}

/* The field app's surface: the three faces and nothing else.

   It carries no motion provider and no toast stack, because the animation
   library is about a hundred kilobytes and this surface is held to a hundred
   and fifty on a phone on 3G. The motion the field app does have is CSS —
   the same primitives, declared the same way — and CSS costs nothing to
   parse on a phone that is already rendering. */
export function PlainSurface({ children }: { children: ReactNode }) {
  return <div className={typeset}>{children}</div>;
}
