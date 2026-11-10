import type { Metadata } from "next";
import "./globals.css";

/* The document carries nothing but the page. The faces, the motion provider,
   the toast stack and the route transition are all applied per surface in
   each group's own layout, because the participant receipt must carry none of
   them: it is built for a cheap phone on an intermittent connection, and
   anything attached here would be attached there. */

export const metadata: Metadata = {
  title: "Attest — a settlement record for carbon project payments",
  description:
    "Attest moves carbon revenue to households through the bank and emits a record of what was paid, what was not, and against which commitment.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
