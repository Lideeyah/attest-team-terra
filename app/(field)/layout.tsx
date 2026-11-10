import type { Metadata } from "next";
import { PlainSurface } from "@/components/Surface";
import { token } from "@/lib/tokens";
import { FieldShell } from "@/components/shells/FieldShell";
import { ServiceWorker } from "@/components/field/ServiceWorker";

export const metadata: Metadata = {
  manifest: "/field/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Attest", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  /* An agent outdoors pinches to read a number. Locking that out would be
     the wrong trade for a product used in sunlight. */
  maximumScale: 5,
  themeColor: token("--bottle-deep", "rgb(30 58 46)"),
};

/* No route transition on this surface. The foundation scopes transitions per
   surface, and the field app is held to 150KB of JavaScript on a phone on 3G:
   a shared-axis transition is not what that budget is for. */
export default function FieldLayout({ children }: LayoutProps<"/">) {
  return (
    <PlainSurface>
      <FieldShell>{children}</FieldShell>
      <ServiceWorker />
    </PlainSurface>
  );
}
