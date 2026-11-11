import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { MastheadShell } from "@/components/shells/MastheadShell";
import { requireRole } from "@/lib/api/access";
import { LiveOperations } from "@/components/ops/LiveOperations";

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
      <RouteTransition>{process.env.ATTEST_API_MODE==='live'?<LiveOperations admin/>:children}</RouteTransition>
    </MastheadShell>
    </Surface>
  );
}
