import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { VERIFIER_COPY } from "@/lib/copy/verifier";
import { ALERT_COPY } from "@/lib/copy/verifier";
import {
  confirmationPercent,
  coveragePercent,
  formatCount,
  formatCoverage,
  formatDate,
  formatPeriod,
  orUnknown,
} from "@/lib/record";

export const metadata: Metadata = {
  title: "Verifier",
};

type Search = { watchlist?: string; since?: string };

export default async function VerifierHome({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const [watchlist, alerts] = await Promise.all([
    api.watchlist(),
    api.alerts(),
  ]);

  if (!watchlist.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(watchlist.code, "The watchlist could not be read")}>
          <p>{watchlist.message}</p>
        </Notice>
      </div>
    );
  }

  /* An empty watchlist is a state a reader can arrange, and an empty one is
     the normal first visit. */
  const rows = search.watchlist === "empty" ? [] : watchlist.data;
  const fired = alerts.ok ? alerts.data.filter((alert) => alert.firedAt !== null) : [];
  const nothingChanged = search.since === "now";

  const closes = rows
    .filter((row) => row.lastClosedPeriod !== null)
    .map((row) => ({
      projectId: row.id,
      projectName: row.name,
      period: row.lastClosedPeriod as string,
      /* The figures for the period named, not the project's current ones:
         those belong to the period still open. */
      paid: row.lastClosedPaid,
      enrolled: row.lastClosedEnrolled,
      confirmed: row.lastClosedConfirmationRate,
    }));

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{VERIFIER_COPY.surface}</p>
        <h1 className="h2-display">Your watchlist</h1>
        <p className="lede">{VERIFIER_COPY.factsNotVerdicts}</p>
        <Rule weight="heavy" />
      </header>

      {rows.length === 0 ? (
        <EmptyState line={VERIFIER_COPY.watchlistEmpty} />
      ) : nothingChanged ? (
        <Notice title="Nothing has changed">
          <p data-watchlist="unchanged">{VERIFIER_COPY.nothingChanged}</p>
        </Notice>
      ) : null}

      {rows.length > 0 ? (
        <section className="stack" aria-label={VERIFIER_COPY.recentCloses}>
          <h2 className="h3-display">{VERIFIER_COPY.recentCloses}</h2>
          <Rule />
          <ul className="stack-tight">
            {closes.map((close) => (
              <li key={`${close.projectId}-${close.period}`}>
                <Strip>
                  <div className="verifier-row" data-close={close.projectId}>
                    <span>
                      <Link href={`/verifier/projects/${close.projectId}`} prefetch={false}>
                        {close.projectName}
                      </Link>
                    </span>
                    <span className="record-cell">{formatPeriod(close.period)}</span>
                    <span className="record-cell">
                      {formatCoverage(close.paid, close.enrolled)} households paid ·{" "}
                      {coveragePercent(close.paid, close.enrolled)}%
                    </span>
                    <span className="record-cell">
                      {confirmationPercent(close.confirmed)}% of those confirmed
                      receiving it
                    </span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <section className="stack" aria-label={VERIFIER_COPY.recentDisputes}>
          <h2 className="h3-display">{VERIFIER_COPY.recentDisputes}</h2>
          <Rule />
          <ul className="stack-tight">
            {rows.map((row) => (
              <li key={row.id}>
                {/* No edge colour here: a project with an open report is not
                    a project in a worse state, and an edge that appears for
                    one project and not another is a traffic light. */}
                <Strip>
                  <div className="verifier-row" data-disputes={row.id}>
                    <span className="record-cell">{row.name}</span>
                    <span className="record-cell">
                      {formatCount(row.openDisputes)} reports open on this
                      project
                    </span>
                    <span className="record-cell">
                      <Link href={`/verifier/projects/${row.id}`} prefetch={false}>
                        The reports
                      </Link>
                    </span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="stack" aria-label={VERIFIER_COPY.alertsFired}>
        <h2 className="h3-display">{VERIFIER_COPY.alertsFired}</h2>
        <Rule />
        {fired.length === 0 ? (
          <p className="note">No alert has fired.</p>
        ) : (
          <ul className="stack-tight">
            {fired.map((alert) => (
              <li key={alert.id}>
                <Strip state="review">
                  <div className="verifier-row" data-alert={alert.id}>
                    <span className="record-cell">
                      {ALERT_COPY.conditions[alert.condition]}
                    </span>
                    <span className="record-cell">
                      {ALERT_COPY.fired(formatDate(alert.firedAt as string))}
                    </span>
                    <span className="record-cell">
                      {alert.record ? (
                        <Link href={`/attestation/${alert.record}`} prefetch={false}>
                          The record that fired it
                        </Link>
                      ) : (
                        orUnknown(null)
                      )}
                    </span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        )}
        <p className="note">{ALERT_COPY.firedNote}</p>
      </section>
    </div>
  );
}
