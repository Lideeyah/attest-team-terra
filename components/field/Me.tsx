"use client";

import { Rule } from "@/components/Rule";
import { ME_COPY } from "@/lib/copy/field";
import { flagRate, syncDelay } from "@/lib/console-format";
import { formatCount } from "@/lib/record";
import type { Agent } from "@/lib/api/contract";

/* The agent's own record, shown to them before anybody else raises it. The
   flag rate is stated with what a flag is, and without a verdict about the
   person: the figures are the project's to act on, and this screen's job is
   that the agent is never surprised by them. */
export function Me({ agent, threshold }: { agent: Agent; threshold: number }) {
  const above = agent.flagRate > threshold;
  const flagged = Math.round(agent.flagRate * agent.enrolments);
  const allowed = Math.round(threshold * agent.enrolments);

  return (
    <div className="field-screen stack">
      <p className="eyebrow">{agent.email}</p>
      <h1 className="h3-display">{agent.name}</h1>
      <Rule />

      {agent.enrolments === 0 ? (
        <p className="field-readable" data-me="none">
          {ME_COPY.none}
        </p>
      ) : (
        <>
          <dl className="field-figures">
            <div className="field-figure">
              <dt className="eyebrow">Enrolments</dt>
              <dd className="field-figure-value">{formatCount(agent.enrolments)}</dd>
            </div>
            <div className="field-figure">
              <dt className="eyebrow">Enrolments carrying a flag</dt>
              <dd className="field-figure-value" data-flag-rate={agent.flagRate}>
                {formatCount(flagged)}{" "}
                <span className="field-denominator">
                  of {formatCount(agent.enrolments)} · {flagRate(agent.flagRate)}
                </span>
              </dd>
            </div>
            <div className="field-figure">
              <dt className="eyebrow">Average sync delay</dt>
              <dd className="field-figure-value">
                {syncDelay(agent.averageSyncDelaySeconds)}
              </dd>
            </div>
          </dl>
          {above ? (
            <>
              <p className="field-readable" data-me="above-threshold">
                {ME_COPY.aboveThreshold}
              </p>
              <p className="field-note" data-me-arithmetic>
                {ME_COPY.arithmetic(
                  flagged,
                  agent.enrolments,
                  allowed,
                  Math.round(threshold * 100),
                )}
              </p>
            </>
          ) : null}
          <p className="field-note">{ME_COPY.syncNote}</p>
        </>
      )}
    </div>
  );
}
