"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Lockup } from "@/components/Mark";
import { SessionAccount } from "./SessionAccount";
import {WorkspaceMenu} from './WorkspaceMenu';
import {SignOut} from '@/components/auth/SignOut';

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
    <div className="console-shell">
      <nav className="console-rail" aria-label={surface}>
        <div className="console-rail-head"><Lockup size={18}/><p className="note">{surface}</p></div>
        <WorkspaceMenu current={sections.find(section=>pathname===section.href)?.label??surface}>
          <ul className="console-nav">{sections.map((section,index)=>{
            const active=pathname===section.href||(index>0&&pathname.startsWith(section.href+'/'));
            return <li key={section.href}><Link className="console-nav-link" href={section.href} aria-current={active?'page':undefined}>{section.label}</Link></li>;
          })}</ul>
          <div className="console-rail-foot">{process.env.NEXT_PUBLIC_ATTEST_API_MODE==='live'?<SessionAccount/>:<><p>{account.organisation}</p><p>{account.email}</p></>}<SignOut/></div>
        </WorkspaceMenu>
      </nav>
      <div className="console-main masthead-content">{context?<p className="workspace-context">{context}</p>:null}{children}</div>
    </div>
  );
}
