# Frontend endpoint reference

Updated 11 November 2026. Read the [integration guide](frontend-integration.md) first for setup, authentication, envelopes, idempotency, money, payment states, SSE and demonstration labels. Paths below are relative to the application origin. Replace `:id`, `:code`, and `:token` with URL-encoded actual identifiers. These are implemented Attest endpoints, not the upstream bank API.

Role shorthand: **Dev** = `developer_admin` or `developer_operator`, scoped to the owning organisation; **Admin** = `developer_admin`; **Ops** = `bank_ops` or `platform_admin`; **Platform** = `platform_admin`; **Verifier** = `verifier`; **Agent** = active agent scoped to their project/own captures. “Public” means no login, not exemption from JSON mutation idempotency. In tables, bodies/results describe envelope `data` unless explicitly marked binary/stream/HTML.

## Authentication

| Method and path | Access | Body/result |
| --- | --- | --- |
| `POST /api/auth/signup` | Public | `{ email, password, organisation }` -> `{ id, verificationRequired: true }`; only developer administrator signup |
| `POST /api/auth/verify-email` | Public | `{ token }` -> `{ verified: true }` |
| `POST /api/auth/signin` | Public | `{ email, password }` -> `{ token, expiresIn: 28800 }`; bearer token, no session cookie |
| `GET /api/auth/session` | Authenticated | Current principal; invalid/missing session is 401 |
| `POST /api/auth/reset/request` | Public | `{ email }` -> generic `{ accepted: true }` |
| `POST /api/auth/reset/confirm` | Public | `{ token, password }` -> `{ reset: true }`; invalidates prior sessions |
| `GET /auth/signin` | Public | Hosted Auth.js login HTML |
| `GET /auth/csrf` | Public | Auth.js CSRF JSON and cookie, outside the Attest envelope |
| `POST /auth/callback/credentials` | Public | Auth.js URL-encoded credentials/CSRF form -> redirect and cookie |
| `GET /auth/signout` | Cookie session | Hosted Auth.js sign-out confirmation/CSRF flow |

## Project setup, boundary and commitment

| Method and path | Access | Body/result |
| --- | --- | --- |
| `POST /api/projects/lookup` | Dev | `{ registryId }` -> registry reference including boundary availability |
| `POST /api/registry/boundary` | Dev | `{ kml, name }` -> preview geometry, primary-ring `points`, area, `boundaryId`, hash |
| `POST /api/projects` | Admin | `{ registryId, boundaryId? }` -> created private project; `{ registryRecord: { registryId, boundaryId? } }` also accepted |
| `GET /api/projects/:id` | Scoped Dev/Agent or Ops | Private project record; verifiers use `/api/verifier/projects/:id` |
| `GET /api/projects/:id/boundary` | Dev | `{ boundary, boundaryStatus: 'available' }`, or missing-boundary error |
| `POST /api/projects/:id/boundary` | Dev | Multipart `.kml` <=2 MiB -> boundary/status/hash |
| `POST /api/projects/:id/pdd` | Dev | Multipart PDF <=10 MiB and 300 pages -> `{ jobId }` |
| `GET /api/projects/:id/extraction` | Dev | Latest commitment row or `null`; not a job-progress endpoint |
| `PATCH /api/projects/:id/commitment` | Dev | `{ field, value, reason }` -> appended commitment version; fields/review sequence in the integration guide |
| `POST /api/projects/:id/registry/sync` | Admin | `{}` -> `{ jobId }`; configured source refresh |
| `POST /api/admin/projects/:id/account` | Platform | `{ accountNumber }` (10 digits) -> `{ linked: true }`; checks bank balance and prevents linking the same source account to another project |

There is no private project collection endpoint and no developer KYB/tier-onboarding API. Agree any missing screen requirement before presenting it as a supported backend workflow.

## Participants and household evidence

