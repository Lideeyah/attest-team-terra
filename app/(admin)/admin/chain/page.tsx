import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
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
  const pending = rows.filter((row) => row.anchorState !== "anchored");

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Chain integrity</p>
        <h1 className="h2-display">
          {formatCount(breaks.length)} of {formatCount(rows.length)} records do not chain
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
        <Notice tone="review" title={`${formatCount(pending.length)} records are waiting to anchor`}>
          <p data-chain="pending">
            The figures are sealed and published. The anchor reference arrives
            when the batch lands, and until it does the record says that rather
            than showing a reference it does not have.
          </p>
        </Notice>
      ) : null}

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
