"use client";

import { useState } from "react";
import { Notice } from "@/components/Notice";
import { deviceId } from "@/lib/field/queue";
import { field } from "@/lib/field/api";

/* An unbound phone can do one thing: ask to be bound. The request carries the
   device's own identifier, and the project administrator approves it in the
   console — which is why an agent cannot bind their own phone and why a lost
   phone stops enrolling the moment the project says so. */
export function BindRequest() {
  const [state, setState] = useState<"idle" | "asking" | "asked" | "refused">("idle");
  const [identifier, setIdentifier] = useState<string | null>(null);

  async function ask(): Promise<void> {
    setState("asking");
    const id = await deviceId().catch(() => null);
    setIdentifier(id);
    const result = await field.bindDevice({ deviceKey: id ?? "unknown" });
    setState(result.ok ? "asked" : "refused");
  }

  if (state === "asked") {
    return (
      <Notice title="The request is with the project">
        <p className="field-readable" data-bind="asked">
          This phone is {identifier ?? "unidentified"}. The project
          administrator approves it in the console, and this app starts
          capturing as soon as they do.
        </p>
      </Notice>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn field-action"
        data-bind-request
        disabled={state === "asking"}
        onClick={() => void ask()}
      >
        {state === "asking" ? "Asking the project" : "Ask the project to bind this phone"}
      </button>
      {state === "refused" ? (
        <p className="field-note" data-bind="refused">
          The request did not reach the project. It can be made again when
          there is a connection.
        </p>
      ) : null}
    </>
  );
}
