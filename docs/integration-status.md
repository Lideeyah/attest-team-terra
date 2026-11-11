# Integration status and remaining API gaps

Updated 11 November 2026. Work is on `mark/production`. Backend imported at
`ccc44d07c8b199edbfe4d0f6906db4e887dabf9d`; subsequent integration changes are committed
separately. The local preview connects real HTTP handlers and persistent PostgreSQL
with PostGIS. Its bank, registry, extraction, messaging and anchor providers are mocked.
This is not a deployed or verified-live banking service.

## Connected workflows

- Auth.js cookie/CSRF login, sign-out, role routing and authenticated server reads.
- Private project selection, registry/KML preview, project creation, multipart PDD
  extraction polling, sequential commitment review and staged reporting cadence.
- Agent invitation/device public key, administrator identity activation, Ed25519
  capture signatures, encrypted IndexedDB captures/profile/evidence and per-item sync.
- Roster reads/corrections, CSV capture import, preflight exclusions, decimal-string
  arithmetic, execute acknowledgement, definitive retries, uncertain-outcome requery,
  reconciliation and SSE plus bounded authoritative refresh.
- Public signed PDF and private signed report downloads, original-PDF/proof verification,
  receipt confirmation/disputes/audio, verifier watchlists, rules and JSON/CSV/PDF exports.
- Operations jobs/capabilities/signals/graphs/cases, extraction review, registry history/
  import, account linking and per-project chain checks.
- OpenStreetMap with actual H3 boundaries, layer toggles, scale, fit extent, popup
  inspection and an accessible count table. Private GIS adds complete PostGIS parcels
  and an optional capture-point layer; public pages never receive that point layer.

## Validation evidence

The full backend suite passed 72 tests, including scope, signatures, PDF integrity,
idempotency, charge arithmetic and provider-error handling. Frontend tests cover the
mock client plus live DTO conversion, historical denominators, geometry holes/multiple
parcels and CSV parsing. Type checks, changed-code lint and a production frontend build
are run separately; final results are reported in the handback.

The local HTTP acceptance runner is `npm run check:integration`. It checks cookie roles,
anonymous denial, persistent demo data, private/public geography boundaries, authenticated
server rendering, signed PDF round-trip, report denominator/signature, CSV provenance,
idempotent clean-fixture execution, durable outcomes and SSE through the actual proxy.
The initial run found delayed stream connection flushing; the backend now sends an
immediate handshake with no-transform/no-buffering headers. The rerun passed all 13
checks, retaining the already executed fixture rather than submitting another payment.

The browser review confirmed OSM tiles, real H3 placement, attribution, fit extent and
distribution layer toggling. Public synthetic labels remain visible. Original F-1/F-5/
F-9 gates are fixture-oriented, include assumptions about absent live API routes and do
not replace the integrated acceptance runner. No claim is made that all those gates
passed against the connected backend.

## APIs not originally supplied or still unavailable

| Requirement | Status and current behaviour |
| --- | --- |
| Private project collection | Added with organisation scoping; no public-register substitution for developer selection |
| Authorised GIS boundary/context | Added; verifier/public roles denied; agent point layer limited to own captures |
| Corporate KYB/tier onboarding | Not supplied; onboarding does not fabricate approval |
| Developer extraction job progress/failure details | No developer job-detail API; poll for a new proposal ID, then direct prolonged failures to operations |
| Verification email resend | No endpoint; original resend workflow remains an API gap |
| Public institution account provisioning | Not supplied; institution signup explains platform provisioning instead of creating a developer accidentally |
| Device-key rotation/lost-device recovery | No rotation endpoint; suspend lost devices, retain encrypted queue until acknowledgement, provision a replacement through an agreed process |
| Users and developer roles administration | No console user CRUD/invitation API; settings report this explicitly |
| Developer/verifier API-key administration | Not supplied; key issuance is not simulated |
| Outbound client webhook endpoints | No user-managed CRUD; provider callback registration is a different platform-admin operation |
| Notification preferences/inbox | No preference API; messaging provider/worker state is authoritative |
| Async import job tracking and failure files | No job endpoints; live CSV import uses per-item batch outcomes and displays failed rows directly |
| Wallet/date roster filters | Not supplied by the documented participant list; these controls are disabled in integrated mode |
| Watchlist removal | No delete route; the UI allows adding and displays watched state without pretending to remove |
| Alert update/removal | No routes; creation and returned rule/event state are integrated |
| Approved-language discovery | No capability API; field capture offers English only |
| Household milestone approval and staged allocations | Not supplied; staged schedule metadata is not automatic payment eligibility |
| Roster target management | No target endpoint; no target is inferred from current enrolment |
| Standalone admin onboarding/escalation decision queues | Not supplied; source-account linking and evidence-based resolution are distinguished from those absent workflows |
| Public parcel boundary | Not supplied; public map is aggregate geography, not private project geometry |
| Carbon checkout purchase | Not supplied; a payout reference cannot be used as checkout payment proof |

The optional carbon registration/MRV/retirement APIs remain backend capabilities;
this integration does not add a complete carbon marketplace or invent checkout proof.

## Remaining operational and security limits

- Supply the authentic project KML before presenting test rectangles as registry parcels.
  Fixture coordinates, household counts and payments are explicitly synthetic.
- Supply the requested PDD edition for A.13.1/Table 5. The verified J2.1/page 47 citation
  is retained; the unexplained allocation remainder is not invented.
- Real SMTP/SMS/USSD, bank flow/account-control capabilities, stable signing/identity/
  evidence keys and production Hedera anchoring require operator configuration. A
  configured capability or queued job is not proof of provider completion.
- The 120-request-per-observed-IP limit needs trusted ingress/proxy configuration in
  production. Server reads are deduplicated per render and polling is bounded, but
  shared-IP capacity and distributed rate limiting remain deployment concerns.
- Encrypted browser storage relies on the browser profile/device OS and same-origin
  script security. It is not a hardware-backed custody or remote-wipe system. There
  is no self-service recovery for cleared site data or a lost signing key.
- Explicitly rejected capture details can be corrected with a new request key; capture
  ID, signed point/time and signature are preserved. Queues are scoped to the capturing
  agent. Lost-device administrative recovery still needs a backend workflow.
- The field and administration forms are functional integrations; a full device/browser
  matrix, real-provider run, production load test and complete visual regression pass
  have not been established by local mock-provider acceptance.
- Deployment, container execution and ingress health have not been verified. Build for
  linux/amd64, configure the single externally published Service `app` on port 80,
  migrate the external PostGIS database and validate HTTPS cookies/streaming before release.
