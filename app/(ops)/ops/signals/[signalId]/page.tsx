import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { AccountGraph } from "@/components/ops/AccountGraph";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { GRAPH_COPY, SEVERITY_COPY, SIGNAL_COPY } from "@/lib/copy/ops";
import { formatCount, formatDate, formatPeriod } from "@/lib/record";

/* The window the drawing covers: the sandbox's own sweep happens inside two
   days, and the figure is stated on the screen rather than implied. */
const WINDOW_HOURS = 48;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ signalId: string }>;
}): Promise<Metadata> {
  await connection();
  const { signalId } = await params;
  const result = await api.signal(signalId);
  return {
    title: result.ok ? SIGNAL_COPY[result.data.class].heading : "Signal not found",
  };
}

type Search = { graph?: string };

export default async function SignalPage({
  params,
  searchParams,
}: {
  params: Promise<{ signalId: string }>;
  searchParams: Promise<Search>;
}) {
  await connection();
  const { signalId } = await params;
  const search = await searchParams;
  const [result, graph] = await Promise.all([
    api.signal(signalId),
    api.signalGraph(signalId),
  ]);

  if (!result.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, "This signal could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const signal = result.data;
  const copy = SIGNAL_COPY[signal.class];

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <Link href="/ops/signals" className="btn-quiet btn-sm back-link" prefetch={false}>
          ← Signals
        </Link>
        <p className="eyebrow">
          {signal.projectName} · {formatPeriod(signal.period)}
        </p>
        <h1 className="h2-display">{copy.heading}</h1>
        <p className="lede">{copy.what}</p>
        <Rule weight="heavy" />
      </header>

      <dl className="record-grid">
        <div>
          <dt className="eyebrow">Accounts</dt>
          <dd className="record-cell">{formatCount(signal.accounts)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Order</dt>
          <dd className="record-cell">{SEVERITY_COPY[signal.severity]}</dd>
        </div>
        <div>
          <dt className="eyebrow">Raised</dt>
          <dd className="record-cell">{formatDate(signal.raisedAt)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Case</dt>
          <dd className="record-cell">
            {signal.caseId ? (
              <Link href="/ops/cases" prefetch={false}>
                Already on a case
              </Link>
            ) : (
              "Not on a case"
            )}
          </dd>
        </div>
      </dl>

      {search.graph === "none" || search.graph === "ordinary" ? null : (
        <p className="note">{signal.summary}</p>
      )}

      <section className="stack" aria-label="Where the money went">
        <h2 className="h3-display">Where the money went</h2>
        <Rule />
        {search.graph === "loading" ? (
          <p className="note" data-graph-state="loading">
            {GRAPH_COPY.loading}
          </p>
        ) : search.graph === "none" ? (
          <Notice title="No onward movement">
            <p data-graph-state="none">{GRAPH_COPY.none}</p>
          </Notice>
        ) : search.graph === "ordinary" ? (
          <Notice title="Nothing concentrates">
            <p data-graph-state="ordinary">{GRAPH_COPY.ordinary}</p>
          </Notice>
        ) : !graph.ok ? (
          <Notice tone="flagged" title={headingFor(graph.code, "The graph could not be drawn")}>
            <p>{graph.message}</p>
          </Notice>
        ) : (
          <AccountGraph graph={graph.data} windowHours={WINDOW_HOURS} />
        )}
      </section>
    </div>
  );
}
