import { typeset } from "@/lib/fonts";
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
    <div className={typeset}>
    <MastheadShell surface="Verifier portal" sections={SECTIONS}>
      {children}
    </MastheadShell>
    </div>
  );
}
