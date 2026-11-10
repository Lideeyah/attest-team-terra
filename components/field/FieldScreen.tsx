"use client";

import type { ReactNode } from "react";
import { Notice } from "@/components/Notice";
import { BindRequest } from "@/components/field/BindRequest";
import { headingFor } from "@/lib/copy/codes";
import type { ErrorCode } from "@/lib/api/contract";
import { useFieldSession, type FieldSession } from "@/lib/field/session";
import { formatDate } from "@/lib/record";

/* Every field screen renders from the device's own session, so every field
   screen opens with no connection. The state of that session — live, cached
   with an expiry, expired, or a device that is not bound — is shown rather
   than hidden, because an agent who does not know their session is cached
   cannot know why a figure is a day old. */
export function FieldScreen({
  children,
}: {
  children: (session: FieldSession) => ReactNode;
}) {
  const state = useFieldSession();

  if (state.state === "loading") {
    return <p className="field-note">Opening</p>;
  }

  if (state.state === "unbound") {
    return (
      <div className="field-screen stack">
        <Notice
          tone="blocked"
          title={headingFor(state.code as ErrorCode, "This phone is not bound to an agent")}
        >
          <p className="field-readable" data-field-state="unbound">
            {state.code === "DEVICE_UNBOUND"
              ? "This phone is not bound to an agent yet. The project administrator approves the binding, and until they do no enrolment can be captured on it. Anything already captured stays on the phone."
              : state.message}
          </p>
        </Notice>
        <BindRequest />
      </div>
    );
  }

  if (state.state === "expired") {
    return (
      <div className="field-screen stack">
        <Notice tone="flagged" title="This phone needs a connection">
          <p className="field-readable" data-field-state="expired">
            The session on this phone is more than a fortnight old. Find a
            connection and open the app once; everything already captured is
            still here and is sent when that happens.
          </p>
        </Notice>
      </div>
    );
  }

  return (
    <>
      {state.state === "cached" ? (
        <p className="field-note" data-field-state="cached">
          Working from what is on this phone. It stays good until{" "}
          {formatDate(state.expiresOn)}.
        </p>
      ) : null}
      {children(state.session)}
    </>
  );
}
