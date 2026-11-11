import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { MastheadShell } from "@/components/shells/MastheadShell";
import { requireRole } from "@/lib/api/access";

const SECTIONS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/onboarding", label: "Onboarding" },
  { href: "/admin/registry", label: "Registry sync" },
  { href: "/admin/extraction", label: "Extraction review" },
  { href: "/admin/escalations", label: "Escalations" },
  { href: "/admin/chain", label: "Chain integrity" },
];

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  await requireRole(['platform_admin']);
  return (
    <Surface>
    <MastheadShell
      account={{ organisation: "Attest, platform", email: "platform@attest.ng" }}
      surface="Platform admin" sections={SECTIONS}>
      <RouteTransition>{children}</RouteTransition>
    </MastheadShell>
    </Surface>
  );
}
