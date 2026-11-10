import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EscalationDecision } from "@/components/admin/ReviewDecision";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDate, formatPeriod, orUnknown } from "@/lib/record";

export const metadata: Metadata = { title: "Escalations" };

export default async function EscalationsPage() {
  await connection();
  const result = await api.escalations();

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "The escalations could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = result.data;

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Escalations</p>
        <h1 className="h2-display">
          {rows.length === 1
            ? "1 report with the platform"
            : `${formatCount(rows.length)} reports with the platform`}
        </h1>
        <p className="lede">
          A report a project and a household could not settle between them. The
          platform decides on the evidence, and whatever it decides is
          published with its basis: a report closed without one is a report
          nobody can check.
        </p>
        <Rule weight="heavy" />
      </header>

      {rows.length === 0 ? (
        <EmptyState line="No report has been escalated." />
      ) : (
        <ul className="stack-lg">
          {rows.map((dispute) => (
            <li key={dispute.id} className="panel stack" data-escalation={dispute.id}>
              <div className="row-between">
                <div className="stack-tight">
                  <p className="eyebrow">
                    {dispute.projectName} · {formatPeriod(dispute.period)} · raised{" "}
                    {formatDate(dispute.raisedAt)}
                  </p>
                  <h2 className="h3-display">
                    {dispute.category === "not-received"
                      ? "A payment was not received"
                      : dispute.category === "wrong-amount"
                        ? "The amount was wrong"
                        : "A household is not on the register"}
                  </h2>
                </div>
                <p className="record-cell">{orUnknown(dispute.participantName)}</p>
              </div>
              <Rule />
              <p className="prose">{dispute.body}</p>
              {dispute.responses.length > 0 ? (
                <ul className="stack-tight">
                  {dispute.responses.map((response) => (
                    <li key={response.at}>
                      <Strip>
                        <div className="stack-tight">
                          <p className="eyebrow">{response.author}</p>
                          <p className="note">{response.body}</p>
                        </div>
                      </Strip>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note">
                  The project has said nothing about this report, which is part
                  of why it is here.
                </p>
              )}
              {dispute.state === "substantiated" ||
              dispute.state === "unsubstantiated" ? (
                <Notice
                  title={
                    dispute.state === "substantiated"
                      ? "Closed as substantiated"
                      : "Closed as unsubstantiated"
                  }
                >
                  <p data-escalation-basis-published={dispute.id}>
                    {dispute.resolutionBasis ??
                      "The basis is not on the record, which is itself a defect: this report cannot be checked."}
                  </p>
                </Notice>
              ) : (
                <>
                  <Rule />
                  <EscalationDecision disputeId={dispute.id} />
                </>
              )}
              <p className="note">
                The transfer behind it:{" "}
                {dispute.transferId ? (
                  <Link href={`/app/roster/${dispute.participantId ?? ""}`} prefetch={false}>
                    {dispute.transferId}
                  </Link>
                ) : (
                  "there is none, which is what the report is about"
                )}
                .
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
