# Raheem assignment handoff

Updated 11 November 2026. The backend now implements the consolidated `Attest-Backend-Specification (1).docx` direction as well as the participant contract and organizer overrides. See [specification alignment](specification-alignment.md) for the current API routes, staged cadence, demonstration metadata and source-edition status. See [the detailed completion handover](backend-completion.md) for implementation, frontend API changes, provenance, live probe evidence and release boundaries.

## Verified locally

- `npm test`: **70 tests passed**, zero failures/cancellations. Includes PostgreSQL/PostGIS migrations, database permissions/immutability, 200-item batches, concurrent execution and unknown-outcome recovery, deferred submission, sparse responses, KML topology and upload authorization, report signatures/privacy, PDD candidate selection, carbon endpoints and reseed idempotency.
- Production API/worker/migrator bundles built; developer routes are absent. The build/type-safety gates pass.
- `npm run validate:schema` passed.
- `npm audit --audit-level=high` passed. Eight low-severity transitive elliptic advisories remain in the Hedera SDK chain.
- `node dist/scripts/demo.js`: 500 synthetic households paid through three 200/200/100 batches; chain and disclosure proof verification passed. Signed attestation and benefit-sharing report artifacts are under `output/`.
- `node dist/scripts/demo-assets.js`: verified the published 63-page Plan Vivo PDD; selected source page 47 and proposed 60% for mandatory human review. Downloaded/cached the published 2024 annual report for the side-by-side demo asset.

The workstation's installed Node 23.11.0 was used for these checks. The production image and CI use Node 24. Test concurrency is bounded to two files to reduce simultaneous PostGIS/WASM initialization; the integration timeout accommodates cold starts.

## New build behavior

The worker persists independent batches of at most 200 payments before contacting the bank. Unknown outcomes are only queried; a budget-deferred, unsubmitted batch resumes with its original key. `/requery` cannot submit money. Actual bank money fields are numeric at the HTTP boundary while Attest's API remains decimal strings.

Plan Vivo onboarding now supports KML upload, multipolygons and holes. Missing geometry returns `BOUNDARY_NOT_AVAILABLE`. The demo fixture uses the real Trees for Global Benefits project reference and a verified PDD excerpt, with explicitly synthetic participants, Nigerian sandbox payments and test geometry. Existing fixture histories are preserved. No real project boundary or issuance history is fabricated.

The canonical report route is `GET /api/attestations/:id/report` (JSON, or PDF using `?format=pdf`). The new JSON KML preview is `POST /api/registry/boundary`, with organisation-bound attachment during project creation. Benefit-sharing exports include the recorded commitment/source, enrolled/paid coverage, amounts received, charges, shortfall, confirmations, disputes, Merkle root, signed attestation and anchor reference. The report is separately signed and available as PDF and JSON to owning developers and verifiers.

The TGB seed now declares staged payments against verification and a separate annual reporting cadence. Fixture upgrades append new commitment records and preserve signed historical evidence. Public register/project responses expose explicit synthetic-data flags and separately sourced reference statistics. Bank item messages are retained only in authorised transfer views, with redaction and length limits.

The carbon API now uses `project_id`, `submission_id`, `credit_batch_id` and `retirement_id` with their documented endpoints. The reseed example includes the buyer checkout/payment required before retirement. Run/transfer records, signatures, privacy controls, evidence encryption, callbacks and corrections retain the existing safeguards.

## Live sandbox checks

The cluster is accessible now; the earlier TLS-blocker note is historical. A temporary diagnostic pod checked the internal tariff/balance/bank-availability endpoints, created synthetic wallets, and submitted one small mixed intrabank/NIP batch. Both recipients settled: NGN 20.00 received, NGN 10.75 charges. The first string-amount attempt was rejected without creating a batch; this exposed and fixed the wire-format mismatch. The diagnostic pod was deleted. No gateway key was printed or saved.

The active tariff is a worked-example response. Bulk results omit some settlement evidence and their `fee` summary may include combined charges, so individual transfer records are hydrated and reconciled before counting payment. A fully live 500-recipient run therefore needs several minutes within the shared request budget, plus sufficient distinct synthetic bank identities/accounts.

## Remaining release work

- Obtain an authentic project KML and provenance-backed Markit issuance export.
- Supply the PDD edition containing A.13.1 / Table 5. The report retains its verified J2.1/page-47 quotation and marks the requested edition pending; no unverified locator or missing allocation percentage is invented.
- Integrate Mark's frontend upload and download controls against the shared contracts and new API routes.
- Supply stable production secrets, restricted database credentials and an actual versioned image/pull credentials; run migrations through `004_batches_and_boundaries.sql` before starting this version.
- Perform the remaining in-cluster sweep for the full carbon flow, callback registration/recovery, account controls, onward-flow data and the full live roster.
- Provide/test optional SMTP, Africa's Talking and Hedera credentials. A real message, USSD session or public anchor was not certified during this work. Yoruba/Hausa/Igbo message drafts still require fluent review.
- Obtain the full updated platform-guide section 5.8; the provided organizer corrections are implemented, but the truncated third name-check mode was not inferred.

No public application deployment or image push was performed. The existing Kubernetes manifest retains its image placeholder. The local source changes have not been pushed. The November 11 alignment did not run new live bank mutations or deploy cluster resources. Synthetic probe records remain in the bank; no team-wide reset was issued.

For local review, run `npm install` then `npm run local`. Local keys, credentials, PostgreSQL/PostGIS state and mock-bank state persist under ignored `.local-state/`. Run `npm run demo` for exportable offline proof artifacts and `npm run demo:assets` for the source-document check.
