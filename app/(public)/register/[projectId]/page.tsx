import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicMasthead } from "@/components/public/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { BucketMap } from "@/components/public/BucketMap";
import { Coverage } from "@/components/public/Coverage";
import { ButtonLink } from "@/components/Button";
import { CoverageChart } from "@/components/CoverageChart";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { Table, type Column } from "@/components/Table";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import type { PeriodSummary } from "@/lib/api/contract";
import { confirmationPercent, formatCount, formatCoverage, formatNaira, formatPeriod, formatSettlement } from "@/lib/record";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  await connection();
  const { projectId } = await params;
  const result = await api.publicProject(projectId);
  if (!result.ok) {
    return { title: "Project not found" };
  }
  const project = result.data.project;
  const latest =
    project.periods.filter((period) => period.state !== "open").at(-1) ??
    project.periods[0];
  const description = latest ? `${formatCoverage(latest.paid, latest.enrolled)} households paid in ${formatPeriod(latest.period)} against a ${project.commitment.percentage}% commitment. ${project.registry} ${project.registryId}.` : `${project.name}. No reporting period has closed yet.`;
  return {
    title: project.name,
    description,
    openGraph: { title: `${project.name} · Attest`, description },
    twitter: { title: `${project.name} · Attest`, description },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <>
      <PublicMasthead context="Public register" />
      <div className="measure section-tight stack-lg">
        <ProjectBody projectId={projectId} />
      </div>
      <PublicFooter />
    </>
  );
}

