import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { MastheadShell } from "@/components/shells/MastheadShell";
import { requireRole } from "@/lib/api/access";
import { LiveOperations } from "@/components/ops/LiveOperations";

const SECTIONS = [
  { href: "/ops", label: "Home" },
  { href: "/ops/signals", label: "Signals" },
  { href: "/ops/cases", label: "Cases" },
  { href: "/ops/exceptions", label: "Exceptions" },
  { href: "/ops/reconciliation", label: "Reconciliation" },
];

export default async function OpsLayout({ children }: LayoutProps<"/">) {
  await requireRole(['bank_ops','platform_admin']);
  return (
    <Surface>
    <MastheadShell
      account={{ organisation: "Access Bank, operations", email: "ops.desk@accessbank.ng" }}
      surface="Bank operations" sections={SECTIONS}>
      <RouteTransition>{process.env.ATTEST_API_MODE==='live'?<LiveOperations/>:children}</RouteTransition>
    </MastheadShell>
    </Surface>
  );
}
