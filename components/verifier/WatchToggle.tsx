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
  const [error,setError]=useState("");
  const [on, setOn] = useState(watching);
  const [working, setWorking] = useState(false);

  async function toggle(): Promise<void> {
    setWorking(true);setError("");
    const result = await api.watch({ projectId });
    setWorking(false);
    if (result.ok) {
      setOn((current) => !current);
    }else setError(result.message);
  }

  return (
    <span className="stack-tight"><Button
      type="button"
      variant={on ? "quiet" : "outline"}
      small
      pending={working}
      disabled={working || (process.env.NEXT_PUBLIC_ATTEST_API_MODE==='live'&&on)}
      onClick={() => void toggle()}
      data-watch={projectId}
    >
      {on ? PROJECTS_COPY.watching : PROJECTS_COPY.watch}
    </Button>{error?<span role="alert">{error}</span>:null}</span>
  );
}