| Method and path | Access | Body/result |
| --- | --- | --- |
| `GET /api/projects/:id/participants` | Dev | Paginated; `q`, `status`, `agent`, `tier`, `flagged=true`; phones masked |
| `POST /api/projects/:id/participants` | Dev | `{ items: EnrolmentInput[] }`, 1-500 captures -> array of per-item success/error results |
| `GET /api/participants/:id` | Dev/own Agent | Scoped participant detail |
| `PATCH /api/participants/:id` | Dev | `{ phone?, status?, reason }`; status `active`, `removed`, `suspended` |
| `DELETE /api/participants/:id` | None | Always rejected with `PARTICIPANT_DELETE_NOT_PERMITTED` |
| `GET /api/participants/:id/payments` | Dev | Paginated transfer history |
| `POST /api/participants/:id/name-check` | Dev | `{}` -> `{ accountName, match, kycLevel, flags }` |
| `POST /api/participants/:id/receipts/revoke` | Dev | `{ reason }` -> `{ revoked: number }`; revokes that participant's receipt tokens |
| `GET /api/projects/:id/notifications/summary` | Dev/Ops | `{ enrolled, noticePending, noReachableNumber }` |
| `POST /api/projects/:id/evidence?kind=photograph` | Dev/Agent | Multipart file -> `{ id, kind, sha256 }`; other kinds below |
| `GET /api/evidence/:id` | Authorised scoped reader | Binary attachment; disclosure is audited |

Evidence is limited to **5 MiB**, one file. `photograph` accepts JPEG/PNG; `consent` accepts MP3 (`audio/mpeg`), Ogg, WAV or PDF; `voice_note` accepts MP3/Ogg/WAV. WebM audio is not currently supported. Supply a supported actual media format, not just a renamed extension. Evidence storage requires a configured backend encryption key. Keep returned IDs and pass `photographId`/`consentEvidenceId` in enrolment; the server checks project, kind and uploader ownership.

## Agents and offline field capture

| Method and path | Access | Body/result |
| --- | --- | --- |
| `GET /api/projects/:id/agents` | Dev | Paginated agent records |
| `POST /api/projects/:id/agents/invite` | Admin | `{ name, email }` -> `{ code }`; single use, expires after 48 hours |
| `GET /api/invites/:code` | Public | `{ projectId, expiresAt }` if the invite is usable |
| `POST /api/invites/:code/redeem` | Public | `{ identity: { email, password }, deviceKey }` -> `{ id }`; email must match invite; Ed25519 SPKI PEM public key |
| `POST /api/invites/:code/revoke` | Admin | `{}` -> revoked invite record |
| `GET /api/agents/:id` | Dev | Agent record |
| `POST /api/agents/:id/identity` | Admin | `{ bvn, firstName, lastName, dateOfBirth }` -> verification decision; a match activates the agent |
| `PATCH /api/agents/:id` | Admin | `{ status: 'active' \| 'suspended', reason }`; activation requires a recorded identity match |
| `POST /api/field/device/bind` | Agent | `{ deviceKey }` -> `{ bound: true }` only if it equals the invite-registered key |
| `GET /api/field/me` | Agent | Agent profile plus own `enrolments: [{ id, flags, syncDelayMs }]` |
| `POST /api/field/enrolments` | Agent | `{ items: EnrolmentInput[] }` -> same per-item result format as developer capture |
| `GET /api/field/enrolments/:id` | Own Agent/Dev | Scoped capture detail |

Redeeming an invite initially creates `pending_verification`, so show an activation-pending screen before trying agent login. Device binding validates an existing key; it does not replace a lost device key. There is no implemented self-service device rotation endpoint. Agent list/detail shapes are not identical to the compact shared `ParticipantSummary` type; select only the fields needed for display.

Each agent capture needs a base64 Ed25519 signature over the UTF-8 canonical JSON of exactly:

```ts
const payloadToSign = {
  clientId: capture.clientId,
  projectId: capture.projectId,
  capturedAt: capture.capturedAt,
  point: capture.point ?? null,
};
```

Canonical JSON recursively sorts object keys alphabetically, omits undefined object properties, preserves array order and uses JSON primitive encoding. The top-level byte order is `capturedAt`, `clientId`, `point`, `projectId`. For example, the string to sign is compact JSON with no whitespace/newline:

```json
{"capturedAt":"2026-11-11T12:00:00.000Z","clientId":"11111111-1111-4111-8111-111111111111","point":[31.5,0.5],"projectId":"example-project"}
```

Keep the device private key on that device and export only the public SPKI PEM at redemption. Validate the browser's signing/export implementation against a real backend acceptance before building the full offline queue. Preserve capture IDs, original timestamps and signed point data across sync retries; changing signed fields needs a new signature. The signature covers the four fields above, not the entire household payload. An accepted sync result may still contain flags requiring review.

