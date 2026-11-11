import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PublicMasthead } from "@/components/public/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Coverage } from "@/components/public/Coverage";
import { ButtonLink } from "@/components/Button";
import { Hash } from "@/components/Hash";
import { Notice } from "@/components/Notice";
import { Registered } from "@/components/Registered";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import {
  formatCoverage,
  formatNaira,
  formatPeriod,
  formatSettlement,
} from "@/lib/record";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ attestationId: string }>;
}): Promise<Metadata> {
  await connection();
  const { attestationId } = await params;
  const result = await api.publicAttestation(attestationId);
  if (!result.ok) {
    return { title: "Attestation not found" };
  }
  const record = result.data;
  const description = `${formatCoverage(record.paid, record.enrolled)} households paid. ${formatNaira(record.amountToHouseholds)} received against ${formatNaira(record.required)} required.`;
  return {
    title: `${record.projectName} ${formatPeriod(record.period)} attestation`,
    description,
    openGraph: { title: `${record.projectName} · ${formatPeriod(record.period)}`, description },
  };
}

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
        <AttestationBody attestationId={attestationId} />
      </div>
      <PublicFooter />
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
    return (
      <Notice tone="blocked" title={headingFor(result.code, "This record did not load")}>
        {result.message} {result.remediation}
      </Notice>
    );
  }

  const record = result.data;

  /* The figures and the hash are final whatever the anchor is doing, so a
     pending anchor, an unreachable one or a break in the chain is stated
     above the record rather than shown instead of it. */
  const aboutTheRecordNotice =
    record.chainBreak ? (
      <Notice tone="blocked" title="This record does not chain to the period before it">
        The break is published rather than repaired. Neither record was
        rewritten, and both remain readable: what is in question is the join
        between them, not the figures in either.
      </Notice>
    ) : record.anchorState === "pending" ? (
      <Notice tone="flagged" title="This record is waiting to anchor">
        The figures and the hash below are final. What has not landed yet is
        the anchor, which is the public timestamp saying when they were
        published.
      </Notice>
    ) : record.anchorState === "unreachable" ? (
      <Notice tone="flagged" title="The anchoring network could not be reached">
        The hash and the proof still verify against this record, so the
        arithmetic holds. What cannot be checked right now is when it was
        published.
      </Notice>
    ) : null;

  return (
    <>
      <div className="stack">
        <p className="eyebrow">
          Attestation · {formatPeriod(record.period)} ·{" "}
          <Link href={`/register/${record.projectId}`}>{record.projectName}</Link>
        </p>
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <h1 className="h2-display">The record for {formatPeriod(record.period, true)}</h1>
          {record.isDemonstration?<p className="note">{record.demonstrationNotice??"Synthetic payment demonstration"}</p>:null}
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

      {aboutTheRecordNotice}

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
            <Row label="Period">{formatPeriod(record.period, true)}</Row>
            <Row label="Closed">{formatSettlement(record.closedAt)}</Row>
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
              {/* The anchor's own state and sequence, named rather than left
                  for a reader — or a test — to infer from the sentence. A
                  check that passed on the word "anchor" appearing somewhere
                  on the page was satisfied by the boilerplate below it. */}
              <span
                data-anchor-state={record.anchorState}
                data-anchor-sequence={record.anchor.sequence ?? "pending"}
              >
                {record.anchor.network} · topic {record.anchor.topicId}
                {record.anchor.sequence === null
                  ? " · sequence pending"
                  : ` · sequence ${record.anchor.sequence}`}
              </span>
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
        <a
          className="btn-outline btn-sm"
          href={`/attestation/${record.id}/download`}
          download
        >
          Download the signed attestation
        </a>
        <Link href={`/register/${record.projectId}`} className="btn-quiet btn-sm">
          Back to the project
        </Link>
      </div>
    </>
  );
}
