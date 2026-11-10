"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import {
  PARTICIPANT_COPY,
  PARTICIPANT_STATE_LABEL,
  ROSTER_COPY,
} from "@/lib/copy/console";
import type { ParticipantStatus } from "@/lib/api/contract";

/* What can be changed about a household, and what cannot.

   The phone number is correctable, because a wrong number means a payment
   notice that nobody receives. The identity is not editable and the field is
   absent rather than disabled, because a disabled field says the product
   would allow it under other circumstances. There is no deletion: removal is
   a status change and carries a reason. */

const STATUS_OPTIONS: { value: ParticipantStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "flagged", label: "Flagged for review" },
  { value: "excluded", label: "Excluded from the current run" },
  { value: "removed", label: "Removed from the roster" },
];

type Outcome = { kind: "idle" } | { kind: "saved"; line: string } | { kind: "refused"; line: string; note: string };

export function ParticipantActions({
  participantId,
  phone,
  status,
}: {
  participantId: string;
  phone: string;
  status: ParticipantStatus;
}) {
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneReason, setPhoneReason] = useState("");
  const [nextStatus, setNextStatus] = useState<ParticipantStatus>(status);
  const [statusReason, setStatusReason] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function save(body: { phone?: string; status?: string; reason: string }) {
    const result = await api.updateParticipant(participantId, body);
    if (!result.ok) {
      setOutcome({ kind: "refused", line: result.message, note: result.remediation });
      return;
    }
    setOutcome({
      kind: "saved",
      line: body.phone
        ? `The phone number is now ${result.data.phoneMasked}. The change is logged with its reason.`
        : `${PARTICIPANT_STATE_LABEL[result.data.status] ?? "The status"} is what the record now says. The change is logged with its reason.`,
    });
  }

  return (
    <section className="panel stack-lg" aria-label="Changes to this record">
      <div className="stack">
        <h2 className="h3-display">{PARTICIPANT_COPY.phoneCorrection}</h2>
        <Rule />
        <p className="note">
          The number on the record is {phone}. A correction carries a reason and
          both are kept.
        </p>
        <div className="field">
          <label className="label" htmlFor="phone-value">
            The corrected number
          </label>
          <input
            id="phone-value"
            className="input"
            inputMode="numeric"
            value={phoneValue}
            onChange={(event) => setPhoneValue(event.target.value)}
            data-phone-value="true"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="phone-reason">
            {PARTICIPANT_COPY.phoneReason}
          </label>
          <textarea
            id="phone-reason"
            className="textarea"
            value={phoneReason}
            onChange={(event) => setPhoneReason(event.target.value)}
            data-phone-reason="true"
          />
        </div>
        <Button
          type="button"
          disabled={phoneValue.trim().length === 0 || phoneReason.trim().length === 0}
          onClick={() => void save({ phone: phoneValue, reason: phoneReason })}
          data-phone-submit="true"
        >
          Log the correction
        </Button>
      </div>

      <div className="stack">
        <h2 className="h3-display">{PARTICIPANT_COPY.statusChange}</h2>
        <Rule />
        <p className="note">{ROSTER_COPY.noDeletion}</p>
        <div className="field">
          <label className="label" htmlFor="status-value">
            Status
          </label>
          <select
            id="status-value"
            className="select"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as ParticipantStatus)}
            data-status-value="true"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="status-reason">
            {PARTICIPANT_COPY.statusReason}
          </label>
          <textarea
            id="status-reason"
            className="textarea"
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
            data-status-reason="true"
          />
        </div>
        <Button
          type="button"
          disabled={statusReason.trim().length === 0 || nextStatus === status}
          onClick={() => void save({ status: nextStatus, reason: statusReason })}
          data-status-submit="true"
        >
          Log the status change
        </Button>
      </div>

      {outcome.kind === "saved" ? (
        <Notice title="Logged">
          <p>{outcome.line}</p>
        </Notice>
      ) : null}
      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title="The change was refused">
          <p>{outcome.line}</p>
          <p className="note">{outcome.note}</p>
        </Notice>
      ) : null}
    </section>
  );
}
