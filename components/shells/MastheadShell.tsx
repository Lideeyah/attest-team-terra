"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Lockup } from "@/components/Mark";

export type MastheadSection = { href: string; label: string };

type MastheadShellProps = {
  children: ReactNode;
  /** Names the surface, e.g. "Verifier portal" or "Bank operations". */
  surface: string;
  sections: MastheadSection[];
  /** Shown at the right of the masthead, in record face. */
  context?: string;
};

/** The read-oriented shell shared by the verifier portal, bank operations and
    platform admin. Full width, because these surfaces are tables. */
export function MastheadShell({
  children,
  surface,
  sections,
  context,
}: MastheadShellProps) {
  const pathname = usePathname();

  return (
    <div>
      <header className="masthead">
        <div className="measure">
          <div className="row-between masthead-row">
            <div className="row">
              <Lockup size={18} />
              <span className="eyebrow">{surface}</span>
            </div>
            {context ? <span className="record-cell">{context}</span> : null}
          </div>
        </div>
      </header>
      <div className="measure">
        <nav className="tab-rail" aria-label={surface}>
          {sections.map((section) => {
            const active =
              pathname === section.href || pathname.startsWith(`${section.href}/`);
            return (
              <Link
                key={section.href}
                href={section.href}
                className="tab"
                aria-current={active ? "page" : undefined}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="measure section-tight">{children}</div>
    </div>
  );
}
