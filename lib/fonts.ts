import localFont from "next/font/local";

// AFF's openly licensed Parkinsans, bundled locally for reliable offline builds.
// Access Bank's proprietary Effra font is not redistributed.
const parkinsans = localFont({
  src: [
    {path: "../public/fonts/Parkinsans-0.ttf", weight: "400", style: "normal"},
    {path: "../public/fonts/Parkinsans-1.ttf", weight: "500", style: "normal"},
    {path: "../public/fonts/Parkinsans-2.ttf", weight: "600", style: "normal"},
    {path: "../public/fonts/Parkinsans-3.ttf", weight: "700", style: "normal"},
  ],
  display: "swap",
  variable: "--font-parkinsans",
});
export const typeset = parkinsans.variable;
