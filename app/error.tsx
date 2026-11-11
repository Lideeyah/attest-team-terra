"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { Rule } from "@/components/Rule";

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
    <div className="measure section stack-lg">
      <div className="stack">
        <p className="eyebrow">500</p>
        <h2 className="h2-display">This screen did not load</h2>
        <Rule weight="heavy" />
      </div>
      <p className="prose-muted">
        We couldn’t load this page. Please try again. If you were submitting
        something, check its latest status before repeating the action.
      </p>
      {error.digest ? <p className="record-cell">Reference {error.digest}</p> : null}
      <div className="row">
        <Button onClick={reset}>Try again</Button>
        <Link className="btn-quiet btn-sm" href="/register">
          Open the register
        </Link>
      </div>
    </div>
  );
}
