import type { Metadata } from "next";
import { MotionProvider } from "@/components/MotionProvider";
import { ToastProvider } from "@/components/Toast";
import { RouteTransition } from "@/components/RouteTransition";
import "./globals.css";

/* The faces are applied per surface in each group's own layout, not here, so
   the participant receipt can carry none. */

export const metadata: Metadata = {
  title: "Attest — a settlement record for carbon project payments",
  description:
    "Attest moves carbon revenue to households through the bank and emits a record of what was paid, what was not, and against which commitment.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <MotionProvider>
          <ToastProvider>
            <RouteTransition>{children}</RouteTransition>
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
