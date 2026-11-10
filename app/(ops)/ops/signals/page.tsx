import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { OPS_COPY, SEVERITY_COPY, SIGNAL_COPY } from "@/lib/copy/ops";
import { formatCount, formatDate, formatPeriod } from "@/lib/record";
import type { Signal } from "@/lib/api/contract";

export const metadata: Metadata = {
  title: "Signals",
};

type Search = { class?: string; severity?: string; state?: string };

const CLASSES: Signal["class"][] = [
  "onward-concentration",
  "velocity",
  "shared-device",
  "dormant-reactivation",
  "round-tripping",
];

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const result = await api.signals({
    ...(search.class ? { class: search.class } : {}),
    ...(search.severity ? { severity: search.severity } : {}),
  });

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "The queue could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  /* An empty queue and a queue whose signals are all on cases are different
     things, and both are states this screen has. */
  const rows =
    search.state === "none"
      ? []
      : search.state === "attached"
        ? result.data.map((signal) => ({
            ...signal,
            state: "attached" as const,
            caseId: signal.caseId ?? "case_0231",
          }))
        : result.data;

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Signals</p>
        <h1 className="h2-display">{formatCount(rows.length)} signals</h1>
        <p className="lede">{OPS_COPY.evidenceStaysHere}</p>
        <Rule weight="heavy" />
      </header>

      <form className="search-row" method="get" action="/ops/signals">
        <div className="field" style={{ minWidth: "260px" }}>
          <label className="label" htmlFor="signal-class">
            What was seen
          </label>
          <select
            id="signal-class"
            className="select"
            name="class"
            defaultValue={search.class ?? ""}
          >
            <option value="">Anything</option>
            {CLASSES.map((signalClass) => (
              <option key={signalClass} value={signalClass}>
                {SIGNAL_COPY[signalClass].heading}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: "200px" }}>
          <label className="label" htmlFor="signal-severity">
            Order
          </label>
          <select
            id="signal-severity"
            className="select"
            name="severity"
            defaultValue={search.severity ?? ""}
          >
            <option value="">Any</option>
            <option value="high">{SEVERITY_COPY.high}</option>
            <option value="medium">{SEVERITY_COPY.medium}</option>
            <option value="low">{SEVERITY_COPY.low}</option>
          </select>
        </div>
        <button type="submit" className="btn-outline btn-sm">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState line="No signal matches. Nothing has been raised that fits this." />
      ) : (
        <ul className="stack">
          {rows.map((signal) => (
            <li key={signal.id}>
              <Strip
                state={
                  signal.severity === "high"
                    ? "blocked"
                    : signal.severity === "medium"
                      ? "flagged"
                      : undefined
                }
              >
                <div className="signal-row" data-signal-class={signal.class}>
                  <div className="stack-tight">
                    <p className="eyebrow">
                      {signal.projectName} · {formatPeriod(signal.period)} ·{" "}
                      {SEVERITY_COPY[signal.severity]}
                    </p>
                    <h2 className="h3-display">
                      <Link href={`/ops/signals/${signal.id}`} prefetch={false}>
                        {SIGNAL_COPY[signal.class].heading}
                      </Link>
                    </h2>
                    <p className="note">{SIGNAL_COPY[signal.class].what}</p>
                    <p className="note">{signal.summary}</p>
                  </div>
                  <div className="stack-tight">
                    <p className="record-cell">
                      {formatCount(signal.accounts)} accounts
                    </p>
                    <p className="record-cell">Raised {formatDate(signal.raisedAt)}</p>
                    {signal.caseId ? (
                      <p className="record-cell" data-signal-case={signal.caseId}>
                        On case {signal.caseId}
                      </p>
                    ) : (
                      <p className="record-cell">Not on a case</p>
                    )}
                  </div>
                </div>
              </Strip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
