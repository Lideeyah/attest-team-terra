"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";

/* A submit button that says what it is doing while it does it. Validation
   against the registry, the bank or the identity service is a round trip, and
   a button that looks idle during one invites a second press. */
export function Submit({
  label,
  pending,
  variant = "solid",
  marker,
}: {
  label: string;
  pending: string;
  variant?: "solid" | "outline" | "quiet";
  /** A data attribute the gate and the state panel can name it by. */
  marker?: string;
}) {
  const status = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={status.pending}
      aria-busy={status.pending ? "true" : undefined}
      data-submit-state={status.pending ? "validating" : "idle"}
      {...(marker ? { [marker]: "" } : {})}
    >
      {status.pending ? pending : label}
    </Button>
  );
}
