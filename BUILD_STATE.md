# Build state

Phase complete: F-0 — foundation. Gate green, 31 of 31.
Phase complete: F-1 — mock server, typed client and /dev/states. Gate green,
42 of 42, verified over four passes.
Phase complete: F-2 — the landing page. Gate green, 45 of 45, verified over
four passes.
In progress: F-3 — the public register and verification surfaces. Its gate is
written; the typefaces are scoped per surface so the receipt can carry none.

The gate runs against two production builds, not a development server: a
development server does not hydrate under the headless browser it drives.

Resume by pasting the orchestration prompt from
`2026-11-09-attest-autobuild.md` into a fresh session. It reads this file and
starts at the next phase.