async function ProjectBody({ projectId }: { projectId: string }) {
  await connection();
  const result = await api.publicProject(projectId);

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <Notice tone="blocked" title={headingFor(result.code, "This project did not load")}>
        {result.message} {result.remediation}
      </Notice>
    );
  }

  const { project, attestations, disputes, signals } = result.data;
  const closed = project.periods.filter((period) => period.state !== "open");
  const geography = await api.geography(projectId);

  const columns: Column<PeriodSummary>[] = [
    { key: "period", header: "Period", cell: (period) => period.period },
    {
      key: "coverage",
      header: "Households paid",
      cell: (period) => <Coverage paid={period.paid} enrolled={period.enrolled} />,
    },
    {
      key: "received",
      header: "Received by households",
      numeric: true,
      cell: (period) => formatNaira(period.amountToHouseholds),
    },
    {
      key: "required",
      header: "Agreement required",
      numeric: true,
      cell: (period) => formatNaira(period.required),
    },
    {
      key: "shortfall",
      header: "Shortfall",
      numeric: true,
      cell: (period) =>
        period.shortfall === "0.00" && period.surplus !== "0.00"
          ? `${formatNaira(period.surplus)} above`
          : formatNaira(period.shortfall),
    },
    {
      key: "confirmed",
      header: "Confirmed",
      numeric: true,
      cell: (period) => `${confirmationPercent(period.confirmationRate)}%`,
    },
    {
      key: "state",
      header: "State",
      cell: (period) =>
        period.state === "open" ? (
          <Stamp state="review" label="Open" recordId={`${project.id}-${period.period}`} />
        ) : period.state === "closed-late" ? (
          <Stamp state="flagged" label="Closed late" recordId={`${project.id}-${period.period}`} />
        ) : (
          <Stamp state="sealed" label="Sealed" recordId={`${project.id}-${period.period}`} />
        ),
    },
    {
      key: "record",
      header: "Record",
      cell: (period) =>
        period.attestationId ? (
          <Link href={`/attestation/${period.attestationId}`}>Attestation</Link>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <>
      <div className="stack">
        <p className="eyebrow">
          {project.registry} {project.registryId} · {project.state}, {project.localGovernment} ·{" "}
          <Link href={`/developers/${project.developerId}`}>{project.developerName}</Link>
        </p>
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <h1 className="h2-display">{project.name}</h1>
          {project.commitment.sourceAlignment==='edition_pending'?<p className="note">Source edition pending: the verified quotation is retained at its actual location. The requested {project.commitment.specifiedSourceLocator} edition has not been provided.</p>:null}
          {project.referenceStatistics?<section className="panel stack"><h2 className="h3-display">Published project reference</h2><p>{project.referenceStatistics.participants?.toLocaleString()} participants · {project.referenceStatistics.certificatesIssued?.toLocaleString()} certificates issued · project start year {project.referenceStatistics.projectStartYear}</p><p className="note">These source statistics are separate from the synthetic payment demonstration and are never its coverage denominator.</p><a href={project.referenceStatistics.sourceUrl} target="_blank" rel="noreferrer">Published annual report, page {project.referenceStatistics.sourcePage} · as of {project.referenceStatistics.asOf}</a></section>:null}
          {project.isDemonstration?<Notice title="Synthetic payment demonstration"><p>{project.demonstrationNotice}</p></Notice>:null}
          {project.status === "withdrawn" ? (
            <Stamp state="blocked" label="Withdrawn" recordId={project.id} />
          ) : project.status === "suspended" ? (
            <Stamp state="flagged" label="Suspended" recordId={project.id} />
          ) : null}
        </div>
        <Rule weight="heavy" />
      </div>

      {project.status === "withdrawn" ? (
        <Notice tone="blocked" title="This project has been withdrawn">
          The record below stands. Withdrawal stops new periods; it does not
          remove what was already published.
        </Notice>
      ) : null}

      {closed.length === 0 ? (
        <Notice title="No period has closed yet">
          The project is enrolled and its agreement is recorded. Nothing has
          been paid under it yet, and the figures below say so rather than
          being absent.
        </Notice>
      ) : null}

      <div
        className="grid-ruled"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}
      >
        <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
          <p className="eyebrow">Households paid, latest period</p>
          <Coverage paid={project.paid} enrolled={project.enrolled} size="figure" />
        </div>
        <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
          <p className="eyebrow">Confirmed by the household</p>
          <p className="figure-value">{confirmationPercent(project.confirmationRate)}%</p>
          <p className="figure-denominator">of payments that settled</p>
        </div>
        <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
          <p className="eyebrow">Disputes</p>
          <p className="figure-value">{formatCount(disputes.open)}</p>
          <p className="figure-denominator">
            open · {formatCount(disputes.substantiated)} substantiated
          </p>
        </div>
        <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
          <p className="eyebrow">Signals raised</p>
          <p className="figure-value">{formatCount(signals)}</p>
          <p className="figure-denominator">counts only; evidence is not published</p>
        </div>
      </div>

      <div className="stack">
        <h2 className="h3-display">The agreement</h2>
        <div className="document">
          <div className="stack">
            <p className="quotation">{project.commitment.sourceQuote}</p>
            <p className="eyebrow">
              Project design document,{" "}
              {project.commitment.section
                ? `section ${project.commitment.section}, page ${project.commitment.page}`
                : `page ${project.commitment.page}`}{" "}
              · {project.commitment.percentage}% of{" "}
              {project.commitment.basis === "net" ? "net" : "gross"} revenue,{" "}
              {project.commitment.cadence === "staged"
                ? "paid in stages against verification"
                : project.commitment.cadence}
            </p>
            {project.commitment.corrected ? (
              <p className="prose-muted">
                This field was corrected after extraction. The original read{" "}
                {project.commitment.originalPercentage}%. Reason given:{" "}
                {project.commitment.correctionReason}
              </p>
            ) : null}
          </div>
        </div>
        <p className="prose-muted">
          The agreement is the developer&rsquo;s own published words, not
          Attest&rsquo;s reading of them. Every figure on this page is measured
          against it.
        </p>
      </div>

      <div className="stack">
        <h2 className="h3-display">Coverage by period</h2>
        <CoverageChart
          bars={project.periods.map((period) => ({
            label: period.period,
            paid: period.paid,
            enrolled: period.enrolled,
          }))}
          title="Households paid against households enrolled, by period"
        />
      </div>

      <div className="stack">
        <h2 className="h3-display">Periods</h2>
        <Table
          caption={`Periods for ${project.name}`}
          columns={columns}
          rows={project.periods}
          rowKey={(period) => period.period}
        />
      </div>

      {geography.ok ? (
        <div className="stack">
          <h2 className="h3-display">Where households are enrolled</h2>
          <BucketMap
            demonstration={project.isDemonstration}
            buckets={geography.data.buckets}
            resolution={geography.data.resolution}
          />
        </div>
      ) : null}

      {attestations.length > 0 ? (
        <div className="row">
          <ButtonLink href={`/attestation/${attestations[attestations.length - 1].id}`}>
            Open the latest attestation
          </ButtonLink>
          <a
            className="btn-outline btn-sm"
            href={`/attestation/${attestations[attestations.length - 1].id}/download`}
            download
          >
            Download the signed attestation
          </a>
          <span className="eyebrow">
            Sealed {formatSettlement(attestations[attestations.length - 1].closedAt)}
          </span>
        </div>
      ) : null}
    </>
  );
}
