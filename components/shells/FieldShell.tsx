"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { href: "/field", label: "Today" },
  { href: "/field/enrol", label: "Enrol" },
  { href: "/field/queue", label: "Queue" },
  { href: "/field/me", label: "Me" },
];

type FieldShellProps = {
  children: ReactNode;
  /** Offline is the normal case, so the indicator is persistent. */
  online?: boolean;
  pendingSync?: number;
};

/** The field app shell: a bottom tab bar at 390px with a persistent offline
    indicator and pending-sync count. Built mobile-first and held to a phone
    width on a larger screen rather than laid out for the desktop. */
export function FieldShell({
  children,
  online = true,
  pendingSync = 0,
}: FieldShellProps) {
  const pathname = usePathname();

  return (
    <div className="field-frame">
      <div className="field-shell">
        <header className="field-status">
          <span className="eyebrow">{online ? "Online" : "Offline"}</span>
          <span className="eyebrow">
            {pendingSync} pending sync
          </span>
        </header>
        <div className="field-main">{children}</div>
        <nav className="field-tabs" aria-label="Field app">
          {TABS.map((tab) => {
            const active =
              tab.href === "/field"
                ? pathname === "/field"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="field-tab"
                prefetch={false}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
                {tab.href === "/field/queue" && pendingSync > 0 ? (
                  <span className="record-cell"> {pendingSync}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
