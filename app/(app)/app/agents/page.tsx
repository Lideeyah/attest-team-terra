import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { InviteAgent } from "@/components/console/InviteAgent";
import { api } from "@/lib/api/client";
import { AGENT_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import { formatCount } from "@/lib/record";
import { flagRate, syncDelay } from "@/lib/console-format";

export const metadata: Metadata = {
  title: "Agents",
};

export default async function AgentsPage() {
  await connection();
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
          <p>Agents are invited to a project, so this opens once one exists.</p>
        </Notice>
      </div>
    );
  }
  const result = await api.agents(projectId);
  if (!result.ok) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="blocked" title={headingFor(result.code, result.message)}>
          <p>{result.message}</p>
          <p className="note">{result.remediation}</p>
        </Notice>
      </div>
    );
  }

  const agents = result.data;
  const above = agents.filter((agent) => agent.aboveFlagThreshold);

  return (
    <div className="console-page stack-lg">
      <header className="stack">
        <p className="eyebrow">{AGENT_COPY.heading}</p>
        <h1 className="h2-display">{formatCount(agents.length)} agents</h1>
        <Rule weight="heavy" />
      </header>

      {above.length > 0 ? (
        <Notice
          tone="flagged"
          title={
            above.length === 1
              ? "One agent is above the threshold"
              : `${formatCount(above.length)} agents are above the threshold`
          }
        >
          <p data-above-threshold={above.length}>
            {above.map((agent) => agent.name).join(", ")}
            {above.length === 1 ? " is" : " are"} above it.{" "}
            {AGENT_COPY.aboveThreshold}
          </p>
        </Notice>
      ) : null}

      {agents.length === 0 ? (
        <EmptyState line="No agent has been invited yet. Enrolment happens in the field app, so a project enrols nobody until an agent is on it." />
      ) : (
        <div className="stack">
          <div className="agent-head" aria-hidden="true">
            <span>Agent</span>
            <span>Enrolments</span>
            <span>Flag rate</span>
            <span>Average sync delay</span>
            <span>Status</span>
          </div>
          <ul className="stack-tight">
            {agents.map((agent) => (
              <li key={agent.id}>
                <Strip
                  state={
                    agent.aboveFlagThreshold
                      ? "flagged"
                      : agent.status === "suspended"
                        ? "blocked"
                        : undefined
                  }
                >
                  <div className="agent-row" data-agent={agent.id}>
                    <span>
                      <Link href={`/app/agents/${agent.id}`} prefetch={false}>
                        {agent.name}
                      </Link>
                    </span>
                    <span className="record-cell">{formatCount(agent.enrolments)}</span>
                    <span className="record-cell" data-flag-rate={agent.flagRate}>
                      {agent.enrolments === 0
                        ? "—"
                        : `${flagRate(agent.flagRate)} of ${formatCount(agent.enrolments)}`}
                    </span>
                    <span className="record-cell">{syncDelay(agent.averageSyncDelaySeconds)}</span>
                    <span className="record-cell">
                      {agent.status === "invited" ? "Invited" : agent.status === "suspended" ? "Suspended" : "Active"}
                    </span>
                  </div>
                </Strip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteAgent projectId={projectId} />
    </div>
  );
}
