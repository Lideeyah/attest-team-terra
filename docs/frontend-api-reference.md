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
