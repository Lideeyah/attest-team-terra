import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CoverageChart, type CoverageBar } from "@/components/CoverageChart";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { DETAIL_COPY, VERIFIER_COPY } from "@/lib/copy/verifier";
import { flagRate } from "@/lib/console-format";
import { confirmationPercent, coveragePercent, formatCount, formatCoverage, formatDate, formatNaira, formatPeriod, orUnknown } from "@/lib/record";

/* A resolution basis is published so a reader can see a report closed on
   something. The session identifier and the exact amount in it belong to one
   household's transfer, and this surface publishes no household at any
   granularity, so they are masked here rather than on the record itself. */
function maskRecordIdentifiers(basis: string): string {
  return basis
    .replace(/\b\d{12,}\b/g, "a settlement session")
    .replace(/₦[\d,]+\.\d{2}/g, "the amount on the record");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  await connection();
  const { projectId } = await params;
  const result = await api.verifierProject(projectId);
  return { title: result.ok ? result.data.project.name : "Project not found" };
}

/* Deeper than the public page, and still without a verdict. Every figure is
   shown beside the figure it should be read against — this period's
   confirmation rate beside the project's own history, a signal count beside
   what a signal is — and nothing on the screen says whether that is good. */
export default async function VerifierProject({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  const [result, disputes] = await Promise.all([
    api.verifierProject(projectId),
    api.disputes(projectId, { per_page: 100 }),
  ]);

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      /* A record that does not exist answers 404, here as everywhere else:
         a 200 carrying "not found" is a lie told in the status line. */
      notFound();
    }
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "This project could not be read")}>
          <p>{result.message}</p>
          <p className="note">{result.remediation}</p>
        </Notice>
      </div>
    );
  }

  const { project, attestations, signals, agentFlagRates, geography } = result.data;
  const closed = project.periods.filter((period) => period.state !== "open");
  const latest = closed[closed.length - 1] ?? null;
  const history = closed.slice(0, -1);
  /* The project's own history, as one figure: what its earlier periods were
     acknowledged at. Compared only with itself, never with another project. */
  const historicalConfirmation =
    history.length > 0
      ? confirmationPercent(
          history.reduce((sum, period) => sum + period.confirmationRate, 0) / history.length,
        )
      : null;
  const latestConfirmation = latest ? confirmationPercent(latest.confirmationRate) : null;
  const materiallyBelow =
    historicalConfirmation !== null &&
    latestConfirmation !== null &&
    historicalConfirmation - latestConfirmation >= 10;

  const bars: CoverageBar[] = closed.map((period) => ({
    label: formatPeriod(period.period),
    paid: period.paid,
    enrolled: period.enrolled,
  }));

  const resolved = disputes.ok ? disputes.data : [];

  /* Weighted by what each agent enrolled, and stated against the enrolments
     it was computed from: an agent who enrolled nobody does not count the
     same as one who enrolled seven hundred. */
  const totalEnrolments = agentFlagRates.reduce(
    (sum, agent) => sum + (agent.enrolments ?? 0),
    0,
  );
  const flaggedEnrolments =
    agentFlagRates.length === 0
      ? null
      : Math.round(
          agentFlagRates.reduce(
            (sum, agent) => sum + agent.flagRate * (agent.enrolments ?? 0),
            0,
          ),
        );

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <Link href="/verifier/projects" className="btn-quiet btn-sm back-link" prefetch={false}>
          ← Projects
        </Link>
        <p className="eyebrow">
          {VERIFIER_COPY.surface} · {project.registry} {project.registryId}
        </p>
        <h1 className="h2-display">{project.name}</h1><Link className="btn-outline" href={`/verifier/projects/${projectId}/map`}>View payment map and outcomes</Link>
        <p className="lede">
          {project.developerName} · {project.localGovernment}, {project.state},{" "}
          {project.country}
        </p>
        <Rule weight="heavy" />
      </header>

      {/* A status is a fact about the project's standing with the platform,
          not a finding against it, so it takes the review tone rather than
          the one reserved for a failure. */}
      {project.status !== "active" ? (
        <Notice tone="review" title={`This project is ${project.status}`}>
          <p data-project-status={project.status}>
            Everything it published stays published. A project that is{" "}
            {project.status} makes no new payment, and its closed periods are
            unchanged.
          </p>
        </Notice>
      ) : null}

      <section className="stack" aria-label="The commitment">
        <h2 className="h3-display">What this project committed to</h2>
        <Rule />
        <p className="quotation">{project.commitment.sourceQuote}</p>
        <p className="note">
          Project design document,{" "}
          {project.commitment.section
            ? `section ${project.commitment.section}, page ${project.commitment.page}`
            : `page ${project.commitment.page}`}
          .{" "}
          {project.commitment.corrected
            ? `Read as ${project.commitment.originalPercentage}% and corrected to ${project.commitment.percentage}%: ${project.commitment.correctionReason ?? ""}`
            : `Read as ${project.commitment.percentage}% of ${project.commitment.basis} revenue, ${project.commitment.cadence === "staged" ? "paid in stages against verification" : project.commitment.cadence}.`}
        </p>
        <p className="note">
          Every shortfall below is measured against this, and against nothing
          else.
        </p>
      </section>

      <section className="stack" aria-label={DETAIL_COPY.transfers}>
        <h2 className="h3-display">{DETAIL_COPY.transfers}</h2>
        <Rule />
        {closed.length === 0 ? (
          <p className="note">This project has closed no period, so it has published no figures.</p>
        ) : (
          <>
            <CoverageChart bars={bars} title={`${project.name}: households paid of households enrolled`} />
            <ul className="stack-tight">
              {closed.map((period) => (
                <li key={period.period}>
                  <div className="verifier-row wide" data-period={period.period}>
                    <span className="record-cell">{formatPeriod(period.period)}</span>
                    <span className="record-cell">
                      {formatCoverage(period.paid, period.enrolled)} households paid ·{" "}
                      {coveragePercent(period.paid, period.enrolled)}%
                    </span>
                    <span className="record-cell">
                      {formatNaira(period.amountToHouseholds)} to households
                    </span>
                    <span className="record-cell">
                      {Number(period.shortfall) > 0
                        ? `${formatNaira(period.shortfall)} short of the ${formatNaira(period.required)} the commitment required`
                        : `No shortfall against the ${formatNaira(period.required)} required`}
                    </span>
                    <span className="record-cell">
                      {period.closedAt ? formatDate(period.closedAt) : orUnknown(null)}
                      {period.state === "closed-late"
                        ? ` · closed after ${formatDate(period.closesOn)}`
                        : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="stack" aria-label={DETAIL_COPY.confirmations}>
        <h2 className="h3-display">{DETAIL_COPY.confirmations}</h2>
        <Rule />
        <p className="note">{DETAIL_COPY.confirmationNote}</p>
        {latest ? (
          <div className="verifier-pair" data-against-history={latest.period}>
            <div className="stack-tight">
              <p className="eyebrow">{formatPeriod(latest.period)}</p>
              <p className="figure-inline">
                {latestConfirmation}% of {formatCount(latest.paid)} households paid
              </p>
            </div>
            <div className="stack-tight">
              <p className="eyebrow">
                The mean across its {formatCount(history.length)} earlier
                periods
              </p>
              <p className="figure-inline">
                {historicalConfirmation === null
                  ? orUnknown(null)
                  : `${historicalConfirmation}% of the households each period paid`}
              </p>
            </div>
          </div>
        ) : null}
        {materiallyBelow ? (
          <p className="note" data-against-history-note="below">
            {DETAIL_COPY.againstHistory}
          </p>
        ) : null}
      </section>

      <section className="stack" aria-label={DETAIL_COPY.disputes}>
        <h2 className="h3-display">{DETAIL_COPY.disputes}</h2>
        <Rule />
        <p className="note">{DETAIL_COPY.disputeBasis}</p>
        {resolved.length === 0 ? (
          <p className="note">No household has reported a payment on this project.</p>
        ) : (
          <ul className="stack-tight">
            {resolved.map((dispute) => (
              <li key={dispute.id}>
                <div className="verifier-row wide" data-dispute={dispute.id}>
                  <span className="record-cell">{formatPeriod(dispute.period)}</span>
                  <span className="record-cell">
                    {dispute.category === "not-received"
                      ? "Payment not received"
                      : dispute.category === "wrong-amount"
                        ? "Amount was wrong"
                        : "Not on the register"}
                  </span>
                  <span className="record-cell">
                    {dispute.state === "substantiated"
                      ? "Substantiated"
                      : dispute.state === "unsubstantiated"
                        ? "Unsubstantiated"
                        : dispute.state === "escalated"
                          ? "With the platform"
                          : "Open"}
                  </span>
                  <span className="note">
                    {dispute.resolutionBasis
                      ? maskRecordIdentifiers(dispute.resolutionBasis)
                      : orUnknown(null)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-label={DETAIL_COPY.signals}>
        <h2 className="h3-display">{DETAIL_COPY.signals}</h2>
        <Rule />
        <p className="note">{DETAIL_COPY.signalNote}</p>
        <div className="verifier-pair">
          <div className="stack-tight">
            <p className="eyebrow">Signals raised on this project</p>
            <p className="figure-inline" data-signals={signals}>
              {formatCount(signals)}
            </p>
          </div>
          <div className="stack-tight">
            <p className="eyebrow">Periods published</p>
            <p className="figure-inline">{formatCount(closed.length)}</p>
          </div>
        </div>
        <p className="note">
          What each signal is about is the bank&rsquo;s to investigate and is
          not published here: the count is the published form.
        </p>
      </section>

      <section className="stack" aria-label={DETAIL_COPY.agents}>
        <h2 className="h3-display">{DETAIL_COPY.agents}</h2>
        <Rule />
        <p className="note">{DETAIL_COPY.agentNote}</p>
        <div className="verifier-pair">
          <div className="stack-tight">
            <p className="eyebrow">Agents on this project</p>
            <p className="figure-inline">{formatCount(agentFlagRates.length)}</p>
          </div>
          <div className="stack-tight">
            <p className="eyebrow">Enrolments carrying a flag</p>
            <p className="figure-inline" data-aggregate-flag-rate>
              {flaggedEnrolments === null
                ? orUnknown(null)
                : `${formatCount(flaggedEnrolments)} of ${formatCount(totalEnrolments)} · ${flagRate(
                    totalEnrolments === 0 ? 0 : flaggedEnrolments / totalEnrolments,
                  )}`}
            </p>
          </div>
        </div>
      </section>

      <section className="stack" aria-label={DETAIL_COPY.enrolment}>
        <h2 className="h3-display">{DETAIL_COPY.enrolment}</h2>
        <Rule />
        <p className="note">
          Enrolment is published in cells about a kilometre across, and the
          figure is the households in the cell. A household&rsquo;s own
          location is not in the contract at any granularity.
        </p>
        {geography.length === 0 ? (
          <p className="note">
            Nobody is enrolled on this project yet, so there is nothing to place.
          </p>
        ) : (
          <ul className="stack-tight">
            {geography.map((bucket) => (
              <li key={bucket.h3}>
                <div className="verifier-row" data-bucket={bucket.h3}>
                  <span className="record-cell">
                    {bucket.centroid[0].toFixed(2)}, {bucket.centroid[1].toFixed(2)}
                  </span>
                  <span className="record-cell">
                    {formatCount(bucket.households)} of {formatCount(project.enrolled)} households
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="note">{DETAIL_COPY.noPii}</p>
      </section>

      <section className="stack" aria-label="Published records">
        <h2 className="h3-display">Published records</h2>
        <Rule />
        <ul className="stack-tight">
          {attestations.map((attestation) => (
            <li key={attestation.id}>
              <div className="verifier-row wide" data-attestation={attestation.id}>
                <span>
                  <Link href={`/attestation/${attestation.id}`} prefetch={false}>
                    {formatPeriod(attestation.period)}
                  </Link>
                </span>
                <span className="record-cell">
                  {formatCoverage(attestation.paid, attestation.enrolled)} households
                </span>
                <span className="record-cell">
                  {coveragePercent(attestation.paid, attestation.enrolled)}% of those enrolled
                </span>
                <span>
                  <Stamp
                    state={
                      /* A correction is the record working as designed, so it
                         is sealed like any other published record. */
                      attestation.anchorState === "anchored" ? "sealed" : "review"
                    }
                    label={
                      attestation.supersededBy !== null
                        ? "Corrected"
                        : attestation.anchorState === "anchored"
                          ? "Sealed"
                          : "Waiting to anchor"
                    }
                    recordId={attestation.id}
                  />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
