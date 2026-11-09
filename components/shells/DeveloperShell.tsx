"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Lockup } from "@/components/Mark";

const SECTIONS = [
  { href: "/app", label: "Home" },
  { href: "/app/roster", label: "Roster" },
  { href: "/app/agents", label: "Agents" },
  { href: "/app/runs", label: "Runs" },
  { href: "/app/funding", label: "Funding" },
  { href: "/app/disputes", label: "Disputes" },
  { href: "/app/attestations", label: "Attestations" },
  { href: "/app/settings", label: "Settings" },
];

type DeveloperShellProps = {
  children: ReactNode;
  /** The open period and the days remaining, shown on every screen. */
  period?: { label: string; daysToClose: number; closesOn: string };
  organisation?: string;
};

/** The developer console shell: a 240px left rail with a persistent period
    indicator. This is a desktop product for the people who use it daily, so
    the rail does not collapse above 900px. */
export function DeveloperShell({
  children,
  period = {
    label: "2026-Q4",
    daysToClose: 9,
    closesOn: "31 December 2026",
  },
  organisation = "Ekuri Forest Initiative",
}: DeveloperShellProps) {
  const pathname = usePathname();

  return (
    <div className="console-shell">
      <nav className="console-rail" aria-label="Developer console">
        <div className="console-rail-head">
          <Lockup size={17} />
        </div>
        <div className="period-indicator">
          <p className="eyebrow">Open period</p>
          <p className="record-cell">{period.label}</p>
          <p className="record-cell">
            {period.daysToClose} days to close · {period.closesOn}
          </p>
        </div>
        <ul className="console-nav">
          {SECTIONS.map((section) => {
            const active =
              section.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(section.href);
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="console-nav-link"
                  /* The sections a later phase builds do not exist yet, and a
                     prefetch of a route that is not there is a 404 in the
                     console rather than a faster navigation. */
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                >
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="console-rail-foot">
          <p className="eyebrow">{organisation}</p>
          <Link href="/signin" className="btn-quiet btn-sm" prefetch={false}>
            Sign out
          </Link>
        </div>
      </nav>
      <div className="console-main">{children}</div>
    </div>
  );
}