Do not keep BVN/NIN, photos or consent recordings in an unprotected offline cache or telemetry. Agree encrypted storage, sync acknowledgement, removal and lost-device behaviour before enabling persistent field capture. The current backend does not supply a frontend offline-storage implementation.

## Payment operations

| Method and path | Access | Body/result |
| --- | --- | --- |
| `GET /api/projects/:id/runs` | Dev | Paginated run list |
| `POST /api/projects/:id/runs` | Dev | `{ period, declaredGross, declaredNet?, fundingAmount, rosterId? }` -> draft run |
| `GET /api/runs/:id` | Dev | Run detail/state/deadline |
| `GET /api/runs/:id/arithmetic` | Dev | `RunArithmetic` |
| `POST /api/runs/:id/preflight` | Dev | `{ exclusions?: [{ participantId, reason }] }` -> `{ passed, exclusions, arithmetic }` |
| `POST /api/runs/:id/execute` | Dev | `{}` -> `{ jobId }`; requires successful preflight or existing execution |
| `GET /api/runs/:id/transfers` | Dev | Paginated private transfers; masked account numbers |
| `GET /api/runs/:id/stream` | Dev | SSE stream, described in the integration guide |
| `POST /api/runs/:id/requery` | Dev | `{ transferId? }` -> read/reconcile results; never submits new transfers |
| `POST /api/runs/:id/retry` | Dev | `{ failureClass }` -> `{ jobId }`; definitive allowed failure classes only |
| `POST /api/runs/:id/cancel` | Dev | `{}` -> updated run; only `draft`, `funded`, `preflight_failed` |
| `GET /api/projects/:id/funding` | Dev | Linked bank account balance; error if no source account |
| `GET /api/projects/:id/reconciliation` | Dev | Computed reconciliation for the linked source account |
| `GET /api/tariff` | Dev | Active bank tariff/provider result; use run arithmetic for authoritative estimates |

The upstream bank may expose numeric/snake_case money fields. Normalised Attest run arithmetic/transfers use decimal strings/camelCase. Do not assume raw bank balance/tariff/carbon proxy responses have the exact same DTO as `Transfer`; use the returned fields and backend arithmetic rather than guessing an interchange format.

## Attestations, reports, verification and disputes

| Method and path | Access | Body/result |
| --- | --- | --- |
| `GET /api/projects/:id/attestations` | Dev | Paginated signed records with demonstration disclosure |
| `GET /api/attestations/:id` | Dev | Signed record for an owned project |
| `GET /api/attestations/:id/report` | Dev/Verifier | `BenefitSharingReport` JSON envelope |
| `GET /api/attestations/:id/report?format=pdf` | Dev/Verifier | Benefit-sharing PDF attachment; `Accept: application/pdf` also supported |
| `POST /api/attestations/:id/disclosure` | Dev | `{ transferId }` -> `Disclosure` bundle |
| `GET /api/public/attestations/:id/pdf` | Public | Signed-attestation PDF attachment |
| `POST /api/verify/attestation` | Public | `{ hash }` or multipart signed-attestation PDF -> verified signed record plus anchor status |
| `POST /api/verify/disclosure` | Public | `{ bundle }` -> `{ valid: true, attestationHash, anchor }` or proof error |
| `POST /api/disputes` | Public | `{ projectId, category, body? }` -> `{ id, status }`; generic project intake |
| `GET /api/projects/:id/disputes` | Dev | Paginated disputes |
| `GET /api/disputes/:id` | Dev | Scoped dispute detail |
| `POST /api/disputes/:id/respond` | Dev | `{ body }` -> record with `developer_responded`; cannot set resolution/status |

Categories: `not_received`, `someone_else_collected`, `wrong_amount`. Generic public intake does not attach an asserted participant/transfer or accept a voice note; use a scoped receipt token for those. There is no manual coverage, attestation-edit, dispute-resolution or period-close endpoint.

## Participant receipt pages

