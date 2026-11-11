import type { Metadata } from "next";
import { connection } from "next/server";
import { OnboardingDecision } from "@/components/admin/ReviewDecision";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatDate } from "@/lib/record";

export const metadata: Metadata = { title: "Onboarding review" };

const STATE_LABEL: Record<string, string> = {
  "awaiting-review": "Waiting to be read",
  "registry-unverified": "Entered by hand, unverified",
  "kyb-outstanding": "The bank has not answered",
  approved: "Approved",
  returned: "Returned to the operator",
};

export default async function OnboardingReviewPage() {
  if(process.env.ATTEST_API_MODE==='live')return null;
  await connection();
  const result = await api.onboardingReviews();

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "The queue could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const rows = result.data;

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Onboarding review</p>
        <h1 className="h2-display">
          {(() => {
            const undecided = rows.filter((row) => row.state !== "approved").length;
            return undecided === 1
              ? `1 of ${formatCount(rows.length)} projects in review`
              : `${formatCount(undecided)} of ${formatCount(rows.length)} projects in review`;
          })()}
        </h1>
        <p className="lede">
          Nothing a project submits is published until it has been read against
          the registry&rsquo;s own record. A project entered by hand is read
          more carefully, because the registry is what makes the project real.
        </p>
        <Rule weight="heavy" />
      </header>

      {rows.length === 0 ? (
        <EmptyState line="No project is waiting to be reviewed." />
      ) : (
        <ul className="stack-lg">
          {rows.map((row) => (
            <li key={row.projectId} className="panel stack" data-review={row.projectId}>
              <div className="row-between">
                <div className="stack-tight">
                  <p className="eyebrow">
                    {row.developerName} · {row.registry} {row.registryId}
                  </p>
                  <h2 className="h3-display">{row.projectName}</h2>
                </div>
                <Stamp
                  state={
                    row.state === "approved"
                      ? "sealed"
                      : row.state === "returned"
                        ? "flagged"
                        : row.manualEntry
                          ? "flagged"
                          : "review"
                  }
                  label={STATE_LABEL[row.state]}
                  recordId={row.projectId}
                />
              </div>
              <Rule />
              <p className="record-cell">Submitted {formatDate(row.submittedAt)}</p>
              {row.manualEntry ? (
                <Notice tone="flagged" title="These details were entered by hand">
                  <p data-manual-entry={row.projectId}>
                    The registry did not answer when this project was created,
                    so the name, the country and the methodology are the
                    operator&rsquo;s own account of them. Check each against
                    the registry&rsquo;s page before this is published.
                  </p>
                </Notice>
              ) : null}
              <ul className="note-list">
                {row.outstanding.map((item) => (
                  <li key={item} className="note">
                    {item}
                  </li>
                ))}
              </ul>
              {row.decidedNote !== null && row.decidedAt !== null ? (
                <Notice
                  title={
                    row.state === "approved"
                      ? "Approved, and the page is public"
                      : "Returned to the operator"
                  }
                >
                  {/* The reason, verbatim. It is required when the decision is
                      made, so it is shown where the decision is read: a later
                      reviewer or an auditor sees why this page is public, or
                      why the submission went back. */}
                  <p data-review-decided={row.projectId}>{row.decidedNote}</p>
                  <p className="note">Decided {formatDate(row.decidedAt)}.</p>
                </Notice>
              ) : null}
              {row.state === "approved" ? null : (
                <>
                  <Rule />
                  <OnboardingDecision projectId={row.projectId} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
