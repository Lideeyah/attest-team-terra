import type { Metadata } from "next";
import { connection } from "next/server";
import { ExtractionDecision } from "@/components/admin/ReviewDecision";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDateTime } from "@/lib/record";

export const metadata: Metadata = { title: "Extraction review" };

/* A commitment read out of a document by a model, below the confidence it
   needs to stand on its own. The quoted sentence is the point of this screen:
   a reviewer reads the document's own words beside what was read from them. */
export default async function ExtractionReviewPage() {
  if(process.env.ATTEST_API_MODE==='live')return null;
  await connection();
  const result = await api.extractionReviews();

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "The queue could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = result.data;
  const undecided = rows.filter((row) => row.decision === null);

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Extraction review</p>
        <h1 className="h2-display">
          {formatCount(undecided.length)} of {formatCount(rows.length)} waiting
        </h1>
        <p className="lede">
          Every commitment on the register was read out of a project design
          document. Where the reading was not confident, a person reads the
          sentence it came from. The extraction stays on the record either way,
          and so does the decision.
        </p>
        <Rule weight="heavy" />
      </header>

      {rows.length === 0 ? (
        <EmptyState line="No extraction is below the confidence threshold." />
      ) : (
        <ul className="stack-lg">
          {rows.map((row) => (
            <li
              key={`${row.projectId}-${row.field}`}
              className="panel stack"
              data-extraction={`${row.projectId}-${row.field}`}
            >
              <div className="row-between">
                <div className="stack-tight">
                  <p className="eyebrow">
                    {row.projectName} · {row.field} · page {row.page}
                  </p>
                  <h2 className="h3-display">
                    Read as {row.field === "percentage" ? `${row.extracted}%` : row.extracted}
                  </h2>
                </div>
                <Stamp
                  state={row.decision === null ? "review" : "sealed"}
                  label={
                    row.decision === null
                      ? `${Math.round(row.confidence * 100)}% confidence`
                      : row.decision.accepted
                        ? "Accepted"
                        : "Corrected"
                  }
                  recordId={`${row.projectId}-${row.field}`}
                />
              </div>
              <Rule />
              <p className="quotation">{row.sourceQuote}</p>
              <p className="note">
                Project design document, page {row.page}. The figure above is
                what the model read from this sentence.
              </p>
              {row.decision ? (
                <p className="note" data-decision={row.decision.accepted ? "accepted" : "corrected"}>
                  {row.decision.by} {row.decision.accepted ? "accepted" : "corrected"} this{" "}
                  {formatDateTime(row.decision.at)}
                  {row.decision.corrected ? `, to ${row.decision.corrected}` : ""}. The
                  original reading stays on the record.
                </p>
              ) : (
                <>
                  <p className="note">
                    Nobody has read this yet. The project&rsquo;s own register
                    page carries the figure with the sentence beside it, so a
                    reader sees what was read and what it was read from.
                  </p>
                  <Rule />
                  <ExtractionDecision
                    projectId={row.projectId}
                    field={row.field}
                    extracted={row.extracted}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
