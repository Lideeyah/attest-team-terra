import type { Agent, ErrorCode } from "@/lib/api/contract";

/* The field app's own client, carrying the four calls it makes and nothing
   else.

   The typed client in lib/api/client.ts covers ninety endpoints and every
   screen in the product. Importing it here would put all of them in the
   bundle a phone on 3G downloads before an agent can enrol anybody, and the
   field app is held to 150KB. Same envelope, same codes, same shape of
   result — a tenth of the weight. */

const BASE = process.env.NEXT_PUBLIC_ATTEST_API_URL ?? "";

export type FieldResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; transport: boolean };

async function call<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<FieldResult<T>> {
  /* No connection is not an error here: it is the normal case, and the
     caller works from the device instead. The failure comes back as a typed
     result like every other, so nothing above this has to catch. */
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  }).catch(() => null);

  if (response === null) {
    return {
      ok: false,
      code: "TIMEOUT",
      message: "There is no connection.",
      transport: true,
    };
  }

  const payload = (await response.json().catch(() => null)) as {
    status: string;
    data?: T;
    error?: { code: ErrorCode; message: string };
  } | null;

  if (payload === null) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "The server did not answer in the contract's shape.",
      transport: false,
    };
  }

  if (payload.status === "success" && payload.data !== undefined) {
    return { ok: true, data: payload.data };
  }
  return {
    ok: false,
    code: payload.error?.code ?? "INVALID_REQUEST",
    message: payload.error?.message ?? "The server did not answer in the contract's shape.",
    transport: false,
  };
}

export type FieldMe = {
  agent: Agent;
  today: { captured: number; queued: number; target: number };
  boundary: { name: string; north: number; south: number; east: number; west: number };
  flagThreshold: number;
};

export const field = {
  me: () => call<FieldMe>("/api/field/me"),
  checkIdentity: (body: { type: "BVN" | "NIN"; number: string }) =>
    call<{ checked: boolean; lastFour: string }>("/api/field/identity-check", {
      method: "POST",
      body,
    }),
  submitEnrolments: (body: { items: unknown[] }) =>
    call<{ clientUuid: string; accepted: boolean; code: ErrorCode | null }[]>(
      "/api/field/enrolments",
      { method: "POST", body },
    ),
  bindDevice: (body: { deviceKey: string }) =>
    call<{ bound: boolean; deviceId: string }>("/api/field/device/bind", {
      method: "POST",
      body,
    }),
};
