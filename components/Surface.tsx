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
