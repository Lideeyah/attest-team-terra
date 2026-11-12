# Integrated frontend API reference

The imported backend reference is [backend/docs/frontend-api-reference.md](../backend/docs/frontend-api-reference.md).
Read its companion [integration guide](../backend/docs/frontend-integration.md) for
payloads, role restrictions, evidence formats, idempotency and signature semantics.

Integration extensions added on `mark/production`:

| Endpoint | Access | Purpose |
| --- | --- | --- |
| GET /api/projects | Owning developer roles | Paginated private project selector |
| GET /api/projects/:id/map | Scoped developers, operations, own-project agent | Full GeoJSON, PostGIS area, synthetic-boundary provenance and bounded private capture points; agents receive only their own points |
| GET /api/auth/session | Authenticated | Email and authorised selected/default project, without credentials |
| GET /api/projects/:id | Scoped reader | Accepted commitment, signed history and authoritative run period summaries |
| GET /api/projects/:id/runs and /api/runs/:id | Owning developer | Roster size, transfer-state/failure counts and settlement-derived period summary |
| GET /api/projects/:id/funding | Owning developer | Linked account and observed funding events, with reconciliation totals |

Agent reads now explicitly exclude stored credential and device-key fields. Signed
record views include anchor, chain position, discontinuity and supersession metadata.
Public/verifier geography stays H3 resolution 4 with cells below five suppressed;
the private GIS endpoint is not a public boundary or household-location API.

See [integration status and gaps](integration-status.md) for unsupported routes.


## Resumable document processing

`GET /api/projects/:id/extraction/status` returns `{ id, state, error, proposal }` for the most recent uploaded document. `id` is null and `state` is `not_uploaded` before upload; job states are `pending`, `running`, `done`, or `failed`. A completed job can return a proposal requiring manual review instead of an automatically extracted commitment. Never treat a successful HTTP response as a completed document check. Project access is checked before exposing the status.

`GET /api/projects/:id/extraction/jobs/:jobId` returns the same status shape for a particular extraction job and validates both project access and job ownership. Existing `GET /api/projects/:id/extraction` behaviour remains unchanged. Hosted document jobs have a separate lane from payment reconciliation; claims remain durable and mutually exclusive.


## November 12 product integration additions

All workspace routes require a valid same-origin session. Project routes enforce organisation scope. Mutations require `Idempotency-Key`; revisioned drafts/policies/alert edits also check the submitted revision. Money is an NGN decimal string. Public project/verification pages remain public.

| Route | Purpose | Access |
| --- | --- | --- |
| GET `/api/projects/:id/wallet` | Queried bank balance, recognised income, reservations and distributions | Operator/admin |
| GET `/api/projects/:id/incoming-receipts` | Paged incoming payments | Operator/admin |
| POST `/api/incoming-receipts/:id/basis` | Record evidenced gross/net basis before allocation | Developer admin |
| GET/PATCH `/api/projects/:id/automation-policy` | Versioned rules, pause/activation and explicit backlog | Read operator; write developer admin |
| GET `/api/projects/:id/allocations` and `/api/allocations/:id` | Entitlements, holds and transfer outcomes | Operator/admin |
| POST `/api/allocations/:id/release` | Reasoned release after current identity/account checks | Developer admin |
| POST `/api/projects/:id/account/provision` | Dedicated receiving account; does not imply debit support | Developer admin |
| GET/POST `/api/organisation/verification` | Bank merchant-check status/submission with director consent | Read operator; write developer admin |
| GET/PATCH `/api/projects/:id/commitment-draft` | Revision-checked automatic saving | Operator/admin |
| POST `/api/projects/:id/commitment-draft/approve` | Approve structured source terms as a new version | Developer admin |
| GET `/api/projects/:id/commitment-history` | Approved/extracted source history | Operator/admin |
| GET `/api/projects/:id/documents` and `/documents/:documentId/file` | Retained encrypted original PDFs | Operator/admin |
| GET `/api/projects/:id/ledger-events` and `/api/ledger-events/:id/proof` | Signed journal and separate anchor status | Operator/admin |
| POST/GET `/api/projects/:id/location-datasets` | KML points/polygons or coordinate CSV; paged metadata | Scoped operator/admin; agent read |
| POST `/api/projects/:id/participant-imports` | Encrypted durable import, up to 500 rows | Operator/admin |
| GET `/api/participant-imports/:id` | Redacted per-row progress/results | Operator/admin |
| POST `/api/participants/:id/verification` | Recheck/correct account; optional original-identity recheck | Operator/admin |
| PATCH `/api/participants/:id/communication-consent` | Evidence of WhatsApp permission | Operator/admin |
| GET `/api/projects/:id/messages` | Channel capability and paged attempts | Operator/admin |
| POST `/api/field/device/recovery-request` | Replacement-device request | Agent |
| GET `/api/projects/:id/device-recoveries`; POST `/api/device-recoveries/:id/approve` | Review and approve replacement; revoke old sessions | Developer admin |
| GET `/api/projects/:id/payment-map` | Exact private payment geography and unmapped totals | Operator/admin |
| GET `/api/verifier/projects/:id/payment-map` | Coarsened, masked payment geography | Verifier |
| GET `/api/ops/incoming-exceptions`; POST `/api/ops/incoming-receipts/:id/attribute` | Review unmatched/held receipts | Bank ops/platform admin |
| DELETE `/api/verifier/watchlist/:id` | Remove own watched project | Verifier |
| GET/PATCH/DELETE `/api/verifier/alerts/:id` | Inspect/edit/stop own rule; preserve fired evidence | Verifier |
| GET `/api/jobs/:id` | Scoped background progress | Authorised workspace role |
| GET/POST `/hooks/whatsapp` | Provider challenge and signed delivery outcomes | Provider-authenticated |

`POST /api/admin/projects/:id/account` now requires `accountNumber`, `ownershipVerified: true` and a reason/evidence of at least ten characters. A readable balance is not treated as ownership evidence. Outstanding obligations prevent changing an existing source account.

Staged commitments require a separate reporting cadence and a milestone release condition. Payout deadlines remain independent from reporting closure. Net-revenue deductions remain reserved until a reviewed expense workflow exists.

See `docs/attest-build-status-2026-11-12.md` for observed acceptance evidence and provider/product gaps. The receiving-account probe disproved a direct VA-to-payout path; these proceeds are held rather than represented as spendable bank funds.
