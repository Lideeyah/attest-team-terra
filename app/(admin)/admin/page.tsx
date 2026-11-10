import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
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
  /* The same predicate the registry screen uses, so the figure here and the
     heading there cannot give different numbers for the same thing. Stale is
     its own count, said in the denominator rather than folded in. */
  const failing = registry.ok
    ? registry.data.filter((row) => row.state === "failing")
    : [];
  const stale = registry.ok ? registry.data.filter((row) => row.state === "stale") : [];
  const undecided = extraction.ok
    ? extraction.data.filter((row) => row.decision === null)
    : [];
  const breaks = chain.ok ? chain.data.filter((row) => !row.chains) : [];
  const pendingAnchor = chain.ok
    ? chain.data.filter((row) => row.anchorState !== "anchored")
    : [];
  const openReports = escalations.ok
    ? escalations.data.filter(
        (row) => row.state !== "substantiated" && row.state !== "unsubstantiated",
      )
    : [];

  /* A queue that could not be read is not a queue with nothing in it. This
     screen is the one place the platform looks to see whether anything is
     waiting, so a refusal rendered as a zero is the worst thing it could do:
     it reports an all-clear it has no basis for. Each queue says for itself
     whether it was read, and the figures stand down to an em rule where it
     was not. */
  const queues = [
    { name: "the onboarding queue", result: onboarding },
    { name: "registry sync", result: registry },
    { name: "the extraction queue", result: extraction },
    { name: "the chain", result: chain },
    { name: "escalated reports", result: escalations },
  ];
  const unread = queues.filter((queue) => !queue.result.ok);
  const unreadable = "—";

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

      {unread.length > 0 ? (
        <Notice
          tone="blocked"
          title={
            unread.length === queues.length
              ? "Nothing on this screen was read"
              : `${formatCount(unread.length)} of ${formatCount(queues.length)} queues were not read`
          }
        >
          <p data-admin-unread={unread.length}>
            {unread.map((queue) => queue.name).join(", ")} did not answer, so
            this screen cannot say whether anything is waiting in{" "}
            {unread.length === 1 ? "it" : "them"}. The figures below stand at an
            em rule where that is the case, rather than at zero: a zero here
            would read as an all-clear the platform has no basis for.
          </p>
          <p className="note">
            {/* One line per distinct reason. Five queues refused by the same
                upstream is one fact, not five. */}
            {[
              ...new Set(
                unread
                  .map((queue) => (queue.result.ok ? "" : queue.result.message))
                  .filter((line) => line.length > 0),
              ),
            ].join(" ")}
          </p>
        </Notice>
      ) : null}

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
          value={onboarding.ok ? formatCount(waiting.length) : unreadable}
          denominator={
            onboarding.ok
              ? `of ${formatCount(onboarding.data.length)} submitted`
              : "the queue did not answer"
          }
        />
        <Figure
          label="Registries failing"
          value={registry.ok ? formatCount(failing.length) : unreadable}
          denominator={
            registry.ok
              ? `of ${formatCount(registry.data.length)} connected${
                  stale.length > 0
                    ? `, ${formatCount(stale.length)} read longer ago than the schedule`
                    : ""
                }`
              : "sync status did not answer"
          }
        />
        <Figure
          label="Extractions to review"
          value={extraction.ok ? formatCount(undecided.length) : unreadable}
          denominator={
            extraction.ok
              ? `of ${formatCount(extraction.data.length)} below the threshold`
              : "the queue did not answer"
          }
        />
        <Figure
          label="Reports escalated, still open"
          value={escalations.ok ? formatCount(openReports.length) : unreadable}
          denominator={
            escalations.ok
              ? `of ${formatCount(escalations.data.length)} escalated to the platform`
              : "escalations did not answer"
          }
        />
        <Figure
          label="Records not yet anchored"
          value={chain.ok ? formatCount(pendingAnchor.length) : unreadable}
          denominator={
            chain.ok
              ? `of ${formatCount(chain.data.length)} published`
              : "the chain did not answer"
          }
        />
      </section>

      <section className="stack" aria-label="What to do next">
        <h2 className="h3-display">What to do next</h2>
        <Rule />
        {waiting.length === 0 && undecided.length === 0 ? (
          <EmptyState
            line={
              unread.length > 0
                ? "Nothing is listed here, and some queues did not answer, so this is not the same as nothing waiting."
                : "Nothing is waiting on the platform. Every project in review has been read and every extraction has been decided."
            }
          />
        ) : null}
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
