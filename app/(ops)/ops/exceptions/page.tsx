import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { EXCEPTION_COPY } from "@/lib/copy/ops";
import { formatCount, formatDate } from "@/lib/record";

export const metadata: Metadata = {
  title: "Exceptions",
};

type Search = { state?: string };

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if(process.env.ATTEST_API_MODE==='live')return null;
  await connection();
  const search = await searchParams;
  const result = await api.exceptions({});

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "The exceptions could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = search.state === "none" ? [] : result.data;
  const outstanding = rows.filter((row) => row.resolution === null);

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Verification exceptions</p>
        <h1 className="h2-display">
          {formatCount(outstanding.length)} of {formatCount(rows.length)} outstanding
        </h1>
        <p className="lede">
          A check that did not pass, a name that did not match, a wallet whose
          limit is below the payment. Each is about one enrolment and is
          resolved on the project&rsquo;s own participants.
        </p>
        <Rule weight="heavy" />
      </header>

      {rows.length === 0 ? (
        <EmptyState line="No verification exception is open. Every check that ran, passed." />
      ) : (
        <ul className="stack-tight">
          {rows.map((row) => (
            <li key={row.id}>
              <Strip state={row.resolution === null ? "flagged" : undefined}>
                <div className="verifier-row wide" data-exception={row.id}>
                  <span className="record-cell">{EXCEPTION_COPY[row.kind]}</span>
                  <span className="record-cell">{row.projectName}</span>
                  <span className="note">{row.detail}</span>
                  <span className="record-cell">{formatDate(row.raisedAt)}</span>
                  <span className="note" data-resolution={row.resolution ? "resolved" : "open"}>
                    {row.resolution
                      ? `Resolved: ${row.resolution}`
                      : "Not resolved yet"}
                  </span>
                </div>
              </Strip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
