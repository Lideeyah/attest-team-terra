import type { Metadata } from "next";
import localFont from "next/font/local";
import { Courier_Prime, Inter_Tight, Newsreader } from "next/font/google";
import { MotionProvider } from "@/components/MotionProvider";
import { ToastProvider } from "@/components/Toast";
import { RouteTransition } from "@/components/RouteTransition";
import "./globals.css";

/* Cabinet Grotesk is self-hosted at weight 800, so the display face does not
   depend on a third-party host at run time. */
const cabinetGrotesk = localFont({
  src: "../public/fonts/CabinetGrotesk-Extrabold.woff2",
  weight: "800",
  style: "normal",
  display: "swap",
  variable: "--font-cabinet",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-courier-prime",
  /* Courier Prime has no naira sign, and next/font's own metric-adjusted
     fallback is a proportional face, so every amount would break out of the
     record face at its first character. These fallbacks are monospaced and
     carry the glyph. */
  adjustFontFallback: false,
  fallback: ["Menlo", "Consolas", "DejaVu Sans Mono", "Courier New", "monospace"],
});

/* The declared fallback for the display face, loaded so that a missing
   display font degrades to a real typeface rather than a system default. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "Attest — a settlement record for carbon project payments",
  description:
    "Attest moves carbon revenue to households through the bank and emits a record of what was paid, what was not, and against which commitment.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cabinetGrotesk.variable} ${newsreader.variable} ${courierPrime.variable} ${interTight.variable}`}
    >
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
