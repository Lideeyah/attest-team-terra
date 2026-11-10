import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Figure } from "@/components/Figure";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import { formatCount, formatDate } from "@/lib/record";

export const metadata: Metadata = {
  title: "Platform admin",
};

export default async function AdminHome() {
  await connection();
  const [onboarding, registry, extraction, chain, escalations] = await Promise.all([
    api.onboardingReviews(),
    api.registrySync(),
    api.extractionReviews(),
    api.chainChecks(),
    api.escalations(),
  ]);

  const waiting = onboarding.ok
    ? onboarding.data.filter((row) => row.state !== "approved")
    : [];
  const failing = registry.ok ? registry.data.filter((row) => row.state !== "synced") : [];
  const undecided = extraction.ok
    ? extraction.data.filter((row) => row.decision === null)
    : [];
  const breaks = chain.ok ? chain.data.filter((row) => !row.chains) : [];
  const pendingAnchor = chain.ok
    ? chain.data.filter((row) => row.anchorState !== "anchored")
    : [];

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">Platform admin</p>
        <h1 className="h2-display">What is waiting on the platform</h1>
        <p className="lede">
          The platform reviews what a project cannot review for itself: a
          registry that did not answer, an extraction the model was unsure of,
          a report a project and a household could not settle between them, and
          the chain every published record hangs from.
        </p>
        <Rule weight="heavy" />
      </header>

      {breaks.length > 0 ? (
        <Notice tone="blocked" title={`${formatCount(breaks.length)} records do not chain`}>
          <p data-chain="broken">
            A record whose hash does not follow the one before it is published
            as it is and repaired by nobody. Both records stay, and the break
            is stated on each.
          </p>
          <p>
            <Link href="/admin/chain" prefetch={false}>
              The chain
            </Link>
          </p>
        </Notice>
      ) : null}

      <section className="figure-row" aria-label="Waiting">
        <Figure
          label="Projects in review"
          value={formatCount(waiting.length)}
          denominator={`of ${formatCount(onboarding.ok ? onboarding.data.length : 0)} submitted`}
        />
        <Figure
          label="Registries not in sync"
          value={formatCount(failing.length)}
          denominator={`of ${formatCount(registry.ok ? registry.data.length : 0)} connected`}
        />
        <Figure
          label="Extractions to review"
          value={formatCount(undecided.length)}
          denominator={`of ${formatCount(extraction.ok ? extraction.data.length : 0)} below the threshold`}
        />
        <Figure
          label="Reports escalated"
          value={formatCount(escalations.ok ? escalations.data.length : 0)}
          denominator="that a project and a household could not settle"
        />
        <Figure
          label="Records waiting to anchor"
          value={formatCount(pendingAnchor.length)}
          denominator={`of ${formatCount(chain.ok ? chain.data.length : 0)} published`}
        />
      </section>

      <section className="stack" aria-label="What to do next">
        <h2 className="h3-display">What to do next</h2>
        <Rule />
        <ul className="stack-tight">
          {waiting.map((row) => (
            <li key={row.projectId} className="verifier-row wide" data-waiting={row.projectId}>
              <span>
                <Link href="/admin/onboarding" prefetch={false}>
                  {row.projectName}
                </Link>
              </span>
              <span className="record-cell">{row.developerName}</span>
              <span className="note">{row.outstanding[0]}</span>
              <span className="record-cell">{formatDate(row.submittedAt)}</span>
            </li>
          ))}
          {undecided.map((row) => (
            <li
              key={`${row.projectId}-${row.field}`}
              className="verifier-row wide"
              data-waiting={`${row.projectId}-${row.field}`}
            >
              <span>
                <Link href="/admin/extraction" prefetch={false}>
                  {row.projectName}
                </Link>
              </span>
              <span className="record-cell">{row.field}</span>
              <span className="note">
                Read at {Math.round(row.confidence * 100)}% confidence, below the
                threshold
              </span>
              <span className="record-cell">Page {row.page}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
