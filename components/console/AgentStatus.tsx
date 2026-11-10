"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import type { Agent } from "@/lib/api/contract";

/** Suspending an agent stops new enrolments and leaves the existing ones
    standing, because coverage for a closed period is a fact about that
    period. The change carries a reason. */
export function AgentStatus({
  agentId,
  status,
}: {
  agentId: string;
  status: Agent["status"];
}) {
  const [next, setNext] = useState<Agent["status"]>(status);
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<
    { kind: "idle" } | { kind: "saved"; line: string } | { kind: "refused"; line: string }
  >({ kind: "idle" });

  async function save(): Promise<void> {
    const result = await api.updateAgent(agentId, { status: next, reason });
    if (!result.ok) {
      setOutcome({ kind: "refused", line: result.message });
      return;
    }
    setOutcome({
      kind: "saved",
      line: `The agent is now ${result.data.status}. The change is logged with its reason.`,
    });
  }

  return (
    <section className="panel stack" aria-label="Change this agent's status">
      <h2 className="h3-display">Status</h2>
      <Rule />
      <div className="field">
        <label className="label" htmlFor="agent-status">
          Status
        </label>
        <select
          id="agent-status"
          className="select"
          value={next}
          onChange={(event) => setNext(event.target.value as Agent["status"])}
          data-agent-status="true"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="agent-reason">
          Why the status is changing
        </label>
        <textarea
          id="agent-reason"
          className="textarea"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          data-agent-reason="true"
        />
      </div>
      <Button
        type="button"
        disabled={reason.trim().length === 0 || next === status}
        onClick={() => void save()}
        data-agent-status-submit="true"
      >
        Log the change
      </Button>
      {outcome.kind === "saved" ? (
        <Notice title="Logged">
          <p>{outcome.line}</p>
        </Notice>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title="The change was refused">
          <p>{outcome.line}</p>
        </Notice>
      ) : null}
    </section>
  );
}
