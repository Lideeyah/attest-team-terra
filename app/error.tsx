"use client";

import { Button } from "@/components/Button";

/* The global error boundary. Every screen after the foundation uses this
   rather than inventing its own failure surface. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="measure section">
      <div className="failure">
        <p className="eyebrow">This screen did not load</p>
        <p className="prose-muted">
          The request failed before the screen could be drawn. Nothing was
          submitted and no record was changed. Try again, and if it fails a
          second time the reference below identifies this failure in the logs.
        </p>
        {error.digest ? (
          <p className="record-cell">Reference {error.digest}</p>
        ) : null}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
