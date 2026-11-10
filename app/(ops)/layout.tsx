import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { MastheadShell } from "@/components/shells/MastheadShell";

const SECTIONS = [
  { href: "/ops", label: "Home" },
  { href: "/ops/signals", label: "Signals" },
  { href: "/ops/cases", label: "Cases" },
  { href: "/ops/exceptions", label: "Exceptions" },
  { href: "/ops/reconciliation", label: "Reconciliation" },
];

export default function OpsLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
    <MastheadShell
      account={{ organisation: "Access Bank, operations", email: "ops.desk@accessbank.ng" }}
      surface="Bank operations" sections={SECTIONS}>
      <RouteTransition>{children}</RouteTransition>
    </MastheadShell>
    </Surface>
  );
}
