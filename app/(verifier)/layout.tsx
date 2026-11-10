import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { MastheadShell } from "@/components/shells/MastheadShell";

const SECTIONS = [
  { href: "/verifier", label: "Home" },
  { href: "/verifier/projects", label: "Projects" },
  { href: "/verifier/compare", label: "Compare" },
  { href: "/verifier/export", label: "Export" },
  { href: "/verifier/alerts", label: "Alerts" },
];

export default function VerifierLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
    <MastheadShell surface="Verifier portal" sections={SECTIONS}>
      <RouteTransition>{children}</RouteTransition>
    </MastheadShell>
    </Surface>
  );
}
