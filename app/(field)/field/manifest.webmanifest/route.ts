/* The field app's manifest, served from the app rather than from a static
   file so the start URL and the icons stay in one place with the routes they
   name. An agent installs this to the home screen and opens it like any other
   app on the phone. */

import { token } from "@/lib/tokens";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    name: "Attest Field",
    short_name: "Attest",
    description:
      "Enrol households and capture evidence offline. Enrolments wait on the phone and sync when there is a connection.",
    start_url: "/field",
    scope: "/field",
    display: "standalone",
    orientation: "portrait",
    background_color: token("--canvas-paper", "rgb(247 244 235)"),
    theme_color: token("--bottle-deep", "rgb(30 58 46)"),
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  });
}
