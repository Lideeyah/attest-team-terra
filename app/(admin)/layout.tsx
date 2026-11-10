import { typeset } from "@/lib/fonts";
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
    <div className={typeset}>
    <MastheadShell surface="Platform admin" sections={SECTIONS}>
      {children}
    </MastheadShell>
    </div>
  );
}
