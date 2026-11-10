import Link from "next/link";
import { Lockup } from "@/components/Mark";

const SECTIONS = [
  { href: "/register", label: "Register" },
  { href: "/verify", label: "Verify" },
  { href: "/report", label: "Report" },
];

/* The public surfaces carry a masthead with a heavy rule at its base. The
   landing page does not: it is one sentence on paper. */
export function PublicMasthead({ context }: { context?: string }) {
  return (
    <header className="masthead">
      <div className="measure">
        <div className="row-between masthead-row">
          <div className="row" style={{ gap: "var(--section-tight)" }}>
            <Link href="/" className="row" style={{ textDecoration: "none" }}>
              <Lockup size={18} />
            </Link>
            <nav className="row" aria-label="Public register">
              {SECTIONS.map((section) => (
                <Link key={section.href} href={section.href} className="console-nav-link">
                  {section.label}
                </Link>
              ))}
            </nav>
          </div>
          {context ? <span className="record-cell">{context}</span> : null}
        </div>
      </div>
    </header>
  );
}
