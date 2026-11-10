import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Disclose } from "@/components/Disclose";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { ParticipantActions } from "@/components/console/ParticipantActions";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { PARTICIPANT_COPY } from "@/lib/copy/console";
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
  params: Promise<{ participantId: string }>;
}): Promise<Metadata> {
  await connection();
  const { participantId } = await params;
  const result = await api.participant(participantId);
  return { title: result.ok ? result.data.name : "Household not found" };
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  flagged: "Flagged",
  excluded: "Excluded from the current run",
  disputed: "Disputed",
  "duplicate-blocked": "Duplicate blocked",
  removed: "Removed",
};

function minutes(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const whole = Math.round(seconds / 60);
  return whole === 1 ? "1 minute" : `${whole} minutes`;
}

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  await connection();
  const { participantId } = await params;
  const [result, payments] = await Promise.all([
    api.participant(participantId),
    api.participantPayments(participantId),
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

  const participant = result.data;
  const history = payments.ok ? payments.data : [];
  const disputed = history.filter((payment) => payment.disputeId !== null);

  return (
    <div className="console-page reading stack-lg">
      <header className="stack">
        <p className="eyebrow">{participant.id}</p>
        <h1 className="h2-display">{participant.name}</h1>
        <div className="row-between">
          <p className="record-cell">
            {participant.community} · {participant.localGovernment}
          </p>
          <Stamp
            state={
              participant.status === "removed" || participant.status === "duplicate-blocked"
                ? "blocked"
                : participant.status === "flagged" || participant.status === "excluded"
                  ? "flagged"
                  : participant.status === "disputed"
                    ? "review"
                    : "sealed"
            }
            label={STATUS_LABEL[participant.status]}
            recordId={participant.id}
          />
        </div>
        <Rule weight="heavy" />
      </header>

      {participant.status === "removed" ? (
        <Notice tone="blocked" title="This household is removed from the roster">
          <p data-status-note="removed">
            {PARTICIPANT_COPY.removedNote(
              participant.statusReason ?? "No reason was recorded.",
              formatDate(participant.enrolledAt),
            )}
          </p>
          <p className="note">
            The enrolment and every payment made before the removal stay on the
            record, because coverage for a closed period is a fact about that
            period.
          </p>
        </Notice>
      ) : null}

      {participant.status === "excluded" ? (
        <Notice tone="flagged" title="Excluded from the current run">
          <p data-status-note="excluded">
            {PARTICIPANT_COPY.excludedNote(
              participant.statusReason ?? "No reason was recorded.",
            )}
          </p>
        </Notice>
      ) : null}

      {participant.status === "duplicate-blocked" ? (
        <Notice tone="blocked" title="Blocked as a duplicate enrolment">
          <p data-status-note="duplicate-blocked">
            {participant.statusReason ??
              "A second enrolment carries the same verification number."}
          </p>
        </Notice>
      ) : null}

      {participant.flags.length > 0 ? (
        <Notice tone="flagged" title={`${participant.flags.length} flags on this enrolment`}>
          <ul className="flag-list" data-flags={participant.flags.length}>
            {participant.flags.map((flag) => (
              <li key={flag} className="record-cell">
                {flag}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {disputed.length > 0 ? (
        <Notice tone="review" title="A payment to this household is disputed">
          <ul className="stack">
            {disputed.map((payment) => (
              <li key={payment.transferId}>
                <Link href={`/app/disputes/${payment.disputeId}`} prefetch={false}>
                  {formatPeriod(payment.period)} · {formatNaira(payment.amount)}
                </Link>
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <section className="stack" aria-label="Enrolment record">
        <h2 className="h3-display">Enrolment</h2>
        <Rule />
        <dl className="record-grid">
          <div>
            <dt className="eyebrow">Enrolled</dt>
            <dd className="record-cell">{formatDateTime(participant.enrolledAt)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Capture location</dt>
            <dd className="record-cell">
              {participant.community}, inside the project boundary
              {participant.boundary === "outside" ? " — flagged outside" : ""}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Sync delay</dt>
            <dd className="record-cell">{minutes(participant.syncDelaySeconds)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Enrolled by</dt>
            <dd className="record-cell">
              <Link href={`/app/agents/${participant.agentId}`} prefetch={false}>
                {participant.agentName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Phone</dt>
            <dd className="record-cell">{participant.phoneMasked}</dd>
          </div>
          <div>
            <dt className="eyebrow">Verification tier</dt>
            <dd className="record-cell">Tier {participant.tier}</dd>
          </div>
          <div>
            <dt className="eyebrow">Wallet</dt>
            <dd className="record-cell">{participant.walletState}</dd>
          </div>
          <div>
            <dt className="eyebrow">Name enquiry</dt>
            <dd className="record-cell">
              {participant.nameMatch === "match"
                ? "The account resolves to the enrolled name"
                : "The account resolves to a different holder"}
            </dd>
          </div>
        </dl>
      </section>

      <Disclose
        summary={PARTICIPANT_COPY.evidence}
        meta={`Verification, account and identity`}
      >
        <dl className="record-grid">
          <div>
            <dt className="eyebrow">Account</dt>
            <dd className="record-cell">{participant.accountNumber}</dd>
          </div>
          <div>
            <dt className="eyebrow">Account name</dt>
            <dd className="record-cell">{participant.accountName}</dd>
          </div>
          <div>
            <dt className="eyebrow">Verification number, last four</dt>
            <dd className="record-cell">
              BVN ····{participant.bvnLastFour} · NIN ····{participant.ninLastFour}
            </dd>
          </div>
        </dl>
        <p className="note">{PARTICIPANT_COPY.identityNote}</p>
      </Disclose>

      <section className="stack" aria-label="Payment history">
        <h2 className="h3-display">Payments</h2>
        <Rule />
        {history.length === 0 ? (
          <p className="prose">
            No payment has been made to this household yet.
          </p>
        ) : (
          <ul className="payment-list">
            {history.map((payment) => (
              <li key={payment.transferId} className="payment-row">
                <div className="stack-tight">
                  <p className="record-cell">{formatPeriod(payment.period)}</p>
                  <p className="figure-inline">{formatNaira(payment.amount)}</p>
                  <p className="note">
                    {payment.settledAt
                      ? `Settled ${formatSettlement(payment.settledAt)} · session ${orUnknown(payment.sessionId)}`
                      : "Not settled"}
                  </p>
                  <p className="note">
                    {payment.confirmedAt
                      ? `Confirmed by the household ${formatDate(payment.confirmedAt)}`
                      : "Not confirmed by the household"}
                  </p>
                </div>
                <Stamp
                  state={
                    payment.state === "settled"
                      ? "sealed"
                      : payment.state === "failed"
                        ? "blocked"
                        : payment.state === "reversed"
                          ? "flagged"
                          : "review"
                  }
                  label={payment.state === "settled" ? "Settled" : payment.state}
                  recordId={payment.transferId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ParticipantActions
        participantId={participant.id}
        phone={participant.phoneMasked}
        status={participant.status}
      />
    </div>
  );
}
