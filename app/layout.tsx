import type { Metadata } from "next";
import "./globals.css";
import {RequestFeedback} from "@/components/RequestFeedback";

/* The document carries nothing but the page. The faces, the motion provider,
   the toast stack and the route transition are all applied per surface in
   each group's own layout, because the participant receipt must carry none of
   them: it is built for a cheap phone on an intermittent connection, and
   anything attached here would be attached there. */

const DESCRIPTION =
  "Attest moves carbon revenue to households through the bank and emits a record of what was paid, what was not, and against which agreement.";

export const metadata: Metadata = {
  title: {
    default: "Attest · a settlement record for carbon project payments",
    template: "%s · Attest",
  },
  description: DESCRIPTION,
  metadataBase: new URL(process.env.ATTEST_PUBLIC_URL ?? "https://attest.ng"),
  openGraph: {
    title: "Attest · a settlement record for carbon project payments",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Attest",
    description: DESCRIPTION,
    images: ["/og.svg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><RequestFeedback/>{children}</body>
    </html>
  );
}
