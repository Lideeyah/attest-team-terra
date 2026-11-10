"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { RUN_COPY } from "@/lib/copy/console";
import type { PreflightExclusion } from "@/lib/api/contract";
import { formatCount } from "@/lib/record";

/* Pre-flight found enrolments that cannot be paid as they stand. Each is
   excluded here, with a reason, or corrected on the household's own record.
   Until every one is resolved the run does not execute, which is what the
   refusal on this step means: stating it and then offering to execute anyway
   would make the refusal decorative. */
export function PreflightExclusions({
  runId,
  exclusions,
  passed,
}: {
  runId: string;
  exclusions: PreflightExclusion[];
  passed: boolean;
}) {
  const [rows, setRows] = useState(exclusions);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [refused, setRefused] = useState<string | null>(null);
  const [clear, setClear] = useState(passed);

  const outstanding = rows.filter((row) => !row.excluded);

  async function exclude(participantId: string): Promise<void> {
    setRefused(null);
    const reason = reasons[participantId] ?? "";
    const result = await api.preflight(runId, {
      excluding: [{ participantId, reason }],
    });
    if (!result.ok) {
      setRefused(
        result.field === "reason"
          ? "An exclusion carries a reason of at least a few words. It stays on the record and is counted in the period's coverage denominator."
          : result.message,
      );
      return;
    }
    setRows(result.data.exclusions);
    setClear(result.data.passed);
  }

  if (clear) {
    return (
      <Notice title="Pre-flight passed">
        <p data-preflight="passed">
          {rows.length === 0
            ? RUN_COPY.preflightPassed
            : `Every one of the ${formatCount(rows.length)} enrolments pre-flight found is excluded with a reason. The run is ready to execute.`}
        </p>
      </Notice>
    );
  }

  return (
    <>
      <Notice
        tone="flagged"
        title={
          outstanding.length === 1
            ? "One enrolment cannot be paid as it stands"
            : `${formatCount(outstanding.length)} enrolments cannot be paid as they stand`
        }
      >
        <p data-preflight="exclusions">
          Each must be excluded with a reason or corrected before the run
          executes. An exclusion stays on the record and is counted in the
          period&rsquo;s coverage denominator, so excluding a household is not
          a way of improving the figure.
        </p>
      </Notice>
      <ul className="stack">
        {rows.map((exclusion) => (
          <li
            key={exclusion.participantId}
            className="exclusion-row"
            data-exclusion={exclusion.participantId}
            data-excluded={exclusion.excluded ? "true" : "false"}
          >
            <div className="stack-tight">
              <Link
                href={`/app/roster/${exclusion.participantId}`}
                prefetch={false}
                className="record-cell"
              >
                {exclusion.participantId}
              </Link>
              <p className="eyebrow">{headingFor(exclusion.reason, exclusion.detail)}</p>
              <p className="note">{exclusion.detail}</p>
            </div>
            {exclusion.excluded ? (
              <Stamp state="flagged" label="Excluded" recordId={exclusion.participantId} />
            ) : (
              <div className="stack-tight">
                <label className="label" htmlFor={`reason-${exclusion.participantId}`}>
                  Why it is excluded
                </label>
                <textarea
                  id={`reason-${exclusion.participantId}`}
                  className="textarea"
                  rows={2}
                  value={reasons[exclusion.participantId] ?? ""}
                  onChange={(event) =>
                    setReasons((previous) => ({
                      ...previous,
                      [exclusion.participantId]: event.target.value,
                    }))
                  }
                  data-exclusion-reason={exclusion.participantId}
                />
                <Button
                  type="button"
                  variant="outline"
                  small
                  onClick={() => void exclude(exclusion.participantId)}
                  data-exclude={exclusion.participantId}
                >
                  Exclude from this run
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {refused ? (
        <Notice tone="blocked" title="The exclusion was not recorded">
          <p>{refused}</p>
        </Notice>
      ) : null}
    </>
  );
}
