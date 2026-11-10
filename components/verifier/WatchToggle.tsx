"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { api } from "@/lib/api/client";
import { PROJECTS_COPY } from "@/lib/copy/verifier";

/* Watching a project is a reader's own bookmark. It changes nothing about the
   project and says nothing about it. */
export function WatchToggle({
  projectId,
  watching,
}: {
  projectId: string;
  watching: boolean;
}) {
  const [on, setOn] = useState(watching);
  const [working, setWorking] = useState(false);

  async function toggle(): Promise<void> {
    setWorking(true);
    const result = await api.watch({ projectId });
    setWorking(false);
    if (result.ok) {
      setOn((current) => !current);
    }
  }

  return (
    <Button
      type="button"
      variant={on ? "quiet" : "outline"}
      small
      disabled={working}
      onClick={() => void toggle()}
      data-watch={projectId}
    >
      {on ? PROJECTS_COPY.watching : PROJECTS_COPY.watch}
    </Button>
  );
}
