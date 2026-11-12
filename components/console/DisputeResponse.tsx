"use client";

import {useRouter} from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import { DISPUTE_COPY } from "@/lib/copy/console";

/** Responding is the only thing this account can do to a report. There is no
    control that closes one: a report closes on a participant confirmation or
    on a reversal, and neither is this account's to assert. */
export function DisputeResponse({ disputeId }: { disputeId: string }) {
  const router=useRouter(),busy=useRef(false);
  const [pending,setPending]=useState(false);
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState<
    { kind: "idle" } | { kind: "sent" } | { kind: "refused"; line: string; note: string }
  >({ kind: "idle" });

  async function send(): Promise<void> {
    if(busy.current)return;busy.current=true;setPending(true);
    try{
    const result = await api.respondToDispute(disputeId, { body });
    if (!result.ok) {
      setOutcome({ kind: "refused", line: result.message, note: result.remediation });
      return;
    }
    setOutcome({ kind: "sent" });router.refresh();
    }finally{busy.current=false;setPending(false);}
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
        disabled={pending||body.trim().length === 0}
        pending={pending}
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
