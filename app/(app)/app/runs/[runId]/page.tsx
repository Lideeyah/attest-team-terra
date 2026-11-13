import type { Metadata } from "next";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { LiveRun } from "@/components/console/LiveRun";
import { api } from "@/lib/api/client";
import { RUN_STATE_LABEL } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDateTime, formatNaira, formatPeriod } from "@/lib/record";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ runId: string }>;
}): Promise<Metadata> {
  await connection();
  const { runId } = await params;
  const result = await api.run(runId);
  return {
    title: result.ok ? `${formatPeriod(result.data.period)} run` : "Distribution not found",
  };
}

export default async function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await connection();
  const { runId } = await params;
  const [result, transfers] = await Promise.all([
    api.run(runId),
    api.transfers(runId, { page: 1, per_page: 50 }),
  ]);

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

  const run = result.data;
  return (
    <div className="console-page stack-lg">
      <header className="stack">
        <p className="eyebrow">{run.id}</p>
        <div className="row-between">
          <h1 className="h2-display">
            {formatPeriod(run.period)} · {RUN_STATE_LABEL[run.state]}
          </h1>
          <Stamp
            state={
              run.state === "complete"
                ? "sealed"
                : run.state === "failed" || run.state === "cancelled" || run.state === "preflight-failed"
                  ? "blocked"
                  : run.state === "partially-complete" || run.state === "awaiting-funding"
                    ? "flagged"
                    : "review"
            }
            label={RUN_STATE_LABEL[run.state]}
            recordId={run.id}
          />
        </div>
        <dl className="record-grid">
          <div>
            <dt className="eyebrow">Declared gross</dt>
            <dd className="record-cell">{formatNaira(run.declaredGross)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Funded</dt>
            <dd className="record-cell">{formatNaira(run.fundingAmount)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Households</dt>
            <dd className="record-cell">{formatCount(run.rosterSize)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Executed</dt>
            <dd className="record-cell">
              {run.executedAt ? formatDateTime(run.executedAt) : "Not executed"}
            </dd>
          </div>
        </dl>
        <Rule weight="heavy" />
      </header>

      {run.rosterSize === 0 ? (
        <Notice tone="review" title="This distribution has not executed">
          <p data-run-state={run.state}>
            {run.state === "awaiting-funding"
              ? "The distribution is built and waiting for funding to arrive in the disbursement account."
              : run.state === "funded"
                ? "Funding has arrived. Pre-flight distributions before the transfers are submitted."
                : run.state === "preflight-running"
                  ? "Pre-flight is reading every enrolment on the participants against the bank."
                  : run.state === "preflight-failed"
                    ? "Pre-flight found enrolments that cannot be paid as they stand. Each must be excluded with a reason or corrected."
                    : run.state === "cancelled"
                      ? "The distribution was cancelled before any transfer was submitted, so no household was paid from it."
                      : run.state === "failed"
                        ? "The bulk transfer was refused and no transfer in this distribution was submitted."
                        : "The distribution is a draft. Nothing has been submitted."}
          </p>
        </Notice>
      ) : (
        <LiveRun run={run} first={transfers.ok ? transfers.data : []} />
      )}
    </div>
  );
}
