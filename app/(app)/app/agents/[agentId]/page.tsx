import {DeviceRecoveryApprovals} from '@/components/console/DeviceRecovery';
import type { Metadata } from "next";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { AgentStatus } from "@/components/console/AgentStatus";
import { AgentIdentityForm } from "@/components/console/AgentIdentityForm";
import { api } from "@/lib/api/client";
import { AGENT_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import { flagRate, syncDelay } from "@/lib/console-format";
import { formatCount } from "@/lib/record";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  await connection();
  const { agentId } = await params;
  const result = await api.agent(agentId);
  return { title: result.ok ? result.data.name : "Agent not found" };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  await connection();
  const { agentId } = await params;
  const result = await api.agent(agentId);
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
  const agent = result.data;

  return (
    <div className="console-page reading stack-lg">
      <header className="stack">
        <p className="eyebrow">{agent.id}</p>
        <h1 className="h2-display">{agent.name}</h1>
        <div className="row-between">
          <p className="record-cell">{agent.email}</p>
          <Stamp
            state={
              agent.status === "suspended"
                ? "blocked"
                : agent.aboveFlagThreshold
                  ? "flagged"
                  : agent.status === "invited"
                    ? "review"
                    : "sealed"
            }
            label={
              agent.status === "suspended"
                ? "Suspended"
                : agent.status === "invited"
                  ? "Invited"
                  : "Active"
            }
            recordId={agent.id}
          />
        </div>
        <Rule weight="heavy" />
      </header>

      {agent.status === "suspended" ? (
        <Notice tone="blocked" title="This agent is suspended">
          <p data-agent-state="suspended">{AGENT_COPY.suspended}</p>
        </Notice>
      ) : null}

      {agent.aboveFlagThreshold ? (
        <Notice tone="flagged" title="Flag rate above the threshold">
          <p data-agent-state="above-threshold">{AGENT_COPY.aboveThreshold}</p>
        </Notice>
      ) : null}

      {agent.enrolments === 0 ? (
        <Notice tone="review" title="No enrolments yet">
          <p data-agent-state="no-enrolments">{AGENT_COPY.noEnrolments}</p>
        </Notice>
      ) : null}

      <section className="stack" aria-label="What this agent has enrolled">
        <dl className="record-grid">
          <div>
            <dt className="eyebrow">Enrolments</dt>
            <dd className="record-cell">{formatCount(agent.enrolments)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Flag rate</dt>
            <dd className="record-cell">
              {flagRate(agent.flagRate)} of {formatCount(agent.enrolments)} enrolments
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Average sync delay</dt>
            <dd className="record-cell">{syncDelay(agent.averageSyncDelaySeconds)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Device</dt>
            <dd className="record-cell">
              {agent.deviceBound ? "Bound" : "Not bound"}
            </dd>
          </div>
        </dl>
      </section>

      <AgentStatus agentId={agent.id} status={agent.status} /><DeviceRecoveryApprovals agentId={agent.id}/>
      {process.env.ATTEST_API_MODE==='live'&&agent.status==='invited'?<AgentIdentityForm id={agent.id}/>:null}
    </div>
  );
}