| Method and path | Access | Body/result |
| --- | --- | --- |
| `GET /receipt/:token` | Receipt token | Existing mobile HTML receipt page |
| `GET /api/receipt/:token` | Receipt token | `{ projectId, amount, settledAt, state, confirmed }` |
| `POST /api/receipt/:token/confirm` | Receipt token | `{}` -> `{ confirmed: true }`; settlement required |
| `POST /api/receipt/:token/dispute` | Receipt token | `{ category, body?, voiceNoteId? }` -> `{ id, status }` |
| `POST /api/receipt/:token/evidence` | Receipt token | Multipart supported audio -> `{ id, kind: 'voice_note', sha256 }` |

A valid receipt token authorises only that receipt; no login is required. Treat it as sensitive, keep it out of analytics/error logs/referrers, and explain expired/revoked tokens. After a voice upload, send its returned ID as `voiceNoteId` on the same token's dispute request. JSON confirm/dispute actions still require an idempotency key. A repeated confirmation with a different key may produce `ALREADY_CONFIRMED`; refresh and display confirmed. Do not display “received by household” based solely on bank settlement.

## Public register and verifier workbench

| Method and path | Access | Body/result |
| --- | --- | --- |
| `GET /api/public/register` | Public | Paginated public projects; `q` searches name, `country` filters; use supported list sorting |
| `GET /api/public/projects/:id` | Public | Public project with accepted commitment, signed attestations and demonstration/reference metadata |
| `GET /api/public/developers/:id` | Public | `{ projects: [...] }`; `:id` is the organisation ID |
| `GET /api/public/attestations/:id` | Public | Signed record plus demonstration disclosure |
| `GET /api/public/projects/:id/geography` | Public | `[{ cell, count }]`, H3 resolution 4, cells with fewer than five households suppressed |
| `GET /api/verifier/projects/:id` | Verifier | Same allowlisted project shape |
| `GET /api/verifier/compare?ids=id1,id2` | Verifier | Array of public projects; at most 10 IDs |
| `GET /api/verifier/watchlist` | Verifier | Paginated current user's watchlist |
| `POST /api/verifier/watchlist` | Verifier | `{ projectId }` -> added watch row |
| `GET /api/verifier/alerts` | Verifier | Paginated current user's rules/events; use `kind` to distinguish them |
| `POST /api/verifier/alerts` | Verifier | `{ projectId, condition, threshold? }` -> added alert rule |
| `POST /api/verifier/export` | Verifier | `{ projectId, period, format: 'json' \| 'csv' \| 'pdf' }`; result shapes below |

No delete/update routes currently exist for watchlists or alert rules. Alert conditions: `coverage_below`, `dispute_raised`, `period_closed_late`, `correction_issued`. `coverage_below` requires numeric threshold 0-100 and currently measures **amount moved / amount committed**, not paid-household coverage. Label this distinction in the UI.

Export results stay inside the success envelope:

- JSON: `{ format: 'json', attestations: [...], reports: [...] }`.
- CSV: `{ format: 'csv', contentType: 'text/csv', content: '...' }`; create a browser Blob download. Formula-leading values are escaped by the backend; preserve the supplied CSV and demonstration columns.
- PDF: `{ format: 'pdf', downloads: [{ attestationId, url }] }`; fetch/link those authorised report URLs, not the export request itself as PDF bytes.

Public project counts can reflect the current roster; period coverage must come from the selected attestation/report. Public geography is aggregate H3 data, not exact household points or the KML parcel boundary. Keep household/agent identities and private transfer failure text out of verifier and public components.

## Operations and platform review

The existing `/ops` HTML console can be used as a functional reference. A custom console uses:

