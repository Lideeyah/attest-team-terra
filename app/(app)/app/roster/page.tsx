import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { RosterTable } from "@/components/console/RosterTable";
import { ImportPanel } from "@/components/console/ImportPanel";
import { api } from "@/lib/api/client";
import { ROSTER_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import type { ErrorCode } from "@/lib/api/contract";
import {
  AGENT_FILTERS,
  STATUS_FILTERS,
  TIER_FILTERS,
  WALLET_FILTERS,
} from "@/lib/copy/filters";
import { formatCount } from "@/lib/record";

export const metadata: Metadata = {
  title: "Roster",
};

type Search = {
  q?: string;
  status?: string;
  agent?: string;
  tier?: string;
  flagged?: string;
  wallet?: string;
  enrolled_from?: string;
  import?: string;
};

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const session = await api.session();
  if (!session.ok) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="blocked" title={headingFor(session.code, session.message)}>
          <p>{session.message}</p>
        </Notice>
      </div>
    );
  }
  const projectId = session.data.projectId;
  if (projectId === null) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="review" title="This account is not on a project yet">
          <p>The roster opens once a project is created.</p>
        </Notice>
      </div>
    );
  }

  const query = {
    ...(search.q ? { q: search.q } : {}),
    ...(search.status ? { status: search.status } : {}),
    ...(search.agent ? { agent: search.agent } : {}),
    ...(search.tier ? { tier: search.tier } : {}),
    ...(search.flagged ? { flagged: search.flagged } : {}),
    ...(search.wallet ? { wallet: search.wallet } : {}),
    ...(search.enrolled_from ? { enrolled_from: search.enrolled_from } : {}),
  };
  const filtered = Object.keys(query).length > 0;

  const [rows, agents, imports] = await Promise.all([
    api.participants(projectId, { ...query, page: 1, per_page: 100 }),
    api.agents(projectId),
    api.imports(projectId),
  ]);

  if (!rows.ok) {
    /* An empty roster is a fact about the project rather than a failure to
       read it, so it is told as one. */
    if (rows.code === "ROSTER_EMPTY") {
      return (
        <div className="console-page stack-lg">
          <header className="stack">
            <p className="eyebrow">{ROSTER_COPY.heading}</p>
            <h1 className="h2-display">Nobody is enrolled yet</h1>
            <Rule weight="heavy" />
          </header>
          <EmptyState line={ROSTER_COPY.empty} />
          <ImportPanel projectId={projectId} />
        </div>
      );
    }
    return (
      <div className="console-page stack-lg">
        <Notice tone="blocked" title={headingFor(rows.code as ErrorCode, rows.message)}>
          <p>{rows.message}</p>
          <p className="note">{rows.remediation}</p>
        </Notice>
      </div>
    );
  }

  const total = rows.meta?.total ?? rows.data.length;
  /* The filtered count is not the roster. Reading the roster's own size costs
     one more request and keeps the heading from quietly becoming the filter's
     result. */
  const wholeRoster = filtered
    ? await api.participants(projectId, { page: 1, per_page: 1 })
    : null;
  const whole =
    wholeRoster && wholeRoster.ok ? (wholeRoster.meta?.total ?? total) : total;
  const jobs = imports.ok ? imports.data : [];
  const running = jobs.find((job) => job.state === "running") ?? null;
  const partial = jobs.find((job) => job.state === "partially-failed") ?? null;
  const showRunning = search.import === "running" || running !== null;
  const showPartial = search.import === "partial" || partial !== null;

  return (
    <div className="console-page stack-lg">
      <header className="stack">
        <p className="eyebrow">{ROSTER_COPY.heading}</p>
        <h1 className="h2-display">
          {whole === 0
            ? "Nobody is enrolled yet"
            : filtered
              ? `${formatCount(total)} of ${formatCount(whole)} households`
              : `${formatCount(whole)} households`}
        </h1>
        <Rule weight="heavy" />
      </header>

      {whole > 0 && showRunning && running ? (
        <Notice tone="review" title="An import is running">
          <p data-import-state="running">
            The import is running. {formatCount(running.imported)} of{" "}
            {formatCount(running.rows)} rows read so far.
          </p>
        </Notice>
      ) : null}

      {whole > 0 && showPartial && partial ? (
        <Notice tone="flagged" title={`${formatCount(partial.failed)} rows failed`}>
          <p data-import-state="partially-failed">
            {formatCount(partial.failed)} of {formatCount(partial.rows)} rows
            failed. {formatCount(partial.imported)} households are enrolled.
          </p>
          <p className="note">
            The download is the file that was uploaded plus error_code and
            error_message, carrying only the rows that failed.
          </p>
          <p>
            <a
              className="btn-outline btn-sm"
              href={`/app/roster/import/${partial.id}/failures`}
              data-failure-download={partial.id}
              download
            >
              Download the rows that failed
            </a>
          </p>
        </Notice>
      ) : null}

      <form className="filter-rail" method="get" action="/app/roster">
        <div className="field">
          <label className="label" htmlFor="roster-q">
            Household, community or account
          </label>
          <input
            id="roster-q"
            className="input"
            type="search"
            name="q"
            defaultValue={search.q ?? ""}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="roster-status">
            Status
          </label>
          <select
            id="roster-status"
            className="select"
            name="status"
            defaultValue={search.status ?? ""}
          >
            {(process.env.ATTEST_API_MODE==='live'?STATUS_FILTERS.filter(o=>['','active','flagged','removed'].includes(o.value)):STATUS_FILTERS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="roster-tier">
            Verification tier
          </label>
          <select
            id="roster-tier"
            className="select"
            name="tier"
            defaultValue={search.tier ?? ""}
          >
            {TIER_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="roster-wallet">
            Wallet
          </label>
          <select
            id="roster-wallet"
            disabled={process.env.ATTEST_API_MODE==='live'}
            className="select"
            name="wallet"
            defaultValue={search.wallet ?? ""}
          >
            {WALLET_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="roster-enrolled">
            Enrolled on or after
          </label>
          <input
            id="roster-enrolled"
            disabled={process.env.ATTEST_API_MODE==='live'}
            className="input"
            type="date"
            name="enrolled_from"
            defaultValue={search.enrolled_from ?? ""}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="roster-agent">
            Agent
          </label>
          <select
            id="roster-agent"
            className="select"
            name="agent"
            defaultValue={search.agent ?? ""}
          >
            {AGENT_FILTERS(agents.ok ? agents.data : []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="roster-flagged">
            Flags
          </label>
          <select
            id="roster-flagged"
            className="select"
            name="flagged"
            defaultValue={search.flagged ?? ""}
          >
            <option value="">Any</option>
            <option value="true">Carrying a flag</option>
            <option value="false">No flag</option>
          </select>
        </div>
        <button type="submit" className="btn-outline btn-sm">
          Apply
        </button>
      </form>

      {total === 0 ? (
        <EmptyState line={filtered ? ROSTER_COPY.filteredEmpty : ROSTER_COPY.empty} />
      ) : (
        <RosterTable
          projectId={projectId}
          total={total}
          first={rows.data}
          query={query}
        />
      )}

      <ImportPanel projectId={projectId} />
    </div>
  );
}
