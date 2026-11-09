"use client";

/* The boundary of last resort. It replaces the whole document, so it carries
   its own minimal styling rather than the token stylesheet. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Attest did not load</h1>
          <p>
            The application failed before it could be drawn. Nothing was
            submitted and no record was changed.
          </p>
          {error.digest ? <p>Reference {error.digest}</p> : null}
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
