"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Notice } from "@/components/Notice";
import { api } from "@/lib/api/client";
import { ACTION_COPY } from "@/lib/copy/ops";
import type { Case } from "@/lib/api/contract";

/* What this console can do to a case, each with its consequence stated before
   the control rather than after it. Freezing an account stops money for real
   people, so it is confirmed, carries a note, and can be refused by the desk
   that actually holds the authority. */
const ACTIONS = ["freeze", "documentation", "escalate", "clear"] as const;

export function CaseActions({
  caseId,
  state,
}: {
  caseId: string;
  state: Case["state"];
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<(typeof ACTIONS)[number] | null>(null);
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<
    | { kind: "idle" }
    | { kind: "pending"; action: string }
    | { kind: "done"; action: string }
    | { kind: "refused"; line: string }
  >({ kind: "idle" });

  async function take(action: (typeof ACTIONS)[number]): Promise<void> {
    const result = await api.caseAction(caseId, { action, note });
    setChosen(null);
    setNote("");
    if (!result.ok) {
      setOutcome({
        kind: "refused",
        line:
          result.code === "FORBIDDEN"
            ? "This account does not have access to that action. Freezing and escalation are taken by the financial crime desk, and nothing was changed here."
            : result.code === "INVALID_REQUEST" && result.field === "note"
              ? "The case record carries the reason, so it is required: a few words about why this action was taken."
              : result.message,
      });
      return;
    }
    /* A freeze is authorised elsewhere: the console records that it was
       asked for, not that it happened. Either way the case itself has
       changed, so the screen re-reads it rather than describing a state it
       has not checked. */
    setOutcome(
      action === "freeze" || action === "escalate"
        ? { kind: "pending", action }
        : { kind: "done", action },
    );
    router.refresh();
  }

  if (state === "closed") {
    return (
      <p className="note">
        This case is closed. What it found stays on the record and no further
        action is taken from here.
      </p>
    );
  }

  return (
    <div className="stack">
      <div className="row">
        {ACTIONS.map((action) => (
          <Button
            key={action}
            type="button"
            variant={action === "clear" ? "quiet" : "outline"}
            small
            onClick={() => setChosen(action)}
            data-case-action={action}
          >
            {ACTION_COPY[action].label}
          </Button>
        ))}
      </div>

      {outcome.kind === "pending" ? (
        <Notice tone="review" title="Waiting for authorisation">
          <p data-action-state="pending">
            {ACTION_COPY[outcome.action].consequence} The financial crime desk
            authorises it; nothing has changed yet.
          </p>
        </Notice>
      ) : null}

      {outcome.kind === "done" ? (
        <Notice title="Recorded">
          <p data-action-state="done">
            {ACTION_COPY[outcome.action].consequence} The case above says what
            it is now.
          </p>
        </Notice>
      ) : null}

      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title="This account does not have access to that action">
          <p data-action-state="refused">{outcome.line}</p>
        </Notice>
      ) : null}

      <Modal
        open={chosen !== null}
        title={chosen ? ACTION_COPY[chosen].label : ""}
        onClose={() => setChosen(null)}
        holdsUnsavedInput={note.length > 0}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setChosen(null)}>
              Not now
            </Button>
            <Button
              type="button"
              disabled={note.trim().length < 12}
              onClick={() => chosen && void take(chosen)}
              data-case-confirm
            >
              {chosen ? ACTION_COPY[chosen].label : ""}
            </Button>
          </>
        }
      >
        <p className="prose">{chosen ? ACTION_COPY[chosen].consequence : ""}</p>
        <div className="field">
          <label className="label" htmlFor="case-note">
            Why, for the case record
          </label>
          <textarea
            id="case-note"
            className="textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            data-case-note
          />
        </div>
      </Modal>
    </div>
  );
}
