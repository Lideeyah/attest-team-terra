import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { AlertBuilder } from "@/components/verifier/AlertBuilder";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { ALERT_COPY } from "@/lib/copy/verifier";
import { formatDate, orUnknown } from "@/lib/record";

export const metadata: Metadata = {
  title: "Alerts",
};

type Search = { fired?: string; configured?: string };

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const [alerts, register] = await Promise.all([
    api.alerts(),
    api.register({ per_page: 50 }),
  ]);

  if (!alerts.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(alerts.code, "Your alerts could not be read")}>
          <p>{alerts.message}</p>
        </Notice>
      </div>
    );
  }

  /* An account with nothing configured is the normal first visit, and the
     state panel reaches it here. */
  const rows = search.configured === "none" ? [] : alerts.data;
  const projects = register.ok
    ? register.data.map((row) => ({ id: row.id, name: row.name }))
    : [];
  const highlighted = search.fired ?? null;

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{ALERT_COPY.heading}</p>
        <h1 className="h2-display">Tell me when a record changes</h1>
        <p className="lede">{ALERT_COPY.firedNote}</p>
        <Rule weight="heavy" />
      </header>

      {rows.length === 0 ? (
        <EmptyState line={ALERT_COPY.none} />
      ) : (
        <ul className="stack-tight">
          {rows.map((alert) => (
            <li key={alert.id}>
              <Strip state={alert.firedAt ? "review" : undefined}>
                <div
                  className="verifier-row wide"
                  data-alert={alert.id}
                  data-fired={alert.firedAt ? "true" : "false"}
                >
                  <span className="record-cell">
                    {ALERT_COPY.conditions[alert.condition]}
                  </span>
                  <span className="record-cell">
                    {orUnknown(
                      projects.find((project) => project.id === alert.projectId)?.name ??
                        null,
                    )}
                  </span>
                  <span className="record-cell">
                    {alert.condition === "coverage-below"
                      ? `below ${Math.round(alert.threshold * 100)}%`
                      : "—"}
                  </span>
                  <span className="record-cell">
                    {alert.firedAt
                      ? ALERT_COPY.fired(formatDate(alert.firedAt))
                      : "Not fired"}
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
              {highlighted === alert.id && alert.firedAt ? (
                <Notice tone="review" title="This alert fired">
                  <p data-alert-fired={alert.id}>
                    {ALERT_COPY.conditions[alert.condition]} on{" "}
                    {formatDate(alert.firedAt)}. The record is linked above and
                    is the thing to read; the alert itself says nothing about
                    what it means.
                  </p>
                </Notice>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AlertBuilder projects={projects} />
    </div>
  );
}
