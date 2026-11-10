# Build state

Phase complete: F-0 — foundation, plus the spec patch's back-edits. Gate green,
34 of 34.
Phase complete: F-1 — mock server, typed client and /dev/states. Gate green,
42 of 42.
Phase complete: F-2 — the landing page. Gate green, 45 of 45.
Phase complete: F-3 — the public surfaces. Gate green, 45 of 45, verified twice
and corrected after each.
Phase complete: F-4 — role selection, auth and onboarding. Gate green, 86 of
86, verified and corrected after a verification that failed it.
Phase complete: F-5 — the developer console. Gate green, 112 of 112, verified
and corrected after a verification that failed it.
Next phase: F-6 — the field app.

F-4's verification found fourteen things and all are fixed; its gate went from
51 assertions to 86. F-5's verification found thirty-one and all are
addressed; its gate went from 99 to 112.

Spec patch 01 is applied in full.

The gate runs against two production builds, not a development server: a
development server does not hydrate under the headless browser it drives.

Resume by pasting the orchestration prompt from
`2026-11-09-attest-autobuild.md` into a fresh session. It reads this file and
starts at the next phase.
