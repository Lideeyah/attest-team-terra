import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { MastheadShell } from "@/components/shells/MastheadShell";

const SECTIONS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/onboarding", label: "Onboarding" },
  { href: "/admin/registry", label: "Registry sync" },
  { href: "/admin/extraction", label: "Extraction review" },
  { href: "/admin/escalations", label: "Escalations" },
  { href: "/admin/chain", label: "Chain integrity" },
];

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
    <MastheadShell surface="Platform admin" sections={SECTIONS}>
      <RouteTransition>{children}</RouteTransition>
    </MastheadShell>
    </Surface>
  );
}
