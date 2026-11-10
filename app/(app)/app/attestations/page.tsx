import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Hash } from "@/components/Hash";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { DisclosureBuilder } from "@/components/console/DisclosureBuilder";
import { api } from "@/lib/api/client";
import { ATTESTATION_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import {
  formatCount,
  formatCoverage,
  formatDate,
  formatNaira,
  formatPeriod,
  orUnknown,
} from "@/lib/record";

export const metadata: Metadata = {
  title: "Attestations",
};

export default async function AttestationsPage() {
  await connection();
  const session = await api.session();
  if (!session.ok || session.data.projectId === null) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="review" title="This account is not on a project yet">
          <p>An attestation is published for a project&rsquo;s closed period.</p>
        </Notice>
      </div>
    );
  }
  const result = await api.attestations(session.data.projectId);
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

  const attestations = [...result.data].sort(
    (left, right) => right.chainPosition - left.chainPosition,
  );
  const pending = attestations.filter(
    (attestation) => attestation.anchorState !== "anchored",
  );
  const corrections = attestations.filter(
    (attestation) => attestation.supersedes !== null,
  );

  return (
    <div className="console-page stack-lg">
      <header className="stack">
        <p className="eyebrow">{ATTESTATION_COPY.heading}</p>
        <h1 className="h2-display">
          {formatCount(attestations.length)} closed periods
        </h1>
        <Rule weight="heavy" />
      </header>

      {pending.length > 0 ? (
        <Notice tone="review" title="A record is waiting to anchor">
          <p data-anchor="pending">{ATTESTATION_COPY.anchorPending}</p>
        </Notice>
      ) : null}

      {corrections.length > 0 ? (
        <Notice tone="flagged" title="A period was corrected">
          <p data-correction="published">{ATTESTATION_COPY.correction}</p>
        </Notice>
      ) : null}

      {attestations.length === 0 ? (
        <EmptyState line={ATTESTATION_COPY.none} />
      ) : (
        <ul className="stack-lg">
          {attestations.map((attestation) => (
            <li
              key={attestation.id}
              className="panel stack"
              data-attestation={attestation.id}
            >
              <div className="row-between">
                <h2 className="h3-display">{formatPeriod(attestation.period)}</h2>
                <Stamp
                  state={
                    attestation.chainBreak
                      ? "blocked"
                      : attestation.anchorState !== "anchored"
                        ? "review"
                        : attestation.closedLate
                          ? "flagged"
                          : "sealed"
                  }
                  label={
                    attestation.anchorState === "anchored"
                      ? attestation.closedLate
                        ? "Closed late"
                        : "Sealed"
                      : "Waiting to anchor"
                  }
                  recordId={attestation.id}
                />
              </div>
              <Rule />
              <dl className="record-grid">
                <div>
                  <dt className="eyebrow">Coverage</dt>
                  <dd className="record-cell">
                    {formatCoverage(attestation.paid, attestation.enrolled)} ·{" "}
                    {formatCount(attestation.paid)} of{" "}
                    {formatCount(attestation.enrolled)} households
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Paid to households</dt>
                  <dd className="record-cell">
                    {formatNaira(attestation.amountToHouseholds)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Required by the commitment</dt>
                  <dd className="record-cell">{formatNaira(attestation.required)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Shortfall</dt>
                  <dd className="record-cell">{formatNaira(attestation.shortfall)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Closed</dt>
                  <dd className="record-cell">{formatDate(attestation.closedAt)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Chain position</dt>
                  <dd className="record-cell">
                    {attestation.chainPosition} · previous{" "}
                    {attestation.previousHash ? (
                      <Hash value={attestation.previousHash} />
                    ) : (
                      "none, this is the first"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Record hash</dt>
                  <dd className="record-cell">
                    <Hash value={attestation.hash} />
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Merkle root</dt>
                  <dd className="record-cell">
                    <Hash value={attestation.merkleRoot} />
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Anchor</dt>
                  <dd className="record-cell">
                    {attestation.anchorState === "anchored"
                      ? `${attestation.anchor.network} · topic ${attestation.anchor.topicId} · sequence ${orUnknown(attestation.anchor.sequence)}`
                      : "Not yet anchored"}
                  </dd>
                </div>
              </dl>

              {attestation.supersedes ? (
                <p className="note">
                  This record corrects {attestation.supersedes}, which stays
                  published.
                </p>
              ) : null}
              {attestation.supersededBy ? (
                <p className="note">
                  A correction to this period is published as{" "}
                  {attestation.supersededBy}. This record is not rewritten.
                </p>
              ) : null}

              <div className="row-between">
                <Link href={`/attestation/${attestation.id}`} prefetch={false}>
                  The public record
                </Link>
                <a
                  className="btn-outline btn-sm"
                  href={`/attestation/${attestation.id}/download`}
                  download
                >
                  Download the record
                </a>
              </div>

              <DisclosureBuilder attestationId={attestation.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
