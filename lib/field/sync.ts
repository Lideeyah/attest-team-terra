import { field } from "@/lib/field/api";
import { ERROR_CODES } from "@/lib/api/contract";
import type { ErrorCode } from "@/lib/api/contract";
import { CODE_HEADING } from "@/lib/copy/codes";
import {
  readQueue,
  removeEnrolment,
  updateEnrolment,
  type QueuedEnrolment,
} from "@/lib/field/queue";

/* Draining the queue. The batch is idempotent on each item's client UUID and
   the server answers per item, so a batch where one household's account number
   is wrong sends the other forty-nine and says which one to look at. A batch
   that failed wholesale would tell an agent nothing. */

export type SyncOutcome = {
  sent: number;
  accepted: number;
  failed: { clientUuid: string; code: string; message: string }[];
  /** True when the connection was the problem, rather than any item. */
  transport: boolean;
};

const BATCH = 25;

function messageFor(code: string): string {
  return (
    CODE_HEADING[code as ErrorCode] ??
    (ERROR_CODES.includes(code as ErrorCode)
      ? "The server refused this enrolment"
      : "This enrolment was not accepted")
  );
}

export async function drainQueue(): Promise<SyncOutcome> {
  const queued = (await readQueue()).filter((item) => item.state !== "syncing");
  if (queued.length === 0) {
    return { sent: 0, accepted: 0, failed: [], transport: false };
  }

  const batch = queued.slice(0, BATCH);
  await Promise.all(
    batch.map((item) => updateEnrolment(item.clientUuid, { state: "syncing" })),
  );

  const result = await field.submitEnrolments({ items: batch.map(toPayload) });

  if (!result.ok) {
    /* Nothing is discarded: the queue is the record until the server has it,
       and a connection that died is not an answer about any household. */
    await Promise.all(
      batch.map((item) =>
        updateEnrolment(item.clientUuid, {
          state: "queued",
          attempts: item.attempts + 1,
          failure: result.transport
            ? null
            : { code: result.code, message: result.message },
        }),
      ),
    );
    return {
      sent: batch.length,
      accepted: 0,
      failed: result.transport
        ? []
        : batch.map((item) => ({
            clientUuid: item.clientUuid,
            code: result.code,
            message: result.message,
          })),
      transport: result.transport,
    };
  }

  const failed: SyncOutcome["failed"] = [];
  let accepted = 0;

  for (const item of batch) {
    const answer = result.data.find(
      (candidate) => candidate.clientUuid === item.clientUuid,
    );
    if (answer && answer.accepted) {
      accepted += 1;
      await removeEnrolment(item.clientUuid);
      continue;
    }
    const code = answer?.code ?? "NOT_FOUND";
    const message = messageFor(code);
    failed.push({ clientUuid: item.clientUuid, code, message });
    await updateEnrolment(item.clientUuid, {
      state: "failed",
      attempts: item.attempts + 1,
      failure: { code, message },
    });
  }

  return { sent: batch.length, accepted, failed, transport: false };
}

function toPayload(item: QueuedEnrolment) {
  return {
    clientUuid: item.clientUuid,
    capturedAt: item.capturedAt,
    agentId: item.agentId,
    projectId: item.projectId,
    consentAt: item.consentAt,
    identity: { type: item.identity.type, number: item.identity.number },
    details: item.details,
    photograph: item.photograph,
    location: item.location,
    boundaryReason: item.boundaryReason,
    flags: item.flags,
    signature: item.signature,
  };
}
