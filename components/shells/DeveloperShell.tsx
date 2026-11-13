"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Lockup } from "@/components/Mark";
import {WorkspaceMenu} from './WorkspaceMenu';
import {SessionAccount} from './SessionAccount';
import {SignOut} from '@/components/auth/SignOut';

type Section = {
  href: string;
  label: string;
  /** Unresolved work behind this section. Record face, dim, never the accent:
      the accent means an action and a count is not one. */
  outstanding?: number;
  outstandingLabel?: string;
  /** Work that is blocking the next payment takes the mark as well. */
  blocking?: boolean;
};

const SECTIONS: Section[] = [
 {href:'/app',label:'Overview'}, {href:'/app/wallet',label:'Wallet'},
 {href:'/app/runs',label:'Distributions'}, {href:'/app/map',label:'Project map'},
 {href:'/app/roster',label:'Participants'}, {href:'/app/agents',label:'Field officers'},
 {href:'/app/automation',label:'Payment rules'}, {href:'/app/documents',label:'Agreement & documents'},
 {href:'/app/messages',label:'Messages'}, {href:'/app/ledger',label:'Funds history'},
 {href:'/app/disputes',label:'Disputes'}, {href:'/app/attestations',label:'Payment reports'},
 {href:'/app/settings',label:'Settings'},
];

type DeveloperShellProps = {
  children: ReactNode;
  /** What is outstanding behind each section, keyed by its path. */
  outstanding?: Record<string, { count: number; label?: string; blocking?: boolean }>;
  account?: { organisation: string; email: string };
  /** The open period and the days remaining, shown on every screen. */
  period?: {
    label: string;
    daysToClose: number;
    closesOn: string;
    state?: "open" | "closed";
  };
};

/** The developer console shell: a 240px left rail with a persistent period
    indicator. This is a desktop product for the people who use it daily, so
    the rail does not collapse above 900px. */
export function DeveloperShell({
  children,
  outstanding = {},
  account = {
    organisation: "Ekuri Initiative Limited",
    email: "operations@ekuri-initiative.ng",
  },
}: DeveloperShellProps) {
  const pathname = usePathname();

  return (
    <div className="console-shell">
      <nav className="console-rail" aria-label="Developer console">
        <div className="console-rail-head">
          <Lockup size={17} />
        </div>
        <WorkspaceMenu current={SECTIONS.find(section=>section.href==='/app'?pathname==='/app':pathname.startsWith(section.href))?.label??'Workspace'}>
        <ul className="console-nav">
          {SECTIONS.map((section) => {
            const active =
              section.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(section.href);
            const work = outstanding[section.href];
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
                  <span className="console-nav-label">{section.label}</span>
                  {work && work.count > 0 ? (
                    <span className="console-nav-count">
                      {work.blocking ? (
                        <span className="mark console-nav-mark" aria-hidden="true" />
                      ) : null}
                      {work.count}
                      {work.label ? ` ${work.label}` : ""}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="console-rail-foot">
          <p className="eyebrow">{account.organisation}</p>
          {account.email?<p className="record-cell console-account">{account.email}</p>:<SessionAccount/>}
          <SignOut/>
        </div>
        </WorkspaceMenu>
      </nav>
      <div className="console-main">{children}</div>
    </div>
  );
}
