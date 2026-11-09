import type { ErrorCode } from "@/lib/api/contract";

/* The only module that talks to the developer-tooling endpoints. They are not
   part of the contract, so they are not in the typed client; keeping them here
   means no screen anywhere holds a fetch of its own. This file exists only in
   a build with ATTEST_DEV_TOOLS set. */

export type Forced = {
  code: ErrorCode | null;
  pathFragment: string | null;
  once: boolean;
};

export async function readForcedState(): Promise<Forced> {
  const response = await fetch("/api/dev/force");
  const payload = (await response.json()) as { forced: Forced };
  return payload.forced;
}

export async function forceCode(
  code: ErrorCode | null,
  pathFragment: string | null,
  once: boolean,
): Promise<Forced> {
  const response = await fetch("/api/dev/force", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, pathFragment, once }),
  });
  const payload = (await response.json()) as { forced: Forced };
  return payload.forced;
}

export type StreamConfig = {
  rate: number;
  failureShare: number;
  reversalShare: number;
  transfers: number;
};

export async function readStreamConfig(): Promise<StreamConfig> {
  const response = await fetch("/api/dev/stream-config");
  const payload = (await response.json()) as { data: StreamConfig };
  return payload.data;
}

export async function configureStream(
  next: Partial<StreamConfig>,
): Promise<StreamConfig> {
  const response = await fetch("/api/dev/stream-config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(next),
  });
  const payload = (await response.json()) as { data: StreamConfig };
  return payload.data;
}
