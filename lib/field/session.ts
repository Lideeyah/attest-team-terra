"use client";

import { useEffect, useState } from "react";
import { field } from "@/lib/field/api";
import type { Agent } from "@/lib/api/contract";
import type { Boundary } from "@/lib/field/capture";
import { readStored, writeStored } from "@/lib/field/storage";

/* The session, held on the device.

   A field app that needs the server to render its own capture flow does not
   work in the place it is for. The agent signs in once with a connection; the
   session, the agent's own record and the project's boundary are written to
   the device, and every screen afterwards renders from that — with or without
   a connection. The cached copy carries when it was taken and when it stops
   being good for, because a stale boundary is a wrong boundary. */

export type FieldSession = {
  agent: Agent;
  today: { captured: number; queued: number; target: number };
  boundary: Boundary;
  flagThreshold: number;
  cachedAt: string;
};

/** How long a cached session is good for without a connection. An agent is
    out for a day or two; after a fortnight the device signs in again. */
const GOOD_FOR_DAYS = 14;

const KEY = "attest-field-session";

export function readCachedSession(): FieldSession | null {
  const raw = readStored(KEY);
  return raw ? (JSON.parse(raw) as FieldSession) : null;
}

function cache(session: FieldSession): void {
  writeStored(KEY, JSON.stringify(session));
}

export function expiresOn(session: FieldSession): string {
  return new Date(
    Date.parse(session.cachedAt) + GOOD_FOR_DAYS * 86_400_000,
  ).toISOString();
}

export function hasExpired(session: FieldSession): boolean {
  return Date.parse(expiresOn(session)) < Date.now();
}

export type SessionState =
  | { state: "loading" }
  | { state: "live"; session: FieldSession }
  | { state: "cached"; session: FieldSession; expiresOn: string }
  | { state: "expired"; session: FieldSession }
  | { state: "unbound"; code: string; message: string };

/** The session for this device: the server's answer when there is one, the
    cached copy when there is not. */
export function useFieldSession(): SessionState {
  const [state, setState] = useState<SessionState>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void field
      .me()
      .then((result) => {
        if (!live) {
          return;
        }
        if (result.ok) {
          const session: FieldSession = {
            agent: result.data.agent,
            today: result.data.today,
            boundary: { ...result.data.boundary },
            flagThreshold: result.data.flagThreshold,
            cachedAt: new Date().toISOString(),
          };
          cache(session);
          setState({ state: "live", session });
          return;
        }

        const cached = readCachedSession();
        if (cached && !result.transport) {
          /* The server answered and refused. A refusal is about the device,
             not about the connection. */
          setState({ state: "unbound", code: result.code, message: result.message });
          return;
        }
        if (cached) {
          setState(
            hasExpired(cached)
              ? { state: "expired", session: cached }
              : { state: "cached", session: cached, expiresOn: expiresOn(cached) },
          );
          return;
        }
        setState({ state: "unbound", code: result.code, message: result.message });
      })
      .catch(() => {
        if (!live) {
          return;
        }
        const cached = readCachedSession();
        setState(
          cached
            ? hasExpired(cached)
              ? { state: "expired", session: cached }
              : { state: "cached", session: cached, expiresOn: expiresOn(cached) }
            : {
                state: "unbound",
                code: "TIMEOUT",
                message: "This phone has never signed in and has no connection now.",
              },
        );
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}
