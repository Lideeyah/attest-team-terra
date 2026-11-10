import localFont from "next/font/local";
import { Courier_Prime, Inter_Tight, Newsreader } from "next/font/google";

/* The three faces, loaded once and applied per surface rather than on the
   document. The participant receipt is built for a cheap phone on an
   intermittent connection and carries no web font at all, which is only
   possible if the fonts are not attached to the root. */

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
   display face degrades to a real typeface rather than a system sans. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
  variable: "--font-inter-tight",
});

export const typeset = `${cabinetGrotesk.variable} ${newsreader.variable} ${courierPrime.variable} ${interTight.variable}`;
