import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { ResyncRegistry } from "@/components/admin/ReviewDecision";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDateTime } from "@/lib/record";

export const metadata: Metadata = { title: "Registry sync" };

export default async function RegistrySyncPage() {
  await connection();
  const result = await api.registrySync();

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "Sync status could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = result.data;
  const failing = rows.filter((row) => row.state === "failing");
  const stale = rows.filter((row) => row.state === "stale");

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Registry sync</p>
        <h1 className="h2-display">
          {rows.length === 1
            ? `${formatCount(failing.length)} of 1 registry failing`
            : `${formatCount(failing.length)} of ${formatCount(rows.length)} registries failing`}
          {stale.length > 0
            ? `, ${formatCount(stale.length)} read longer ago than the schedule`
            : ""}
        </h1>
        <p className="lede">
          Attest reads each registry&rsquo;s own record of a project and never
          the other way round. A registry that cannot be reached means projects
          entered by hand, and those wait for review rather than publishing.
        </p>
        <Rule weight="heavy" />
      </header>

      {rows.length === 0 ? <EmptyState line="No registry is connected. Nothing can be read against a registry’s own record until one is." /> : null}
      <ul className="stack-lg">
        {rows.map((row) => (
          <li key={row.registry} className="panel stack" data-registry={row.registry}>
            <div className="row-between">
              <div className="stack-tight">
                <p className="eyebrow">{formatCount(row.projects)} projects</p>
                <h2 className="h3-display">{row.registry}</h2>
              </div>
              <p className="record-cell" data-sync-state={row.state}>
                {row.state === "synced"
                  ? `Last read ${formatDateTime(row.lastSyncedAt)}`
                  : row.state === "stale"
                    ? `Last read ${formatDateTime(row.lastSyncedAt)}, longer ago than the daily schedule`
                    : `Failing since ${formatDateTime(row.lastSyncedAt)}`}
              </p>
            </div>
            <Rule />
            {row.state !== "synced" ? (
              /* The thing an operator can do about a registry that is failing
                 or late: ask for a read now rather than waiting for
                 tomorrow's schedule. A screen that shows a failure and offers
                 nothing is a notice board. */
              <ResyncRegistry registry={row.registry} />
            ) : null}
            {row.failures.length === 0 ? (
              <p className="note">Nothing has failed.</p>
            ) : (
              <ul className="stack-tight">
                {row.failures.map((failure) => (
                  <li key={failure.at}>
                    <Strip state="blocked">
                      <div className="verifier-row" data-failure={failure.registryId}>
                        <span className="record-cell">{formatDateTime(failure.at)}</span>
                        <span className="record-cell">{failure.registryId}</span>
                        <span className="note">{failure.reason}</span>
                      </div>
                    </Strip>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
