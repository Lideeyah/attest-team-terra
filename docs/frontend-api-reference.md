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
