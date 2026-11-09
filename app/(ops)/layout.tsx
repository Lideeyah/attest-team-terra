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
    <MastheadShell surface="Bank operations" sections={SECTIONS}>
      {children}
    </MastheadShell>
  );
}
