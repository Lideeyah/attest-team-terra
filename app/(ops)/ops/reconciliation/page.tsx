import type { Metadata } from "next";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { RECONCILIATION_COPY } from "@/lib/copy/ops";
import { formatCount, formatNaira, formatPeriod } from "@/lib/record";

export const metadata: Metadata = {
  title: "Reconciliation",
};

export default async function ReconciliationPage() {
  await connection();
  const result = await api.opsReconciliation();

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "Reconciliation could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = result.data;
  const mismatched = rows.filter((row) => row.state === "mismatch");

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{RECONCILIATION_COPY.heading}</p>
        <h1 className="h2-display">
          {formatCount(mismatched.length)} of {formatCount(rows.length)} periods do not reconcile
        </h1>
        <p className="lede">
          Inbound developer funding against outbound transfers against the
          balance, per project and per period.
        </p>
        <Rule weight="heavy" />
      </header>

      <ul className="stack-lg">
        {rows.map((row) => (
          <li
            key={`${row.projectId}-${row.period}`}
            className="panel stack"
            data-reconciliation={row.period}
            data-state={row.state}
          >
            <div className="row-between">
              <div className="stack-tight">
                <p className="eyebrow">{row.projectName}</p>
                <h2 className="h3-display">{formatPeriod(row.period)}</h2>
              </div>
              <p className="record-cell">
                {row.state === "mismatch"
                  ? `${formatNaira(row.delta)} unaccounted for`
                  : row.state === "period-open"
                    ? "Period open"
                    : row.state === "awaiting-settlement"
                      ? "Awaiting settlement data"
                      : "Reconciled"}
              </p>
            </div>
            <Rule />
            <dl className="record-grid">
              <div>
                <dt className="eyebrow">Inbound</dt>
                <dd className="record-cell">{formatNaira(row.inbound)}</dd>
              </div>
              <div>
                <dt className="eyebrow">Outbound to households</dt>
                <dd className="record-cell">{formatNaira(row.outbound)}</dd>
              </div>
              <div>
                <dt className="eyebrow">Charges</dt>
                <dd className="record-cell">{formatNaira(row.charges)}</dd>
              </div>
              <div>
                <dt className="eyebrow">Balance</dt>
                <dd className="record-cell">{formatNaira(row.balance)}</dd>
              </div>
            </dl>

            <p className="note">
              {row.state === "mismatch"
                ? RECONCILIATION_COPY.mismatch
                : row.state === "period-open"
                  ? RECONCILIATION_COPY.open
                  : row.state === "awaiting-settlement"
                    ? RECONCILIATION_COPY.awaiting
                    : RECONCILIATION_COPY.reconciled}
            </p>

            {row.state === "mismatch" && row.candidateCauses.length > 0 ? (
              <>
                <Strip state="blocked">
                  <p className="record-cell">
                    {formatCount(row.candidateCauses.length)} things could account for it
                  </p>
                </Strip>
                <ul className="note-list">
                  {row.candidateCauses.map((cause) => (
                    <li key={cause} className="note">
                      {cause}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
