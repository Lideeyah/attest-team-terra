"use client";

import Link from "next/link";
import { Rule } from "@/components/Rule";
import { FIELD_COPY } from "@/lib/copy/field";
import { useOnline, useQueue } from "@/lib/field/useQueue";
import { formatCount } from "@/lib/record";

/* Today: what this agent has captured, what is waiting on the phone, and how
   many are left against the day's target. Three figures, each with its
   denominator, large enough to read at arm's length in sunlight. */
export function Today({
  captured,
  target,
  agentName,
}: {
  captured: number;
  target: number;
  agentName: string;
}) {
  const { queue } = useQueue();
  const online = useOnline();
  /* What the agent captured today is what they captured, whether or not it
     has reached the server: the figure the server knows plus what is still on
     this phone. Reading the server's figure alone tells an agent who has been
     out of signal all morning that they have done nothing. */
  const capturedToday = captured + queue.length;
  const remaining = Math.max(0, target - capturedToday);

  return (
    <div className="field-screen stack">
      <p className="eyebrow">{agentName}</p>
      <h1 className="h3-display">Today</h1>
      <Rule />

      <dl className="field-figures">
        <div className="field-figure">
          <dt className="eyebrow">Captured today</dt>
          <dd className="field-figure-value" data-captured={capturedToday}>
            {formatCount(capturedToday)}{" "}
            <span className="field-denominator">of {formatCount(target)}</span>
          </dd>
        </div>
        <div className="field-figure">
          <dt className="eyebrow">Of those, waiting on this phone</dt>
          <dd className="field-figure-value" data-pending={queue.length}>
            {formatCount(queue.length)}
          </dd>
        </div>
        <div className="field-figure">
          <dt className="eyebrow">Left to reach the target</dt>
          <dd className="field-figure-value">{formatCount(remaining)}</dd>
        </div>
      </dl>

      <p className="field-note" data-connection={online ? "online" : "offline"}>
        {online
          ? queue.length === 0
            ? FIELD_COPY.synced
            : FIELD_COPY.pending(queue.length)
          : FIELD_COPY.offlineIsNormal}
      </p>

      <Link href="/field/enrol" className="btn field-action">
        Enrol a household
      </Link>
      <Link href="/field/queue" className="btn-outline field-action">
        {queue.length === 0 ? "The queue is empty" : FIELD_COPY.pending(queue.length)}
      </Link>
    </div>
  );
}
