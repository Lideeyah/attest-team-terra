"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import { DISPUTE_COPY } from "@/lib/copy/console";

/** Responding is the only thing this account can do to a report. There is no
    control that closes one: a report closes on a participant confirmation or
    on a reversal, and neither is this account's to assert. */
export function DisputeResponse({ disputeId }: { disputeId: string }) {
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState<
    { kind: "idle" } | { kind: "sent" } | { kind: "refused"; line: string; note: string }
  >({ kind: "idle" });

  async function send(): Promise<void> {
    const result = await api.respondToDispute(disputeId, { body });
    if (!result.ok) {
      setOutcome({ kind: "refused", line: result.message, note: result.remediation });
      return;
    }
    setOutcome({ kind: "sent" });
  }

  return (
    <section className="panel stack" aria-label={DISPUTE_COPY.respond}>
      <h2 className="h3-display">{DISPUTE_COPY.respond}</h2>
      <Rule />
      <p className="note">{DISPUTE_COPY.responseLogged}</p>
      <div className="field">
        <label className="label" htmlFor="dispute-body">
          What the household is told
        </label>
        <textarea
          id="dispute-body"
          className="textarea"
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          data-dispute-response="true"
        />
      </div>
      <Button
        type="button"
        disabled={body.trim().length === 0}
        onClick={() => void send()}
        data-dispute-submit="true"
      >
        Send the response
      </Button>
      <p className="note">{DISPUTE_COPY.basis}</p>
      {outcome.kind === "sent" ? (
        <Notice title="The response is logged">
          <p>{DISPUTE_COPY.awaitingParticipant}</p>
        </Notice>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title="The response was not sent">
          <p>{outcome.line}</p>
          <p className="note">{outcome.note}</p>
        </Notice>
      ) : null}
    </section>
  );
}
