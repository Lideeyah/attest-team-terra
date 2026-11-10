import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Disclose } from "@/components/Disclose";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { DisputeResponse } from "@/components/console/DisputeResponse";
import { api } from "@/lib/api/client";
import { DISPUTE_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import {
  formatDate,
  formatDateTime,
  formatNaira,
  formatPeriod,
  formatSettlement,
  orUnknown,
} from "@/lib/record";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}): Promise<Metadata> {
  await connection();
  const { disputeId } = await params;
  const result = await api.dispute(disputeId);
  return { title: result.ok ? `Report ${result.data.id}` : "Report not found" };
}

export default async function DisputePage({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}) {
  await connection();
  const { disputeId } = await params;
  const result = await api.dispute(disputeId);
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

  const dispute = result.data;
  const payments = dispute.participantId
    ? await api.participantPayments(dispute.participantId)
    : null;
  const transfer =
    payments && payments.ok
      ? payments.data.find((payment) => payment.transferId === dispute.transferId)
      : undefined;

  const closed =
    dispute.state === "substantiated" || dispute.state === "unsubstantiated";

  return (
    <div className="console-page reading stack-lg">
      <header className="stack">
        <Link href="/app/disputes" className="btn-quiet btn-sm back-link" prefetch={false}>
          ← Reports
        </Link>
        <p className="eyebrow">{dispute.id}</p>
        <h1 className="h2-display">
          {dispute.category === "not-received"
            ? "A payment was not received"
            : dispute.category === "wrong-amount"
              ? "The amount was wrong"
              : "A household is not on the register"}
        </h1>
        <div className="row-between">
          <p className="record-cell">
            {orUnknown(dispute.participantName)} · {formatPeriod(dispute.period)} ·
            raised {formatDate(dispute.raisedAt)}
          </p>
          <Stamp
            state={
              dispute.state === "substantiated"
                ? "blocked"
                : dispute.state === "unsubstantiated"
                  ? "sealed"
                  : dispute.state === "escalated"
                    ? "review"
                    : "flagged"
            }
            label={
              dispute.state === "developer-responded"
                ? "Responded"
                : dispute.state === "awaiting-participant"
                  ? "Awaiting the participant"
                  : dispute.state.charAt(0).toUpperCase() + dispute.state.slice(1)
            }
            recordId={dispute.id}
          />
        </div>
        <Rule weight="heavy" />
      </header>

      <section className="stack" aria-label="What the household says">
        <h2 className="h3-display">What the household says</h2>
        <Rule />
        <p className="prose">{dispute.body}</p>
      </section>

      {dispute.state === "escalated" ? (
        <Notice tone="review" title="This report is with the platform">
          <p data-dispute-state="escalated">{DISPUTE_COPY.escalated}</p>
        </Notice>
      ) : null}

      {dispute.state === "developer-responded" ||
      dispute.state === "awaiting-participant" ? (
        <Notice title="Awaiting the participant">
          <p data-dispute-state="awaiting-participant">
            {DISPUTE_COPY.awaitingParticipant}
          </p>
        </Notice>
      ) : null}

      {closed ? (
        <Notice
          tone={dispute.state === "substantiated" ? "blocked" : undefined}
          title={
            dispute.state === "substantiated"
              ? "Substantiated"
              : "Unsubstantiated"
          }
        >
          <p data-dispute-state={dispute.state}>
            {dispute.state === "substantiated"
              ? "The report is substantiated. The basis is below, and it is the basis rather than an assertion that closed it."
              : "The report is unsubstantiated. The basis is below, and it is the basis rather than an assertion that closed it."}
          </p>
          <p className="note">{orUnknown(dispute.resolutionBasis)}</p>
        </Notice>
      ) : null}

      {dispute.transferId ? (
        <Disclose
          summary="The transfer this report is about"
          meta={dispute.transferId}
          initiallyOpen
        >
          <dl className="record-grid">
            <div>
              <dt className="eyebrow">Transfer</dt>
              <dd className="record-cell">{dispute.transferId}</dd>
            </div>
            <div>
              <dt className="eyebrow">Amount</dt>
              <dd className="record-cell">
                {transfer ? formatNaira(transfer.amount) : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Settled</dt>
              <dd className="record-cell">
                {transfer?.settledAt ? formatSettlement(transfer.settledAt) : "Not settled"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Session</dt>
              <dd className="record-cell">{orUnknown(transfer?.sessionId ?? null)}</dd>
            </div>
            <div>
              <dt className="eyebrow">Confirmed by the household</dt>
              <dd className="record-cell">
                {transfer?.confirmedAt
                  ? formatDate(transfer.confirmedAt)
                  : "Not confirmed"}
              </dd>
            </div>
          </dl>
          {dispute.participantId ? (
            <p>
              <Link href={`/app/roster/${dispute.participantId}`} prefetch={false}>
                The household&rsquo;s record
              </Link>
            </p>
          ) : null}
        </Disclose>
      ) : null}

      <section className="stack" aria-label="Responses">
        <h2 className="h3-display">Responses</h2>
        <Rule />
        {dispute.responses.length === 0 ? (
          <p className="prose">Nothing has been said to the household yet.</p>
        ) : (
          <ul className="stack">
            {dispute.responses.map((response) => (
              <li key={response.at} className="stack-tight">
                <p className="eyebrow">
                  {response.author} · {formatDateTime(response.at)}
                </p>
                <p className="prose">{response.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed || dispute.state === "escalated" ? null : (
        <DisputeResponse disputeId={dispute.id} />
      )}
    </div>
  );
}