| Method and path | Access | Body/result |
| --- | --- | --- |
| `GET /api/ops/signals` | Ops | Paginated; optional `class` filter |
| `GET /api/ops/signals/:id` | Ops | Signal detail |
| `GET /api/ops/signals/:id/graph` | Ops | `{ nodes, edges, sampled }`; graph is evidence/proposal, not a verdict |
| `POST /api/ops/signals/scan` | Ops | `{ projectId, flows }` -> `{ jobId }`; at most 5,000 flows |
| `POST /api/ops/projects/:id/onward-sync` | Ops | `{}` -> `{ jobId }`; requires configured bank flow support |
| `GET /api/ops/cases` | Ops | Paginated case list |
| `POST /api/ops/cases/:id/action` | Ops | `{ action, note }` -> case update; note required, <=4,000 characters |
| `GET /api/ops/exceptions` | Ops | Paginated flagged `{ id, projectId, flags }` |
| `GET /api/ops/reconciliation` | Ops | Paginated computed reconciliation across linked projects |
| `GET /api/ops/jobs` | Ops | Paginated job summaries; optional `state` filter |
| `GET /api/ops/capabilities` | Ops | `{ accountControl, onwardFlows }` configuration booleans |
| `POST /api/ops/webhooks/recover` | Ops | `{}` -> webhook recovery result |
| `GET /api/admin/extractions` | Platform | Paginated pending extraction proposals |
| `POST /api/admin/extractions/:id/review` | Platform | `{ commitment, reason }` -> appended developer-review proposal, still unaccepted |
| `POST /api/admin/registry/import` | Platform | `{ record }` -> `{ registryId, digest }`; approved registry export, schema in backend source |
| `GET /api/admin/registry/history` | Platform | Paginated import/sync/boundary history |
| `GET /api/admin/chain/:id` | Platform | `:id` is a project ID -> `{ projectId, valid, records, discontinuities }` |
| `POST /api/admin/webhooks/register` | Platform | `{}` -> `{ registered, id }`; backend manages provider callback secret |

Case actions: `request_documentation`, `escalate`, `clear`, `substantiated`, `freeze`, `unfreeze`. Freeze/unfreeze queues account-control jobs; an action response is not proof the bank applied it. Check capabilities and job outcomes. Clearing a case stores `unsubstantiated`. Substantiation can enqueue an appended attestation correction.

Flow input contains `participantId`, `to`, `receivedAt`, `sentAt`, optional decimal-string `amount`, optional numeric `dormantDays`. Platform extraction review uses a structured `commitment` with `percentage`, `basis`, `cadence`, `beneficiary_definition`, `source_quote`, one-based `page`, and optional `reportingCadence`, `paymentSchedule`, `sourceLocator`. The quote must occur on the selected page of that extraction job. Review supplies a reason and does not auto-accept on behalf of the developer.

## Optional carbon lifecycle screens

These endpoints wrap configured bank carbon services. They are distinct from beneficiary payment execution and return provider-specific result bodies. Use only if these screens are part of the agreed frontend scope.

| Method and path | Access | Required input/result |
| --- | --- | --- |
| `POST /api/projects/:id/register` | Dev | `{ type, location, owner }` -> provider registration; project name/methodology come from the saved project |
| `POST /api/projects/:id/mrv` | Dev | `{ period: { from, to }, metric, value, evidence_url, sensor_ids? }` -> provider submission |
| `GET /api/projects/:id/mrv` | Dev | Array of owned submission statuses |
| `POST /api/projects/:id/credits/retire` | Dev | `{ credit_batch_id, quantity, buyer, retirement_reason, payment_reference, currency: 'NGN' }` -> provider retirement |
| `GET /api/projects/:id/certificates` | Dev | Array of certificates for owned retirement IDs |

Registration `location` needs `state`, `lga`, numeric `lat`, `lng`; `owner` needs `name`, `contact_name`, `phone`, `payout_account`, `bank_code`. MRV dates are `YYYY-MM-DD`, `value` is a positive number, evidence URL must be HTTPS, sensor IDs are strings. Retirement quantity is a positive integer; `buyer` needs `name`, `email`. Retirement requires a verified credit batch belonging to the project and a valid paid-checkout payment reference. This backend does not expose a frontend carbon-checkout purchase endpoint; do not invent one or use a beneficiary payout reference as checkout proof.

## Server integrations that do not belong in the frontend

`POST /hooks/forge`, `/api/webhooks/sms-delivery`, `/api/webhooks/sms-inbound` and `/api/webhooks/ussd` are authenticated provider callbacks. The bank endpoint, webhook secrets, messaging callback credentials, anchoring credentials and Kubernetes access remain server-side. A frontend should observe resulting state through the endpoints above, not simulate authenticated provider callbacks.

Implementation references: [route handlers](../src/app.ts), [request parsing](../src/request-types.ts), [service rules](../src/service.ts), [shared contracts](../packages/contracts/src/index.ts), [evidence validation](../src/evidence.ts), [carbon validation](../src/carbon.ts). The current build has no generated OpenAPI/Swagger document; these source files and the specification alignment are the references when a field needs checking.
