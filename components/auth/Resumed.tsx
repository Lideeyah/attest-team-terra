"use client";

import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/Notice";

/* Resuming is a state, not a silent convenience: a reader who comes back a
   week later should be told that this is where they left off rather than
   wondering why the wizard is in the middle. */
export function Resumed() {
  const search = useSearchParams();
  if (search.get("state") !== "resumed") {
    return null;
  }
  return (
    <Notice title="Picking up where you left off">
      <p data-wizard="resumed">
        Everything entered before is still here. Any step already done can be
        opened from the row above.
      </p>
    </Notice>
  );
}
