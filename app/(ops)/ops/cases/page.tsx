import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { CaseActions } from "@/components/ops/CaseActions";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { CASE_COPY } from "@/lib/copy/ops";
import { formatCount, formatDateTime } from "@/lib/record";

export const metadata: Metadata = {
  title: "Cases",
};

type Search = { action?: string };

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const result = await api.cases({});

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "The cases could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = result.data;

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Cases</p>
        <h1 className="h2-display">{formatCount(rows.length)} cases</h1>
        <p className="lede">
          A case is an investigation into accounts, not a finding about a
          project. What it concludes, and on what basis, is written into it.
        </p>
        <Rule weight="heavy" />
      </header>

      {search.action === "pending" ? (
        <Notice tone="review" title="An action is waiting for authorisation">
          <p data-action-state="pending">
            Freezing an account needs a second authorisation from the financial
            crime desk. Nothing has been frozen and the request is with them.
          </p>
        </Notice>
      ) : null}

      {search.action === "refused" ? (
        <Notice tone="blocked" title="This account does not have access to that action">
          <p data-action-state="refused">
            Freezing and escalation are taken by the financial crime desk. This
            console asked and was refused, and nothing was changed.
          </p>
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState line="No case has been opened." />
      ) : (
        <ul className="stack-lg">
          {rows.map((row) => (
            <li key={row.id} className="panel stack" data-case={row.id}>
              <div className="row-between">
                <div className="stack-tight">
                  <p className="eyebrow">
                    {row.id} · {row.projectName}
                  </p>
                  <h2 className="h3-display">{CASE_COPY[row.state]}</h2>
                </div>
                <p className="record-cell">
                  {formatCount(row.signalIds.length)} signals · opened{" "}
                  {formatDateTime(row.openedAt)}
                </p>
              </div>
              <Rule />
              <ol className="stack-tight">
                {row.actions.map((action) => (
                  <li key={action.at} className="case-action">
                    <span className="record-cell">{formatDateTime(action.at)}</span>
                    <span className="record-cell">{action.action}</span>
                    <span className="note">{action.note}</span>
                    <span className="record-cell">{action.by}</span>
                  </li>
                ))}
              </ol>
              <CaseActions caseId={row.id} state={row.state} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
