"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Notice } from "@/components/Notice";
import { api, newIdempotencyKey } from "@/lib/api/client";
import { RUN_COPY } from "@/lib/copy/console";
import { formatCount, formatNaira } from "@/lib/record";

/** Executing a run submits one bulk transfer. A shortfall does not stop it:
    it is recorded and published. Nothing here can be unsent, so the
    consequence is stated before the control, not after it. */
export function ExecuteRun({
  runId,
  shortfall,
  households,
}: {
  runId: string;
  shortfall: string;
  households: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<
    { kind: "idle" } | { kind: "refused"; line: string; note: string }
  >({ kind: "idle" });

  async function execute(): Promise<void> {
    const result = await api.execute(runId, newIdempotencyKey());
    if (!result.ok) {
      setOutcome({ kind: "refused", line: result.message, note: result.remediation });
      setOpen(false);
      return;
    }
    setOpen(false);
    router.push(`/app/runs/${runId}`);
  }

  return (
    <div className="stack">
      <p className="note">{RUN_COPY.executeNote}</p>
      <Button type="button" onClick={() => setOpen(true)} data-execute="true">
        {RUN_COPY.execute}
      </Button>

      {outcome.kind === "refused" ? (
        <Notice tone="blocked" title="The distribution was not submitted">
          <p>{outcome.line}</p>
          <p className="note">{outcome.note}</p>
        </Notice>
      ) : null}

      <Modal
        open={open}
        title="Execute this distribution"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <Button type="button" onClick={() => void execute()} data-execute-confirm="true">
              Execute
            </Button>
          </>
        }
      >
        <p className="prose">
          This submits one bulk transfer to {formatCount(households)} households.
        </p>
        {Number(shortfall) > 0 ? (
          <p className="prose">
            Funding is {formatNaira(shortfall)} short. The distribution proceeds and the
            shortfall is recorded in this period&rsquo;s attestation.
          </p>
        ) : null}
        <p className="note">Nothing here can be unsent once it is submitted.</p>
      </Modal>
    </div>
  );
}
