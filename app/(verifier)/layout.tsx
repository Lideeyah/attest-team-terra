import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { MastheadShell } from "@/components/shells/MastheadShell";
import { requireRole } from "@/lib/api/access";

const SECTIONS = [
  { href: "/verifier", label: "Home" },
  { href: "/verifier/projects", label: "Projects" },
  { href: "/verifier/compare", label: "Compare" },
  { href: "/verifier/export", label: "Export" },
  { href: "/verifier/alerts", label: "Alerts" },
];

export default async function VerifierLayout({ children }: LayoutProps<"/">) {
  await requireRole(['verifier']);
  return (
    <Surface>
    <MastheadShell surface="Verifier portal" sections={SECTIONS}>
      <RouteTransition>{children}</RouteTransition>
    </MastheadShell>
    </Surface>
  );
}
