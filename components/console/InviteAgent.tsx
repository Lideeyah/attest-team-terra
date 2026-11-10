"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";

/** An agent is invited by name and email and redeems the invite on their own
    device, which is where the binding happens. Nothing here enrols anybody. */
export function InviteAgent({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState<
    { kind: "idle" } | { kind: "sent"; code: string } | { kind: "refused"; line: string; note: string }
  >({ kind: "idle" });

  async function send(): Promise<void> {
    const result = await api.inviteAgent(projectId, { name, email });
    if (!result.ok) {
      setOutcome({ kind: "refused", line: result.message, note: result.remediation });
      return;
    }
    setOutcome({ kind: "sent", code: result.data.code });
  }

  return (
    <section className="panel stack" aria-label="Invite an agent">
      <h2 className="h3-display">Invite an agent</h2>
      <Rule />
      <div className="field">
        <label className="label" htmlFor="agent-name">
          Name
        </label>
        <input
          id="agent-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          data-agent-name="true"
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="agent-email">
          Email
        </label>
        <input
          id="agent-email"
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-agent-email="true"
        />
      </div>
      <Button
        type="button"
        disabled={name.trim().length === 0 || email.trim().length === 0}
        onClick={() => void send()}
        data-agent-invite="true"
      >
        Send the invite
      </Button>
      {outcome.kind === "sent" ? (
        <Notice title="The invite is sent">
          <p>
            The code is <span className="record-cell">{outcome.code}</span>. It is
            redeemed once, on the agent&rsquo;s own device, and binds to that
            device.
          </p>
        </Notice>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title="The invite was not sent">
          <p>{outcome.line}</p>
          <p className="note">{outcome.note}</p>
        </Notice>
      ) : null}
    </section>
  );
}
