import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDateTime, formatPeriod } from "@/lib/record";

export const metadata: Metadata = { title: "Chain integrity" };

/* Every published record carries the hash of the record before it. A break
   means one of them was written without the other, and the monitor reports it
   rather than repairing it: repairing a chain is indistinguishable from
   rewriting one, which is the thing this product exists not to do. */
export default async function ChainPage() {
  if(process.env.ATTEST_API_MODE==='live')return null;
  await connection();
  const result = await api.chainChecks();

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "The chain could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = result.data;
  const breaks = rows.filter((row) => !row.chains);
  /* Pending and unreachable are different facts needing different notices: a
     batch on its way is nothing to do, an anchoring network that cannot be
     reached is an outage. Folding them together told the operator to wait
     for a batch that was not coming. */
  const pending = rows.filter((row) => row.anchorState === "pending");
  const unreachable = rows.filter((row) => row.anchorState === "unreachable");

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Chain integrity</p>
        <h1 className="h2-display">
          {breaks.length === 1
            ? `1 of ${formatCount(rows.length)} records does not chain`
            : `${formatCount(breaks.length)} of ${formatCount(rows.length)} records do not chain`}
        </h1>
        <p className="lede">
          Each record carries the hash of the one before it, and each is
          anchored where anyone can check it. A break is published as a break.
          Nothing here repairs one, because a repaired chain and a rewritten
          one look the same from outside.
        </p>
        <Rule weight="heavy" />
      </header>

      {breaks.length > 0 ? (
        <Notice tone="blocked" title="A record does not chain to the one before it">
          <p data-chain="broken">
            Both records stay published and both say so. What is investigated
            is how the two came to be written out of order, not which of them
            to change.
          </p>
        </Notice>
      ) : null}

      {pending.length > 0 ? (
        <Notice
          tone="review"
          title={
            pending.length === 1
              ? "1 record is waiting to anchor"
              : `${formatCount(pending.length)} records are waiting to anchor`
          }
        >
          <p data-chain="pending">
            The figures are sealed and published. The anchor reference arrives
            when the batch lands, and until it does the record says that rather
            than showing a reference it does not have.
          </p>
        </Notice>
      ) : null}

      {unreachable.length > 0 ? (
        <Notice tone="blocked" title="The anchoring network could not be reached">
          <p data-chain="unreachable">
            {unreachable.length === 1
              ? "1 record is sealed and published and its anchor could not be written: the network did not answer."
              : `${formatCount(unreachable.length)} records are sealed and published and their anchors could not be written: the network did not answer.`}{" "}
            This is not a batch on its way. The records stay truthful about it,
            and anchoring resumes when the network does.
          </p>
        </Notice>
      ) : null}

      {rows.length === 0 ? <EmptyState line="No record has been published yet, so there is no chain to check." /> : null}
      <ul className="stack-tight">
        {rows.map((row) => (
          <li key={row.attestationId}>
            <Strip
              state={!row.chains ? "blocked" : row.anchorState !== "anchored" ? "review" : undefined}
            >
              <div className="verifier-row wide" data-chain-row={row.attestationId}>
                <span>
                  <Link href={`/attestation/${row.attestationId}`} prefetch={false}>
                    {row.projectName}
                  </Link>
                </span>
                <span className="record-cell">{formatPeriod(row.period)}</span>
                <span className="record-cell">
                  {row.chains ? "Chains to the record before it" : "Does not chain"}
                </span>
                <span className="record-cell">
                  {row.anchorState === "anchored"
                    ? "Anchored"
                    : row.anchorState === "pending"
                      ? "Waiting to anchor"
                      : "The anchoring network could not be reached"}
                </span>
                <span className="record-cell">Checked {formatDateTime(row.checkedAt)}</span>
              </div>
            </Strip>
          </li>
        ))}
      </ul>
    </div>
  );
}
