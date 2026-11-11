import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { DISPUTE_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDate, formatPeriod, orUnknown } from "@/lib/record";
import type { Dispute } from "@/lib/api/contract";

export const metadata: Metadata = {
  title: "Reports",
};

const STATE_LABEL: Record<Dispute["state"], string> = {
  open: "Open",
  "developer-responded": "Responded, awaiting the participant",
  "awaiting-participant": "Awaiting the participant",
  substantiated: "Substantiated",
  unsubstantiated: "Unsubstantiated",
  escalated: "Escalated to the platform",
};

const CATEGORY_LABEL: Record<Dispute["category"], string> = {
  "someone-else-collected": "Someone else collected the payment",
  "not-received": "Payment not received",
  "wrong-amount": "Amount was wrong",
  "not-enrolled": "Not on the register",
};

export default async function DisputesPage() {
  await connection();
  const session = await api.session();
  if (!session.ok || session.data.projectId === null) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="review" title="This account is not on a project yet">
          <p>A report is raised against a project.</p>
        </Notice>
      </div>
    );
  }
  const result = await api.disputes(session.data.projectId, { per_page: 100 });
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

  const disputes = result.data;
  const open = disputes.filter(
    (dispute) => dispute.state === "open" || dispute.state === "developer-responded",
  );

  return (
    <div className="console-page stack-lg">
      <header className="stack">
        <p className="eyebrow">{DISPUTE_COPY.heading}</p>
        <h1 className="h2-display">
          {formatCount(open.length)} of {formatCount(disputes.length)} reports open
        </h1>
        <p className="lede">{DISPUTE_COPY.basis}</p>
        <Rule weight="heavy" />
      </header>

      {disputes.length === 0 ? (
        <EmptyState line="No household has reported a payment. A report arrives by SMS, USSD or the public form." />
      ) : (
        <ul className="stack-tight">
          {disputes.map((dispute) => (
            <li key={dispute.id}>
              <Strip
                state={
                  dispute.state === "substantiated"
                    ? "blocked"
                    : dispute.state === "escalated"
                      ? "review"
                      : dispute.state === "open"
                        ? "flagged"
                        : undefined
                }
              >
                <div
                  className="dispute-row"
                  data-dispute={dispute.id}
                  data-state={dispute.state}
                >
                  <span>
                    <Link href={`/app/disputes/${dispute.id}`} prefetch={false}>
                      {CATEGORY_LABEL[dispute.category]}
                    </Link>
                  </span>
                  <span className="record-cell">{orUnknown(dispute.participantName)}</span>
                  <span className="record-cell">{formatPeriod(dispute.period)}</span>
                  <span className="record-cell">{STATE_LABEL[dispute.state]}</span>
                  <span className="record-cell">{formatDate(dispute.raisedAt)}</span>
                </div>
              </Strip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
