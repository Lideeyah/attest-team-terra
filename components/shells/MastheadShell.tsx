"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Lockup } from "@/components/Mark";
import { SessionAccount } from "./SessionAccount";

export type MastheadSection = { href: string; label: string };

type MastheadShellProps = {
  children: ReactNode;
  /** Names the surface, e.g. "Verifier portal" or "Bank operations". */
  surface: string;
  sections: MastheadSection[];
  /** Shown at the right of the masthead, in record face. */
  context?: string;
  account?: { organisation: string; email: string };
};

/** The read-oriented shell shared by the verifier portal, bank operations and
    platform admin. Full width, because these surfaces are tables. */
export function MastheadShell({
  children,
  surface,
  sections,
  context,
  account = {
    organisation: "Lagos Climate Finance",
    email: "desk@lagosclimatefinance.ng",
  },
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
            <span className="masthead-account">
              {context ? <span className="record-cell">{context}</span> : null}
              {process.env.NEXT_PUBLIC_ATTEST_API_MODE==='live'?<SessionAccount/>:<><span className="eyebrow">{account.organisation}</span><span className="record-cell console-account">{account.email}</span></>}
              <form action="/signout" method="post">
                <button type="submit" className="btn-quiet btn-sm">
                  Sign out
                </button>
              </form>
            </span>
          </div>
        </div>
      </header>
      <div className="measure">
        <nav className="tab-rail" aria-label={surface}>
          {sections.map((section) => {
            const active =
              pathname === section.href ||
              (section.href !== sections[0]?.href && pathname.startsWith(`${section.href}/`));
            return (
              <Link
                key={section.href}
                href={section.href}
                className="tab"
                prefetch={false}
                aria-current={active ? "page" : undefined}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="measure section-tight masthead-content">{children}</div>
    </div>
  );
}
