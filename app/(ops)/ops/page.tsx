import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Figure } from "@/components/Figure";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { CASE_COPY, OPS_COPY, SEVERITY_COPY, SIGNAL_COPY } from "@/lib/copy/ops";
import { formatCount, formatNaira, formatPeriod } from "@/lib/record";

export const metadata: Metadata = {
  title: "Bank operations",
};

export default async function OpsHome() {
  await connection();
  const [signals, cases, exceptions, reconciliation] = await Promise.all([
    api.signals({}),
    api.cases({}),
    api.exceptions({}),
    api.opsReconciliation(),
  ]);

  if (!signals.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(signals.code, "The queue could not be read")}>
          <p>{signals.message}</p>
        </Notice>
      </div>
    );
  }

  const openCases = cases.ok
    ? cases.data.filter((row) => row.state === "open" || row.state === "investigating")
    : [];
  const bySeverity = {
    high: openCases.filter((row) => row.severity === "high").length,
    medium: openCases.filter((row) => row.severity === "medium").length,
    low: openCases.filter((row) => row.severity === "low").length,
  };
  const unresolved = exceptions.ok
    ? exceptions.data.filter((row) => row.resolution === null)
    : [];
  const mismatched = reconciliation.ok
    ? reconciliation.data.filter((row) => row.state === "mismatch")
    : [];
  const nothingOpen =
    signals.data.length === 0 && openCases.length === 0 && mismatched.length === 0;

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{OPS_COPY.surface}</p>
        <h1 className="h2-display">This period</h1>
        <p className="lede">{OPS_COPY.evidenceStaysHere}</p>
        <Rule weight="heavy" />
      </header>

      {nothingOpen ? <EmptyState line={OPS_COPY.nothingOpen} /> : null}

      <section className="figure-row" aria-label="Open work">
        <Figure
          label="Cases open"
          value={formatCount(openCases.length)}
          denominator={`of ${formatCount(cases.ok ? cases.data.length : 0)} opened altogether`}
        />
        <Figure
          label="Looked at first"
          value={formatCount(bySeverity.high)}
          denominator={`of ${formatCount(openCases.length)} open cases`}
        />
        <Figure
          label="Signals this period"
          value={formatCount(signals.data.length)}
          denominator={`across ${formatCount(new Set(signals.data.map((row) => row.projectId)).size)} projects`}
        />
        <Figure
          label="Verification exceptions"
          value={formatCount(unresolved.length)}
          denominator={`of ${formatCount(exceptions.ok ? exceptions.data.length : 0)} raised`}
        />
      </section>

      {mismatched.length > 0 ? (
        <Notice tone="blocked" title={`${formatCount(mismatched.length)} periods do not reconcile`}>
          <p data-reconciliation="mismatch">
            Inbound funding does not match the transfers recorded against it.
            Each is on the reconciliation screen with its delta and what could
            account for it.
          </p>
          <p>
            <Link href="/ops/reconciliation" prefetch={false}>
              The periods that do not reconcile
            </Link>
          </p>
        </Notice>
      ) : null}

      <section className="stack" aria-label="Signals">
        <h2 className="h3-display">Signals</h2>
        <Rule />
        {signals.data.length === 0 ? (
          <p className="note">No signal has been raised this period.</p>
        ) : (
          <ul className="stack-tight">
            {signals.data.slice(0, 6).map((signal) => (
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
                  <div className="verifier-row wide" data-signal={signal.id}>
                    <span>
                      <Link href={`/ops/signals/${signal.id}`} prefetch={false}>
                        {SIGNAL_COPY[signal.class].heading}
                      </Link>
                    </span>
                    <span className="record-cell">{signal.projectName}</span>
                    <span className="record-cell">{formatPeriod(signal.period)}</span>
                    <span className="record-cell">
                      {formatCount(signal.accounts)} accounts
                    </span>
                    <span className="record-cell">{SEVERITY_COPY[signal.severity]}</span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-label="Cases">
        <h2 className="h3-display">Cases</h2>
        <Rule />
        {openCases.length === 0 ? (
          <p className="note">No case is open.</p>
        ) : (
          <ul className="stack-tight">
            {openCases.map((row) => (
              <li key={row.id}>
                <Strip state={row.severity === "high" ? "blocked" : "flagged"}>
                  <div className="verifier-row wide" data-case={row.id}>
                    <span>
                      <Link href="/ops/cases" prefetch={false}>
                        {row.id}
                      </Link>
                    </span>
                    <span className="record-cell">{row.projectName}</span>
                    <span className="record-cell">{CASE_COPY[row.state]}</span>
                    <span className="record-cell">
                      {formatCount(row.signalIds.length)} signals
                    </span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-label="Reconciliation">
        <h2 className="h3-display">Reconciliation across projects</h2>
        <Rule />
        <ul className="stack-tight">
          {(reconciliation.ok ? reconciliation.data : []).map((row) => (
            <li key={`${row.projectId}-${row.period}`}>
              <Strip state={row.state === "mismatch" ? "blocked" : undefined}>
                <div className="verifier-row wide" data-reconciliation-row={row.period}>
                  <span className="record-cell">{row.projectName}</span>
                  <span className="record-cell">{formatPeriod(row.period)}</span>
                  <span className="record-cell">{formatNaira(row.inbound)} in</span>
                  <span className="record-cell">{formatNaira(row.outbound)} out</span>
                  <span className="record-cell">
                    {row.state === "mismatch"
                      ? `${formatNaira(row.delta)} unaccounted for`
                      : row.state === "period-open"
                        ? "Period open"
                        : row.state === "awaiting-settlement"
                          ? "Awaiting settlement data"
                          : "Reconciled"}
                  </span>
                </div>
              </Strip>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
