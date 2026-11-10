import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PublicMasthead } from "@/components/public/PublicMasthead";
import { Coverage } from "@/components/public/Coverage";
import { ButtonLink } from "@/components/Button";
import { Hash } from "@/components/Hash";
import { Loading } from "@/components/Loading";
import { Notice } from "@/components/Notice";
import { Registered } from "@/components/Registered";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { formatNaira, formatTimestamp } from "@/lib/record";

export const metadata: Metadata = {
  title: "Attestation — Attest",
  description:
    "One closed period: households enrolled, households paid, what the commitment required, the hash, its place in the chain and where it is anchored.",
};

export default async function AttestationPage({
  params,
}: {
  params: Promise<{ attestationId: string }>;
}) {
  const { attestationId } = await params;
  return (
    <>
      <PublicMasthead context="Attestation" />
      <div className="measure section-tight stack-lg">
        <Suspense fallback={<Loading rows={8} label="Loading the record" />}>
          <AttestationBody attestationId={attestationId} />
        </Suspense>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="definition-row">
      <span className="eyebrow">{label}</span>
      <span className="record-cell">{children}</span>
    </div>
  );
}

async function AttestationBody({ attestationId }: { attestationId: string }) {
  await connection();
  const result = await api.publicAttestation(attestationId);

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      notFound();
    }
    /* The figures and the hash are final whatever the anchor is doing, so a
       pending or unreachable anchor is stated rather than hiding the record. */
    return (
      <Notice
        tone={result.code === "CHAIN_DISCONTINUITY" ? "blocked" : "flagged"}
        title={result.code}
      >
        {result.message} {result.remediation}
      </Notice>
    );
  }

  const record = result.data;

  return (
    <>
      <div className="stack">
        <p className="eyebrow">
          Attestation · {record.period} ·{" "}
          <Link href={`/register/${record.projectId}`}>{record.projectName}</Link>
        </p>
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <h1 className="h2-display">The record for {record.period}</h1>
          <span className="row">
            {record.closedLate ? (
              <Stamp state="flagged" label="Closed late" recordId={`${record.id}-late`} />
            ) : null}
            {record.anchorState === "anchored" ? (
              <Stamp state="sealed" label="Anchored" recordId={record.id} />
            ) : record.anchorState === "pending" ? (
              <Stamp state="review" label="Anchor pending" recordId={record.id} />
            ) : (
              <Stamp state="flagged" label="Anchor unreachable" recordId={record.id} />
            )}
          </span>
        </div>
        <Rule weight="heavy" />
      </div>

      {record.supersededBy ? (
        <Notice tone="flagged" title="A correction supersedes this record">
          This attestation stands as published. The correction is a separate
          record in the period it was found, and both remain readable.{" "}
          <Link href={`/attestation/${record.supersededBy}`}>
            Open the correction
          </Link>
          .
        </Notice>
      ) : null}

      <Registered>
        <div className="document stack-lg">
          <div
            className="grid-ruled"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}
          >
            <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
              <p className="eyebrow">Households paid</p>
              <Coverage paid={record.paid} enrolled={record.enrolled} size="figure" />
            </div>
            <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
              <p className="eyebrow">Received by households</p>
              <p className="figure-value">{formatNaira(record.amountToHouseholds)}</p>
              <p className="figure-denominator">
                charges borne separately: {formatNaira(record.chargesBorne)}
              </p>
            </div>
            <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
              <p className="eyebrow">Commitment required</p>
              <p className="figure-value">{formatNaira(record.required)}</p>
              <p className="figure-denominator">
                shortfall {formatNaira(record.shortfall)}
              </p>
            </div>
            <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
              <p className="eyebrow">Confirmed by the household</p>
              <p className="figure-value">
                {Math.round(record.confirmationRate * 100)}%
              </p>
              <p className="figure-denominator">of payments that settled</p>
            </div>
          </div>

          <div className="definition">
            <Row label="Period">{record.period}</Row>
            <Row label="Closed">{formatTimestamp(record.closedAt)}</Row>
            <Row label="Hash">
              <Hash value={record.hash} full />
            </Row>
            <Row label="Previous period">
              {record.previousHash ? (
                <Hash value={record.previousHash} />
              ) : (
                "None. This is the first period on the chain."
              )}
            </Row>
            <Row label="Merkle root">
              <Hash value={record.merkleRoot} full />
            </Row>
            <Row label="Chain position">{record.chainPosition}</Row>
            <Row label="Anchor">
              {record.anchor.network} · topic {record.anchor.topicId}
              {record.anchor.sequence === null
                ? " · sequence pending"
                : ` · sequence ${record.anchor.sequence}`}
            </Row>
          </div>

          <p className="prose-muted">
            Every figure here is computed from transfers that cleared the bank.
            The hash covers them, the chain covers the period before this one,
            and the anchor fixes when it was published. Nobody, including
            Attest, can write one of these after the fact.
          </p>
        </div>
      </Registered>

      <div className="row">
        <ButtonLink href={`/verify?hash=${record.hash}`}>
          Verify this record
        </ButtonLink>
        <Link href={`/register/${record.projectId}`} className="btn-quiet btn-sm">
          Back to the project
        </Link>
      </div>
    </>
  );
}
