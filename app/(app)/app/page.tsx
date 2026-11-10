import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ButtonLink } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Figure } from "@/components/Figure";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { LiveRunStrip } from "@/components/console/LiveRunStrip";
import { consoleContext } from "@/lib/console";
import { settledOf } from "@/lib/console-format";
import { CONSOLE_COPY, RUN_STATE_LABEL } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import type { ErrorCode } from "@/lib/api/contract";
import {
  formatCount,
  formatCoverage,
  formatDate,
  formatNaira,
  formatPeriod,
} from "@/lib/record";

export const metadata: Metadata = {
  title: "Home",
};

export default async function ConsoleHome() {
  await connection();
  const context = await consoleContext();

  /* A refusal on this screen is about the project, not about the reader: a
     suspended project still has a record to read. */
  if (!("project" in context)) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="blocked" title={headingFor(context.code as ErrorCode, context.error)}>
          <p>{context.error}</p>
        </Notice>
      </div>
    );
  }

  const {
    project,
    openPeriod,
    lastClosedPeriod,
    openRun,
    actions,
    flagged,
    period,
    enrolled,
  } = context;
  const disputesOpen = context.disputes.filter(
    (dispute) => dispute.state === "open" || dispute.state === "developer-responded",
  ).length;
  const shortfall = openPeriod?.shortfall ?? lastClosedPeriod?.shortfall ?? "0.00";
  const coveragePeriod = openPeriod ?? lastClosedPeriod;
  const target = project.enrolmentTarget;
  const closing = period.state === "open" && period.daysToClose <= 3;

  return (
    <div className="console-page stack-lg">
      <header className="stack">
        <p className="eyebrow">{project.name}</p>
        <h1 className="h2-display">
          {openPeriod
            ? `${formatPeriod(openPeriod.period)} is open`
            : lastClosedPeriod
              ? `${formatPeriod(lastClosedPeriod.period)} is closed`
              : "No period has opened yet"}
        </h1>
        <p className="lede">
          {openPeriod
            ? `The period closes on ${period.closesOn}. Every figure below is computed from transfers that cleared.`
            : "Figures are sealed at close. A correction after that publishes a second record beside the first."}
        </p>
        <Rule weight="heavy" />
      </header>

      {project.status === "suspended" ? (
        <Notice tone="blocked" title="This project is suspended">
          <p>{CONSOLE_COPY.suspended}</p>
        </Notice>
      ) : null}

      {closing ? (
        <Notice
          tone="review"
          title={`${formatPeriod(period.label)} closes ${
            period.daysToClose === 0
              ? "today"
              : period.daysToClose === 1
                ? "tomorrow"
                : `in ${period.daysToClose} days`
          }`}
        >
          <p>
            Enrolments after the close are counted in the next period. The
            figures for this one are sealed at close.
          </p>
        </Notice>
      ) : null}

      {enrolled === 0 ? (
        <EmptyState
          line={CONSOLE_COPY.preFirstEnrolment}
          action={<ButtonLink href="/app/roster">Import a roster</ButtonLink>}
        />
      ) : (
        <>
          <section className="figure-row" aria-label="This period">
            <Figure
              label="Coverage this period"
              value={
                coveragePeriod
                  ? formatCoverage(coveragePeriod.paid, coveragePeriod.enrolled)
                  : "—"
              }
              denominator={
                coveragePeriod
                  ? `households settled in ${formatPeriod(coveragePeriod.period)}, confirmed or not`
                  : "no period open"
              }
              tally={coveragePeriod?.paid}
              formatAs="coverage"
              against={coveragePeriod?.enrolled ?? 1}
            />
            <Figure
              label="Open shortfall"
              value={formatNaira(shortfall)}
              denominator={
                Number(shortfall) > 0
                  ? `against ${formatNaira(openPeriod?.required ?? "0.00")} required by the commitment`
                  : "Funding covers what the commitment requires"
              }
            />
            <Figure
              label="Enrolled against target"
              value={formatCount(enrolled)}
              denominator={
                target > 0
                  ? `of ${formatCount(target)} households the project undertook to enrol`
                  : "no target recorded for this project"
              }
              tally={enrolled}
            />
            <Figure
              label="Open reports"
              value={formatCount(disputesOpen)}
              denominator={`of ${formatCount(context.disputes.length)} reports raised altogether`}
            />
            <Figure
              label="Flagged enrolments"
              value={formatCount(flagged)}
              denominator={`of ${formatCount(enrolled)} on the roster`}
            />
          </section>

          {openRun ? (
            <section className="stack" aria-label="Run in flight">
              <div className="row-between">
                <h2 className="h3-display">
                  {formatPeriod(openRun.period)} run · {RUN_STATE_LABEL[openRun.state]}
                </h2>
                <ButtonLink href={`/app/runs/${openRun.id}`} variant="outline" small>
                  Open the run
                </ButtonLink>
              </div>
              <LiveRunStrip
                runId={openRun.id}
                queued={openRun.counts.queued}
                inFlight={openRun.counts.in_flight}
                settled={settledOf(openRun)}
                failed={openRun.counts.failed}
                rosterSize={openRun.rosterSize}
              />
            </section>
          ) : null}

          <section className="stack" aria-label={CONSOLE_COPY.actionsHeading}>
            <h2 className="h3-display">{CONSOLE_COPY.actionsHeading}</h2>
            <Rule />
            {actions.length === 0 ? (
              <p className="prose">{CONSOLE_COPY.actionsEmpty}</p>
            ) : (
              <ol className="action-list">
                {actions.map((action) => (
                  <li key={action.id} className="action-row" data-action={action.id}>
                    {action.blocking ? (
                      <span className="mark action-mark" aria-hidden="true" />
                    ) : (
                      <span className="action-mark-space" aria-hidden="true" />
                    )}
                    <Link href={action.href} className="action-line" prefetch={false}>
                      {action.line}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="stack" aria-label="Next close">
            <h2 className="h3-display">Next close</h2>
            <Rule />
            <p className="prose">
              {openPeriod
                ? `${formatPeriod(openPeriod.period)} closes on ${period.closesOn}, which is ${
                    period.daysToClose === 1 ? "one day" : `${period.daysToClose} days`
                  } from today.`
                : "No period is open."}
            </p>
            {lastClosedPeriod ? (
              <div className="row-between">
                <p className="record-cell">
                  {formatPeriod(lastClosedPeriod.period)} closed{" "}
                  {lastClosedPeriod.closedAt
                    ? formatDate(lastClosedPeriod.closedAt)
                    : "—"}
                </p>
                <Stamp
                  state={lastClosedPeriod.state === "closed-late" ? "flagged" : "sealed"}
                  label={lastClosedPeriod.state === "closed-late" ? "Closed late" : "Sealed"}
                  recordId={lastClosedPeriod.period}
                />
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
