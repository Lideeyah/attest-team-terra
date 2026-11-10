"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { api, newIdempotencyKey } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";

/* The three decisions the platform makes, each carrying the reason it was
   made. A review queue with no way to review is a list, and an escalation
   the platform cannot decide is a report nobody closes. */

type Outcome =
  | { kind: "idle" }
  | { kind: "done"; line: string }
  | { kind: "refused"; title: string; line: string };

export function OnboardingDecision({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function decide(decision: "approve" | "return"): Promise<void> {
    const result = await api.reviewOnboarding(
      projectId,
      { decision, note },
      /* Minted per click. A constant key made a second decision with a
         different reason a DUPLICATE_REQUEST, locking the reviewer out of
         ever re-deciding. */
      newIdempotencyKey(),
    );
    if (!result.ok) {
      setOutcome({
        kind: "refused",
        title: headingFor(result.code, "The decision was not recorded"),
        line:
          result.field === "note"
            ? "The reason is what the operator reads, so it is required: a sentence about what was checked, or what is still outstanding."
            : result.message,
      });
      return;
    }
    setOutcome({
      kind: "done",
      line:
        decision === "approve"
          ? "Approved. The project's page is public from now on, at zero enrolled and zero paid."
          : "Returned to the operator with what is outstanding. Nothing is published.",
    });
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="field">
        <label className="label" htmlFor={`note-${projectId}`}>
          What was checked, or what is outstanding
        </label>
        <textarea
          id={`note-${projectId}`}
          className="textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          data-review-note={projectId}
        />
      </div>
      <div className="row">
        <Button
          type="button"
          disabled={note.trim().length < 12}
          onClick={() => void decide("approve")}
          data-review-approve={projectId}
        >
          Approve, and publish the page
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={note.trim().length < 12}
          onClick={() => void decide("return")}
          data-review-return={projectId}
        >
          Return it to the operator
        </Button>
      </div>
      {note.trim().length < 12 ? (
        <p className="note" data-review-hint={projectId}>
          Both decisions need a reason first. It is what the operator reads if
          this comes back to them, and what the next reviewer reads if it does
          not.
        </p>
      ) : null}
      {outcome.kind === "done" ? (
        <Notice title="Recorded">
          <p data-review-state="done">{outcome.line}</p>
        </Notice>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title={outcome.title}>
          <p data-review-state="refused">{outcome.line}</p>
        </Notice>
      ) : null}
    </div>
  );
}

export function ExtractionDecision({
  projectId,
  field,
  extracted,
}: {
  projectId: string;
  field: string;
  extracted: string;
}) {
  const router = useRouter();
  const [corrected, setCorrected] = useState(extracted);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function decide(accepted: boolean): Promise<void> {
    const result = await api.reviewExtraction(
      projectId,
      field,
      accepted ? { accepted: true } : { accepted: false, corrected },
      newIdempotencyKey(),
    );
    if (!result.ok) {
      setOutcome({
        kind: "refused",
        title: headingFor(result.code, "The decision was not recorded"),
        line: result.message,
      });
      return;
    }
    setOutcome({
      kind: "done",
      line: accepted
        ? "Accepted as read. The reading and this decision both stay on the record."
        : `Corrected to ${corrected}. What the model read stays on the record beside it.`,
    });
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="field">
        <label className="label" htmlFor={`corrected-${projectId}`}>
          What the sentence actually says
        </label>
        <input
          id={`corrected-${projectId}`}
          className="input"
          value={corrected}
          onChange={(event) => setCorrected(event.target.value)}
          data-extraction-value={projectId}
        />
      </div>
      <div className="row">
        <Button
          type="button"
          onClick={() => void decide(true)}
          data-extraction-accept={projectId}
        >
          The reading is right
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={corrected.trim() === extracted.trim()}
          onClick={() => void decide(false)}
          data-extraction-correct={projectId}
        >
          Correct it
        </Button>
      </div>
      {outcome.kind === "done" ? (
        <Notice title="Recorded">
          <p data-extraction-state="done">{outcome.line}</p>
        </Notice>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title={outcome.title}>
          <p data-extraction-state="refused">{outcome.line}</p>
        </Notice>
      ) : null}
    </div>
  );
}

export function EscalationDecision({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [basis, setBasis] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function decide(result: "substantiated" | "unsubstantiated"): Promise<void> {
    const answer = await api.decideEscalation(
      disputeId,
      { outcome: result, basis },
      newIdempotencyKey(),
    );
    if (!answer.ok) {
      setOutcome({
        kind: "refused",
        title: headingFor(answer.code, "The report was not closed"),
        line:
          answer.code === "DISPUTE_RESOLUTION_BASIS_REQUIRED"
            ? "A report closes on a basis, not on an assertion. Write what was found and what it was found in: the household reads this, and so does anyone auditing the project."
            : answer.message,
      });
      return;
    }
    setOutcome({
      kind: "done",
      line: `Closed as ${result}, with the basis published beside it.`,
    });
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="field">
        <label className="label" htmlFor={`basis-${disputeId}`}>
          The basis, which is published with the decision
        </label>
        <textarea
          id={`basis-${disputeId}`}
          className="textarea"
          rows={3}
          value={basis}
          onChange={(event) => setBasis(event.target.value)}
          data-escalation-basis={disputeId}
        />
      </div>
      <div className="row">
        <Button
          type="button"
          disabled={basis.trim().length < 24}
          onClick={() => void decide("substantiated")}
          data-escalation-substantiate={disputeId}
        >
          Substantiated
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={basis.trim().length < 24}
          onClick={() => void decide("unsubstantiated")}
          data-escalation-dismiss={disputeId}
        >
          Unsubstantiated
        </Button>
      </div>
      {basis.trim().length < 24 ? (
        <p className="note" data-escalation-hint={disputeId}>
          A report closes on a basis, and the basis is published with the
          decision. Write what was found and what it was found in.
        </p>
      ) : null}
      {outcome.kind === "done" ? (
        <Notice title="Closed">
          <p data-escalation-state="done">{outcome.line}</p>
        </Notice>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title={outcome.title}>
          <p data-escalation-state="refused">{outcome.line}</p>
        </Notice>
      ) : null}
    </div>
  );
}

export function ResyncRegistry({ registry }: { registry: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function resync(): Promise<void> {
    const result = await api.resyncRegistry(registry, newIdempotencyKey());
    if (!result.ok) {
      setOutcome({
        kind: "refused",
        title: headingFor(result.code, "The registry was not read"),
        line: result.message,
      });
      return;
    }
    setOutcome({
      kind: "done",
      line:
        result.data.state === "synced"
          ? "Read just now. The schedule carries on from here."
          : "Asked just now, and the registry still did not answer. The attempt is on the list above.",
    });
    router.refresh();
  }

  return (
    <div className="stack-tight">
      <div className="row">
        <Button type="button" variant="outline" onClick={() => void resync()} data-resync={registry}>
          Read the registry now
        </Button>
      </div>
      {outcome.kind === "done" ? (
        <p className="note" data-resync-state="done">
          {outcome.line}
        </p>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title={outcome.title}>
          <p data-resync-state="refused">{outcome.line}</p>
        </Notice>
      ) : null}
    </div>
  );
}
