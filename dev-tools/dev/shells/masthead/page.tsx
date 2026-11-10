import { typeset } from "@/lib/fonts";
import { MastheadShell } from "@/components/shells/MastheadShell";
import { Rule } from "@/components/Rule";

const SECTIONS = [
  { href: "/verifier", label: "Home" },
  { href: "/verifier/projects", label: "Projects" },
  { href: "/verifier/compare", label: "Compare" },
  { href: "/verifier/export", label: "Export" },
  { href: "/verifier/alerts", label: "Alerts" },
];

export default function MastheadShellPreview() {
  return (
    <div className={typeset}>
    <MastheadShell
      surface="Verifier portal"
      sections={SECTIONS}
      context="4 projects watched"
    >
      <div className="stack-lg">
        <p className="eyebrow">Shell reference</p>
        <h1 className="h2-display">Masthead shell</h1>
        <Rule weight="heavy" />
        <p className="prose-muted">
          The verifier portal, bank operations and platform admin share this
          shell. It is read-oriented, so it takes the full measure for tables.
        </p>
      </div>
    </MastheadShell>
    </div>
  );
}
