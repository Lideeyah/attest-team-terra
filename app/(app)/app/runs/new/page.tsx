import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { ArithmeticPanel } from "@/components/console/ArithmeticPanel";
import { ExecuteRun } from "@/components/console/ExecuteRun";
import { PreflightExclusions } from "@/components/console/PreflightExclusions";
import { api } from "@/lib/api/client";
import { RUN_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import type { ErrorCode } from "@/lib/api/contract";
import { UNKNOWN, formatCount, formatNaira, formatPeriod } from "@/lib/record";

export const metadata: Metadata = {
  title: "New run",
};

type Search = { step?: string; funding?: string };

const STEPS = [
  { id: "roster", label: "Roster" },
  { id: "arithmetic", label: "Arithmetic" },
  { id: "preflight", label: "Pre-flight" },
  { id: "confirm", label: "Confirm" },
] as const;

/* What each refusal means on this screen. The code is never the heading: a
   reader is told the constraint and the arithmetic. */
const REFUSAL: Partial<Record<ErrorCode, { title: string; line: string }>> = {
  ROSTER_EMPTY: {
    title: "Nobody is enrolled",
    line: "Nobody is enrolled on this project, so there is no roster to pay. Enrolments arrive from the field app.",
  },
  PERIOD_CLOSED: {
    title: "That period is closed",
    line: "The period is closed and its figures are sealed. A payment after the close belongs to the next period, and a correction to this one publishes a second record.",
  },
  FUNDING_NOT_RECEIVED: {
    title: "No funding has arrived",
    line: "No funding has arrived for this period. The run can be built now and executes when the account is funded.",
  },
  FUNDING_INSUFFICIENT: {
    title: "Funding is less than the amount required",
    line: "What is in the account is less than the amount required by the commitment. The run proceeds on what is funded and the shortfall is recorded in the attestation.",
  },
  PREFLIGHT_EXCLUSIONS_REQUIRED: {
    title: "Enrolments must be excluded before this run executes",
    line: "Pre-flight found enrolments that cannot be paid as they stand. Each must be excluded with a reason or corrected before the run executes.",
  },
  FUNDING_EXCLUDES_CHARGES: {
    title: "Funding covers the payments but not the charges",
    line: "The amount funded covers what the households are owed and not the bank's charges on the transfers. The charges are borne by the project, so the shortfall is in the charges.",
  },
};

export default async function NewRunPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const step = STEPS.find((candidate) => candidate.id === search.step)?.id ?? "roster";
  const short = search.funding === "short";

  const session = await api.session();
  if (!session.ok || session.data.projectId === null) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="review" title="This account is not on a project yet">
          <p>A run belongs to a project, so this opens once one exists.</p>
        </Notice>
      </div>
    );
  }
  const projectId = session.data.projectId;

  const [projectResult, runsResult] = await Promise.all([
    api.project(projectId),
    api.runs(projectId),
  ]);

  const refusal = !projectResult.ok
    ? projectResult
    : !runsResult.ok
      ? runsResult
      : null;
  if (refusal) {
    const copy = REFUSAL[refusal.code];
    return (
      <div className="console-page stack-lg">
        <Notice
          tone={refusal.code === "FUNDING_INSUFFICIENT" ? "flagged" : "blocked"}
          title={copy?.title ?? headingFor(refusal.code, refusal.message)}
        >
          <p data-refusal={refusal.code}>{copy?.line ?? refusal.message}</p>
          <p className="note">{refusal.remediation}</p>
        </Notice>
      </div>
    );
  }

  const project = projectResult.ok ? projectResult.data : null;

  /* A suspended project cannot create a run, and the run builder is where
     that has to be said: home saying it is not the same as this screen
     offering to execute one. */
  if (project?.status === "suspended" || project?.status === "withdrawn") {
    return (
      <div className="console-page stack-lg">
        <header className="stack">
          <p className="eyebrow">{RUN_COPY.newHeading}</p>
          <h1 className="h2-display">No run can be created</h1>
          <Rule weight="heavy" />
        </header>
        <Notice
          tone="blocked"
          title={
            project.status === "suspended"
              ? "This project is suspended"
              : "This project is withdrawn"
          }
        >
          <p data-run-blocked={project.status}>
            The record stays readable and every figure already published stands.
            No new run is created while the project is {project.status}.
          </p>
        </Notice>
      </div>
    );
  }
  const runs = runsResult.ok ? runsResult.data : [];
  const openPeriod = project?.periods.find((period) => period.state === "open") ?? null;

  /* The run whose arithmetic this builder is showing: the funded draft for the
     open period, or the one still awaiting funding when the reader is looking
     at a shortfall. */
  const candidate =
    runs.find((run) =>
      short ? run.state === "awaiting-funding" : run.state === "funded",
    ) ??
    runs.find((run) => run.state === "draft") ??
    runs[0];

  const [arithmetic, preflight] = await Promise.all([
    candidate ? api.arithmetic(candidate.id) : Promise.resolve(null),
    step === "preflight" || step === "confirm"
      ? candidate
        ? api.preflight(candidate.id)
        : Promise.resolve(null)
      : Promise.resolve(null),
  ]);

  if (arithmetic && !arithmetic.ok) {
    const copy = REFUSAL[arithmetic.code];
    return (
      <div className="console-page stack-lg">
        <Notice
          tone={arithmetic.code === "FUNDING_INSUFFICIENT" ? "flagged" : "blocked"}
          title={copy?.title ?? headingFor(arithmetic.code, arithmetic.message)}
        >
          <p data-refusal={arithmetic.code}>{copy?.line ?? arithmetic.message}</p>
          <p className="note">{arithmetic.remediation}</p>
        </Notice>
      </div>
    );
  }

  const figures = arithmetic && arithmetic.ok ? arithmetic.data : null;
  const shortfall = figures ? Number(figures.shortfall) : 0;
  const exclusions = preflight && preflight.ok ? preflight.data.exclusions : [];
  const outstanding = exclusions.filter((exclusion) => !exclusion.excluded);
  const passed = preflight && preflight.ok ? preflight.data.passed : null;

  return (
    <div className="console-page reading stack-lg">
      <header className="stack">
        <p className="eyebrow">{RUN_COPY.newHeading}</p>
        <h1 className="h2-display">
          {openPeriod ? formatPeriod(openPeriod.period) : "No period is open"}
        </h1>
        <ol className="step-rail" aria-label="Steps">
          {STEPS.map((candidateStep) => (
            <li
              key={candidateStep.id}
              className="step-item"
              data-step={candidateStep.id}
              aria-current={candidateStep.id === step ? "step" : undefined}
            >
              <Link href={`/app/runs/new?step=${candidateStep.id}${short ? "&funding=short" : ""}`} prefetch={false}>
                {candidateStep.label}
              </Link>
            </li>
          ))}
        </ol>
        <Rule weight="heavy" />
      </header>

      {step === "roster" ? (
        <section className="stack" aria-label="Roster and period">
          <h2 className="h3-display">What this run pays</h2>
          <Rule />
          <dl className="record-grid">
            <div>
              <dt className="eyebrow">Period</dt>
              <dd className="record-cell">
                {openPeriod ? formatPeriod(openPeriod.period) : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Roster</dt>
              <dd className="record-cell">
                {formatCount(project?.enrolled ?? 0)} households enrolled
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Declared gross</dt>
              <dd className="record-cell">
                {figures ? formatNaira(figures.declaredGross) : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Funding allocated to this run</dt>
              <dd className="record-cell">
                {figures ? formatNaira(figures.funded) : UNKNOWN}
              </dd>
            </div>
          </dl>
          <p className="note">
            Every household on the roster with an active wallet is paid. An
            exclusion is a decision with a reason, made at pre-flight.
          </p>
        </section>
      ) : null}

      {step === "arithmetic" && figures ? (
        <ArithmeticPanel figures={figures} />
      ) : null}

      {step === "preflight" ? (
        <section className="stack" aria-label="Pre-flight">
          <h2 className="h3-display">Pre-flight</h2>
          <Rule />
          <PreflightExclusions
            runId={candidate?.id ?? ""}
            exclusions={exclusions}
            passed={passed === true}
          />
        </section>
      ) : null}

      {step === "confirm" && figures ? (
        <section className="stack" aria-label="Confirm">
          <h2 className="h3-display">What executing this run does</h2>
          <Rule />
          <ArithmeticPanel figures={figures} />
          {shortfall > 0 ? (
            <Notice tone="flagged" title="Funding is short of what this run requires">
              <p data-shortfall={figures.shortfall}>
                {RUN_COPY.shortfall(formatNaira(figures.shortfall))}
              </p>
              <p className="note">
                The shortfall is {formatNaira(figures.shortfall)} against{" "}
                {formatNaira(figures.totalNeeded)} required, and it is published
                in the period&rsquo;s attestation where it stays readable.
              </p>
            </Notice>
          ) : (
            <Notice title="Funding covers this run">
              <p>{RUN_COPY.noShortfall}</p>
            </Notice>
          )}
          {passed === false ? (
            <Notice
              tone="blocked"
              title={`${formatCount(outstanding.length)} enrolments are still outstanding at pre-flight`}
            >
              <p data-execute-blocked="exclusions">
                Each has to be excluded with a reason or corrected first. The
                run does not execute while pre-flight has not passed.
              </p>
              <p>
                <Link href="/app/runs/new?step=preflight" prefetch={false}>
                  Go back to pre-flight
                </Link>
              </p>
            </Notice>
          ) : (
            <ExecuteRun
              runId={candidate?.id ?? ""}
              shortfall={figures.shortfall}
              households={project?.enrolled ?? 0}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
