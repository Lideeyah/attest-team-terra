import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { FUNDING_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import { formatDateTime, formatNaira, formatPeriod } from "@/lib/record";

export const metadata: Metadata = {
  title: "Funding",
};

export default async function FundingPage() {
  await connection();
  const session = await api.session();
  if (!session.ok || session.data.projectId === null) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="review" title="This account is not on a project yet">
          <p>A disbursement account belongs to a project.</p>
        </Notice>
      </div>
    );
  }
  const projectId = session.data.projectId;
  const [funding, reconciliation] = await Promise.all([
    api.funding(projectId),
    api.reconciliation(projectId),
  ]);

  if (!funding.ok) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="blocked" title={headingFor(funding.code, funding.message)}>
          <p data-refusal={funding.code}>{funding.message}</p>
          <p className="note">{funding.remediation}</p>
        </Notice>
      </div>
    );
  }

  const account = funding.data;
  const rows = reconciliation.ok ? reconciliation.data : [];
  const mismatched = rows.filter((row) => row.state === "mismatch");
  const balance = Number(account.balance);

  return (
    <div className="console-page reading stack-lg">
      <header className="stack">
        <p className="eyebrow">{FUNDING_COPY.heading}</p>
        <h1 className="h2-display">{formatNaira(account.balance)} in the account</h1>
        <Rule weight="heavy" />
      </header>

      {mismatched.length > 0 ? (
        <Notice tone="blocked" title="A period does not reconcile">
          <p data-reconciliation="mismatch">{FUNDING_COPY.mismatch}</p>
        </Notice>
      ) : null}

      {balance > 0 ? (
        <Notice title="The balance carries forward">
          <p data-funding="overfunded">{FUNDING_COPY.overfunded(formatNaira(account.balance))}</p>
        </Notice>
      ) : null}

      <section className="stack" aria-label="The disbursement account">
        <h2 className="h3-display">The account to pay into</h2>
        <Rule />
        <dl className="record-grid">
          <div>
            <dt className="eyebrow">Account number</dt>
            <dd className="record-cell">{account.accountNumber}</dd>
          </div>
          <div>
            <dt className="eyebrow">Account name</dt>
            <dd className="record-cell">{account.accountName}</dd>
          </div>
          <div>
            <dt className="eyebrow">Bank</dt>
            <dd className="record-cell">{account.bank}</dd>
          </div>
        </dl>
      </section>

      <section className="stack" aria-label="Inbound payments">
        <h2 className="h3-display">Inbound</h2>
        <Rule />
        {account.inbound.length === 0 ? (
          <EmptyState line={FUNDING_COPY.none} />
        ) : (
          <ul className="stack-tight">
            {account.inbound.map((payment) => (
              <li key={payment.reference}>
                <Strip>
                  <div className="funding-row" data-inbound={payment.reference}>
                    <span className="record-cell">{payment.reference}</span>
                    <span className="record-cell">{formatNaira(payment.amount)}</span>
                    <span className="record-cell">
                      {formatDateTime(payment.receivedAt)}
                    </span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-label="Against the transfers">
        <h2 className="h3-display">Against the transfers</h2>
        <Rule />
        <dl className="record-grid">
          <div>
            <dt className="eyebrow">Funded</dt>
            <dd className="record-cell">{formatNaira(account.funded)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Paid to households</dt>
            <dd className="record-cell">{formatNaira(account.outbound)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Charges borne by the project</dt>
            <dd className="record-cell">{formatNaira(account.charges)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Balance</dt>
            <dd className="record-cell">{formatNaira(account.balance)}</dd>
          </div>
        </dl>
        <p className="note">
          Charges are borne by the project. A household receives the amount the
          agreement owes it and nothing is deducted from the payment.
        </p>
      </section>

      <section className="stack" aria-label="Reconciliation by period">
        <h2 className="h3-display">By period</h2>
        <Rule />
        {rows.length === 0 ? (
          <p className="prose">No period has been reconciled yet.</p>
        ) : (
          <ul className="stack-tight">
            {rows.map((row) => (
              <li key={row.period}>
                <Strip
                  state={
                    row.state === "mismatch"
                      ? "blocked"
                      : row.state === "awaiting-settlement"
                        ? "review"
                        : undefined
                  }
                >
                  <div className="funding-row" data-reconciliation-row={row.period}>
                    <span className="record-cell">{formatPeriod(row.period)}</span>
                    <span className="record-cell">{formatNaira(row.inbound)}</span>
                    <span className="record-cell">{formatNaira(row.outbound)}</span>
                    <span className="record-cell">
                      {row.state === "mismatch"
                        ? `Does not reconcile by ${formatNaira(row.delta)}`
                        : row.state === "period-open"
                          ? "Period open"
                          : row.state === "awaiting-settlement"
                            ? "Awaiting settlement"
                            : "Reconciled"}
                    </span>
                  </div>
                </Strip>
                {row.state === "mismatch" && row.candidateCauses.length > 0 ? (
                  <ul className="note-list">
                    {row.candidateCauses.map((cause) => (
                      <li key={cause} className="note">
                        {cause}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
