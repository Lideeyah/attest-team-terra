"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FIELD_COPY } from "@/lib/copy/field";
import { useOnline, useQueue } from "@/lib/field/useQueue";

const TABS = [
  { href: "/field", label: "Today" },
  { href: "/field/enrol", label: "Enrol" },
  { href: "/field/queue", label: "Queue" },
  { href: "/field/me", label: "Me" },
];

type FieldShellProps = {
  children: ReactNode;
};

/** The field app shell: a bottom tab bar at 390px with a persistent offline
    indicator and pending-sync count. Built mobile-first and held to a phone
    width on a larger screen rather than laid out for the desktop. */
export function FieldShell({ children }: FieldShellProps) {
  const pathname = usePathname();
  /* Both read the device rather than the server: the indicator has to be true
     with no connection, which is when it matters. */
  const online = useOnline();
  const { queue } = useQueue();
  const pendingSync = queue.length;

  return (
    <div className="field-frame">
      <div className="field-shell">
        <header className="field-status" data-connection={online ? "online" : "offline"}>
          <span className="field-status-label">
            {online ? FIELD_COPY.online : FIELD_COPY.offline}
          </span>
          <span className="field-status-label" data-pending={pendingSync}>
            {FIELD_COPY.pending(pendingSync)}
          </span>
        </header>
        <main className="field-main">{children}</main>
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
                /* The four screens are prefetched while there is a
                   connection, because the next thing an agent taps is one of
                   them and the tap may happen with no signal at all. */
                prefetch
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
                {tab.href === "/field/queue" && pendingSync > 0 ? (
                  <span className="field-tab-count"> {pendingSync}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
