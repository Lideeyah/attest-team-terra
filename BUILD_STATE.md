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
Phase complete: F-6 — the field app. Gate green, 44 of 44, verified and
corrected after a verification that failed it.
Phase complete: F-7 — the verifier portal. Gate green, 69 of 69, verified and
corrected after a verification that failed it.
Phase complete: F-8 — the bank operations console. Gate green, 54 of 54,
verified and corrected after a verification that failed it.
Phase complete: F-9's cluster-free portion — platform admin, the motion, state,
copy and accessibility sweeps, the hardening checks and the demo path. Gate
green, 66 of 66, verified twice and corrected after each verification failed
it — the second found the first remediation's own defects, including a focus
trap it had introduced.

The front-end lane is built. What is left needs the sandbox: deployment, the
swap from the mock to the real backend, and the demo recording. All three are
written up in BUILD_LOG.md under F-9.

F-4's verification found fourteen things and all are fixed; its gate went from
51 assertions to 86. F-5's verification found thirty-one and all are
addressed; its gate went from 99 to 112. F-9's found fourteen — chief among
them an admin surface with no controls on it, a home screen that read a
refusal as an all-clear, and four sweeps weaker than they read — and all are
addressed; a second verification of the remediation found eighteen more,
including a focus trap the remediation itself introduced and an axe filter
that had hidden forty serious contrast failures for nine phases; its gate
went from 50 to 66, and most of the additions are checks the earlier ones
only appeared to be.

Every phase that has been independently verified has passed its own gate and
then failed the verification. The gates now carry roughly 130 assertions
written in response to that, and the pattern behind every one of them is the
same: a gate asserts what a screen does, and is blind to what it leaves out.

Spec patch 01 is applied in full. The demo seed note is applied: the
demonstration project is Trees for Global Benefits (ECOTRUST, Plan Vivo,
Uganda), labelled as a demonstration instance everywhere, carrying the real
PDD's benefit-sharing sentence verbatim (J2.1, page 44) with synthetic
payment data stated as synthetic on the public page. Spec patch 02 is applied in full: the demo
project is Plan Vivo PV-2314, onboarding step two carries the KML boundary
upload path behind BOUNDARY_NOT_AVAILABLE, and the benefit-sharing report
export exists on /verifier/export and /app/attestations.

The gate runs against two production builds, not a development server: a
development server does not hydrate under the headless browser it drives.

Resume by pasting the orchestration prompt from
`2026-11-09-attest-autobuild.md` into a fresh session. It reads this file and
starts at the next phase.

## Production integration checkpoint — 2026-11-11

Current branch: mark/production. Frontend and isolated backend are integrated; see docs/integration-status.md and docs/run-integrated.md. This checkpoint supersedes the demo-only resume guidance above for integration work. Local preview uses port 3001; backend uses 8080. External providers remain mocked. Missing backend APIs, production configuration and source-document alignment remain explicit follow-up items. No deployment has been made.

