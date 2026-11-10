import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ButtonLink } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { RUN_STATE_LABEL } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDate, formatNaira, formatPeriod } from "@/lib/record";
import type { RunState } from "@/lib/api/contract";

export const metadata: Metadata = {
  title: "Runs",
};

const TONE: Partial<Record<RunState, "flagged" | "blocked" | "review">> = {
  "preflight-failed": "blocked",
  failed: "blocked",
  cancelled: "blocked",
  "partially-complete": "flagged",
  "awaiting-funding": "flagged",
  "preflight-running": "review",
  executing: "review",
};

export default async function RunsPage() {
  await connection();
  const session = await api.session();
  if (!session.ok || session.data.projectId === null) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="review" title="This account is not on a project yet">
          <p>A run belongs to a project, so this opens once one exists.</p>
        </Notice>
      </div>
    );
  }
  const result = await api.runs(session.data.projectId);
  if (!result.ok) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, result.message)}>
          <p>{result.message}</p>
          <p className="note">{result.remediation}</p>
        </Notice>
      </div>
    );
  }

  const runs = [...result.data].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return (
    <div className="console-page stack-lg">
      <header className="stack">
        <p className="eyebrow">Runs</p>
        <div className="row-between">
          <h1 className="h2-display">{formatCount(runs.length)} runs</h1>
          <ButtonLink href="/app/runs/new">New run</ButtonLink>
        </div>
        <Rule weight="heavy" />
      </header>

      {runs.length === 0 ? (
        <EmptyState
          line="No run has been created yet. A run pays one period's roster in one bulk transfer."
          action={<ButtonLink href="/app/runs/new">New run</ButtonLink>}
        />
      ) : (
        <div className="stack">
          <div className="run-head" aria-hidden="true">
            <span>Period</span>
            <span>State</span>
            <span>Households</span>
            <span>Funding</span>
            <span>Created</span>
          </div>
          <ul className="stack-tight">
            {runs.map((run) => (
              <li key={run.id}>
                <Strip state={TONE[run.state]} inFlight={run.state === "executing"}>
                  <div className="run-row" data-run={run.id} data-state={run.state}>
                    <span>
                      <Link href={`/app/runs/${run.id}`} prefetch={false}>
                        {formatPeriod(run.period)}
                      </Link>
                    </span>
                    <span className="record-cell">{RUN_STATE_LABEL[run.state]}</span>
                    <span className="record-cell">
                      {run.rosterSize === 0
                        ? "—"
                        : `${formatCount(run.counts.settled)} of ${formatCount(run.rosterSize)} settled`}
                    </span>
                    <span className="record-cell">{formatNaira(run.fundingAmount)}</span>
                    <span className="record-cell">{formatDate(run.createdAt)}</span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
