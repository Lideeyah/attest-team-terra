"use client";

import { useState } from "react";
import { Console, type ConsoleLine } from "@/components/Console";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { FIELD_COPY, FLAG_COPY } from "@/lib/copy/field";
import { drainQueue, type SyncOutcome } from "@/lib/field/sync";
import { useOnline, useQueue } from "@/lib/field/useQueue";
import { formatCount, formatDateTime } from "@/lib/record";

/* The queue, on the sunken surface and in the console face: this is a log of
   what this phone is holding, not a composition. */
export function QueuePanel() {
  const { queue, ready, refresh } = useQueue();
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(0);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);

  async function sync(): Promise<void> {
    setSyncing(true);
    setSending(queue.length);
    setOutcome(null);
    const result = await drainQueue();
    setOutcome(result);
    setSyncing(false);
    setSending(0);
    await refresh();
  }

  /* An item the server refused for a reason the device cannot resolve — a
     household already enrolled, an account that resolves to another name —
     is a conflict rather than a retry: sending it again produces the same
     answer, so it needs somebody to decide. */
  const conflicts = queue.filter(
    (item) =>
      item.failure !== null &&
      ["IDENTITY_DUPLICATE", "NAME_MISMATCH", "ACCOUNT_NOT_FOUND"].includes(
        item.failure.code,
      ),
  );

  const lines: ConsoleLine[] = queue.map((item) => ({
    id: item.clientUuid,
    /* The Console formats the time itself, so this is the timestamp. */
    at: item.capturedAt,
    text: `${item.details.givenName} ${item.details.familyName} · ${item.details.community}`,
    meta:
      item.failure !== null
        ? item.failure.message
        : item.flags.length > 0
          ? FLAG_COPY[item.flags[0]]
          : "Waiting to sync",
  }));

  return (
    <div className="field-screen stack">
      <h1 className="h3-display">Queue</h1>
      <p className="field-lede">
        {queue.length === 0
          ? FIELD_COPY.nothingQueued
          : FIELD_COPY.pending(queue.length)}
      </p>
      <Rule />

      {!online ? (
        <p className="field-note" data-queue-state="offline">
          {FIELD_COPY.offlineIsNormal}
        </p>
      ) : null}

      {ready && queue.length > 0 ? (
        <>
          <Console lines={lines} footer={`${queue.length} on this phone`} />
          <ul className="field-queue">
            {queue.map((item) => (
              <li
                key={item.clientUuid}
                className="field-queue-row"
                data-queued={item.clientUuid}
                data-captured-at={item.capturedAt}
                data-state={item.state}
                {...(item.failure
                  ? { "data-item-failed": item.failure.message }
                  : {})}
              >
                <span className="record-cell field-record">
                  {item.details.givenName} {item.details.familyName}
                </span>
                <span className="record-cell field-record">
                  {formatDateTime(item.capturedAt)}
                </span>
                {item.failure ? (
                  <span className="field-note">{item.failure.message}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {syncing ? (
        <p className="field-note" data-sync-progress={sending}>
          Sending {formatCount(Math.max(0, sending - queue.length))} of{" "}
          {formatCount(sending)}. Nothing leaves this phone until the server
          has it.
        </p>
      ) : null}

      {conflicts.length > 0 ? (
        <Notice
          tone="blocked"
          title={
            conflicts.length === 1
              ? "One enrolment needs a decision"
              : `${formatCount(conflicts.length)} enrolments need a decision`
          }
        >
          <p data-conflict={conflicts.length}>
            Sending these again gives the same answer. Each is a household the
            project has to look at: a verification number already enrolled, or
            an account that resolves to a different name. They stay on this
            phone until the project resolves them in the console.
          </p>
          <ul className="stack-tight">
            {conflicts.map((item) => (
              <li key={item.clientUuid} className="field-note">
                {item.details.givenName} {item.details.familyName} ·{" "}
                {item.failure?.message}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <button
        type="button"
        className="btn field-action"
        data-sync
        disabled={syncing || queue.length === 0}
        onClick={() => void sync()}
      >
        {syncing ? FIELD_COPY.syncing : FIELD_COPY.syncNow}
      </button>

      {outcome && outcome.transport ? (
        <Notice tone="flagged" title="Nothing was sent">
          <p data-sync-outcome="transport">
            The connection did not hold. Every enrolment is still on this phone
            and nothing was sent twice.
          </p>
        </Notice>
      ) : null}

      {outcome && !outcome.transport && outcome.failed.length === 0 && outcome.accepted > 0 ? (
        <Notice title="Synced">
          <p data-sync-outcome="accepted">
            {outcome.accepted} sent and accepted. {FIELD_COPY.synced}
          </p>
        </Notice>
      ) : null}

      {outcome && outcome.failed.length > 0 ? (
        <Notice tone="flagged" title={`${outcome.failed.length} were not accepted`}>
          <p data-sync-outcome="partial">
            {outcome.accepted} of {outcome.sent} were accepted. The rest stay on
            this phone with the reason the server gave, each one its own.
          </p>
        </Notice>
      ) : null}
    </div>
  );
}
