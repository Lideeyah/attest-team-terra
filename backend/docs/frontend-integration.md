# Frontend integration guide

Updated 11 November 2026. This guide describes the implemented backend for the frontend developer. Start here, then use the [endpoint reference](frontend-api-reference.md) for the remaining screens. The [specification alignment](specification-alignment.md) explains how the build follows **Attest Backend Specification (1)** and records the outstanding source-edition question.

The backend is ready for local integration. A public application has **not** been deployed. `https://team05.xtradot.co` is the intended deployment address, not a confirmed working API base URL. The Kubernetes image, secrets, migrations, frontend routing and public deployment still need to be completed together.

## 1. Start a local backend

From the backend repository root:

```powershell
npm ci
npm run build
npm run local
```

Use `npm.cmd` in PowerShell if script execution policy blocks `npm`. The installed Node 23.11.0 was used for local checks; production uses Node 24. Do not run a second backend on port 8080.

`npm run local` starts a persistent embedded PostgreSQL/PostGIS database, the API on `http://localhost:8080`, a worker ticking every five seconds, and mock bank/registry/extraction/messaging/anchor providers. Docker, real bank access and real payment credentials are unnecessary for this mode. First startup seeds synthetic projects with 500, 30 and 400 households. Startup can take time while preparing these fixtures.

The terminal prints a generated local password. The following fixture accounts use that password:

| Role | Local email |
| --- | --- |
| Developer administrator | `local@example.test` |
| Developer operator | `developer_operator@example.test` |
| Verifier | `verifier@example.test` |
| Bank operations | `bank_ops@example.test` |
| Platform administrator | `platform_admin@example.test` |

Agent fixture records are not ready-made agent login accounts; use the invitation and identity verification flow in the reference. Local state persists in ignored `.local-state/`; its credential file must stay private. Normal production startup uses external PostgreSQL and a separate worker; see [backend completion](backend-completion.md).

Check `GET http://localhost:8080/healthz` for `{ "status": "ok" }`. Health checks are exceptions to the API envelope described below. Discover synthetic project IDs through `GET /api/public/register`, then open private resources using an appropriately scoped fixture account.

### Browser routing

Use one browser origin for the frontend, `/api/*`, and `/auth/*`. The backend does not currently install a CORS handler. Configure your frontend development server or reverse proxy to forward these paths to port 8080, including cookies, `Set-Cookie`, query strings, multipart bodies and streaming responses. Keep the frontend's own API routes from conflicting with these paths.

For a Next.js frontend, a minimal development rewrite can look like this:

```js
// next.config.mjs -- ATTEST_API_ORIGIN is a server-side setting.
const upstream = process.env.ATTEST_API_ORIGIN || 'http://localhost:8080';
export default {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${upstream}/api/:path*` },
      { source: '/auth/:path*', destination: `${upstream}/auth/:path*` },
    ];
  },
};
```

Verify cookie forwarding and that `/api/runs/:id/stream` is streamed immediately without proxy buffering. Do not proxy every path to the backend: the frontend should own its page URLs. `/ops` and `/receipt/:token` are existing backend HTML pages that may be retained or replaced deliberately.

For the quickest local cookie login, open `http://localhost:8080/auth/signin` in a separate tab, sign in, return to the frontend and fetch `/api/auth/session` through the proxy. Use `localhost` consistently for both tabs; do not mix it with `127.0.0.1`. Cookies belong to a hostname, not a port. The local helper fixes backend `PUBLIC_URL` to `http://localhost:8080`, so login may redirect to the backend root.

For an integrated login page and production callbacks, coordinate `PUBLIC_URL` with the backend owner: it must match the externally visible application origin. Changing only the shell variable does not override the current local helper's hardcoded value. Production needs HTTPS for the secure session cookie. Test redirects, sign-out and SSE through the actual deployment proxy before release.

The browser calls **Attest**, and Attest calls the bank. The internal bank service URL, gateway key, identity pepper, database URL, signing keys and provider credentials are backend-only. No bank SDK or gateway credential belongs in a frontend bundle or a `NEXT_PUBLIC_*` variable.

## 2. Shared types and HTTP rules

The browser-safe package is [`@attest/contracts`](../packages/contracts/src/index.ts). It exports `AttestClient`, `ApiError`, `Envelope`, `Commitment`, `BoundaryPreview`, `EnrolmentInput`, `RunArithmetic`, `Run`, `Transfer`, `SignedAttestation`, `BenefitSharingReport`, `Disclosure` and role/state unions. Build it in the backend with `npm run build:contracts`. A sibling frontend repository can install the local package with:

```powershell
npm install ../attest-backend/packages/contracts
```

Adjust the folder name to the actual checkout. The package is private and is not published to npm; agree a workspace/local-package distribution arrangement for CI. Import the package, not backend service modules. Types describe useful wire fields; some endpoints return extra metadata, and the package does not yet provide a typed method for every endpoint.

### JSON envelope

Normal `/api/*` JSON success responses are:

```json
{
  "status": "success",
  "message": "OK",
  "data": {},
  "meta": null,
  "request_id": "request-id"
}
```

`data` can be an object, array or `null`. Paginated lists put the array directly in `data` and pagination in `meta`:

```json
{ "page": 1, "per_page": 20, "total": 500, "total_pages": 25 }
```

Errors use the HTTP error status and this body:

```json
{
  "status": "error",
  "error": {
    "code": "REPORTING_CADENCE_REQUIRED",
    "message": "REPORTING_CADENCE_REQUIRED",
    "field": null,
    "remediation": null
  },
  "request_id": "request-id"
}
```

Use `error.code` for UI handling, provide friendly copy, and retain `request_id` for support. Messages are often codes, not finished UI copy. The exported `AttestErrorCode` union is a subset of possible errors, so include an unknown-error fallback. `/auth/*` uses Auth.js's own formats; PDFs, evidence downloads and SSE are not JSON envelopes.

### Requests, pagination and amounts

- Set `Accept: application/json`; use `Content-Type: application/json` for JSON bodies and `credentials: 'include'` for cookie sessions.
- Every JSON `POST`/`PATCH` mutation requires an **`Idempotency-Key` of 8-200 characters**, including public signup, sign-in, verification, receipt actions and dispute intake. Provider callbacks are separate server integrations. Auth.js forms use their own CSRF flow.
- Generate one UUID when a user starts an action. Reuse that key and the exact request for transport retries. A new action or edited body needs a new key. Reusing a key for another URL/body returns `409 DUPLICATE_REQUEST`. Successful replay sets `Idempotent-Replayed: true`.
- Multipart routes bypass the JSON idempotency mechanism. Do not assume a repeated upload is deduplicated.
- Lists generally accept `page=1&per_page=20` (maximum 100). Store-backed lists accept `sort` and `order=asc|desc`; default order is ascending `createdAt`. Supported sort names are `createdAt`, `name`, `status`, `state`, `period`, `class`, `severity`, `capturedAt`; choose a meaningful field for the resource. Some in-memory lists only paginate. Send query parameters once, not repeated arrays.
- Attest money is an **NGN decimal string**, such as `"10000.00"`, including fee, VAT, stamp duty and total debit. Input amounts are non-negative with exactly two decimal places and up to 12 integer digits. Account numbers and identifiers are strings. Use backend arithmetic for payment decisions; avoid floating-point financial calculations in the UI.
- Dates/timestamps are UTC ISO strings unless a field explicitly expects a date. Points and GeoJSON coordinates are **`[longitude, latitude]`**. Convert map-library latitude/longitude ordering explicitly.
- The API currently limits requests to 120 per minute per observed IP. Debounce filters, deduplicate requests and back off after `429 RATE_LIMITED`. Coordinate proxy IP forwarding with the backend owner; multiple users behind a proxy may share the observed IP.

### Copyable client usage

```ts
import { AttestClient, ApiError } from '@attest/contracts';
import type { RunInput, Run, RunArithmetic } from '@attest/contracts';

const api = new AttestClient(''); // Relative URLs through your same-origin proxy.
const requestKey = crypto.randomUUID(); // Keep this with the pending UI action.
const input: RunInput = {
  period: '2026', // Annual reporting; choose the actual open period.
  declaredGross: '1000000.00',
  fundingAmount: '610000.00', // Illustrative: preflight checks actual fees/balance.
};
try {
  const { data: run } = await api.request<Run>(`/api/projects/${projectId}/runs`, {
    method: 'POST', body: input, idempotencyKey: requestKey,
  });
  const { data: arithmetic } = await api.request<RunArithmetic>(
    `/api/runs/${run.id}/arithmetic`,
  );
  // Render arithmetic; do not infer that creating the run paid anybody.
} catch (error) {
  if (error instanceof ApiError) {
    // Map error.code; retain error.status and error.requestId for diagnostics.
  } else {
    // Connection outcome may be unknown. Retain requestKey and reconcile state.
  }
}
```

`projectId` comes from the selected/created project. The helper returns the whole success envelope and throws `ApiError` for API errors. It generates a fresh key if you omit one, so **pass a retained key for retriable actions**. It does not automatically retry. For field-level `error.field` or `error.remediation`, use a wrapper that retains the raw error envelope; the current helper only carries code, status and request ID.

## 3. Authentication and navigation

Prefer the backend Auth.js cookie session for browser integration. The cookie is `attest.session-token`, HttpOnly, SameSite=Lax, secure in production, with an eight-hour session lifetime. Do not read it from JavaScript or copy it into local storage. Fetch `GET /api/auth/session` on app startup; its enveloped `data` is the principal `{ id, role, organisationId, projectId? }`.

Use `/auth/signin` and `/auth/signout` for the hosted Auth.js flows. A custom credentials form first gets `/auth/csrf` (not an Attest envelope), then submits an `application/x-www-form-urlencoded` form to `/auth/callback/credentials` containing `email`, `password`, `csrfToken`, and a `callbackUrl` on the configured public origin. Preserve the CSRF cookie. The successful form response redirects and sets the session cookie. Sign-out also follows Auth.js's CSRF-protected flow. There is no implemented `/api/auth/logout` endpoint.

For tools or an explicitly chosen bearer integration, `POST /api/auth/signin` with `{ "email": "...", "password": "..." }` returns enveloped `{ token, expiresIn: 28800 }`. Send `Authorization: Bearer <token>` afterward; this endpoint **does not set an Auth.js cookie**. `new AttestClient('', token)` supports it. Avoid persistent browser bearer storage; native `EventSource` also cannot attach an Authorization header. Cookie and bearer integration are different choices.

Public signup accepts `{ email, password, organisation }`, creates an unverified `developer_admin`, and returns `{ id, verificationRequired: true }`. Passwords must be 12-256 characters. Complete email verification before sign-in. Public signup cannot create privileged roles. SMTP delivery requires backend configuration and a running worker; local mocks do not give you a real mailbox. An operator can provide a verification token through the documented credential workflow.

| Role | Frontend navigation |
| --- | --- |
| `developer_admin` | Project creation, commitment review, roster, agents, runs, disputes and reports |
| `developer_operator` | Existing project work, commitment review, enrolment and payment operations; no project creation or agent administration |
| `agent` | Own field profile, signed enrolment capture/sync and own enrolment details |
| `verifier` | Public project data, comparison, watchlist, alerts and permitted reports/exports |
| `bank_ops` | Signals, cases, exceptions, reconciliation, jobs and account-control operations |
| `platform_admin` | Operations plus extraction review, registry administration and project account linking |

The server enforces scope on each request; hiding navigation is not authorization. Session expiry, password reset, suspension and agent status changes can revoke access. On 401, clear private query caches and return to sign-in. On 403, show insufficient access and keep the user out of that resource. Never substitute another organisation's public response for a failed private request.

## 4. Project onboarding and commitment review

### Registry and boundary

1. `POST /api/projects/lookup` with `{ "registryId": "trees-for-global-benefits-uganda" }`. Show the returned registry record and provenance. Other registry IDs depend on configured registry data/providers.
2. Inspect `boundaryStatus`. `upload_required` means a real KML is needed. For onboarding, read a selected `.kml` as text and `POST /api/registry/boundary` with `{ kml, name: file.name }` and a retained idempotency key.
3. The preview returns `{ name, points, areaHectares, geometry, boundaryId, sha256 }`. Render **`geometry`**, which preserves all polygons and holes. `points` is only the primary exterior ring. Show the server's `areaHectares`.
4. As `developer_admin`, `POST /api/projects` with `{ registryId, boundaryId }`. Persist the returned project ID in app navigation. Geometry is loaded server-side from the organisation-scoped preview; edited client points are not an alternative to `boundaryId`.
5. For an existing project, `GET /api/projects/:id/boundary` returns `{ boundary, boundaryStatus }`. `POST` to the same path accepts one multipart `.kml` file. Missing geometry returns `409 BOUNDARY_NOT_AVAILABLE`.

KML is limited to 2 MiB; the JSON request body also has a 2 MiB limit, so allow room for JSON escaping/metadata on the preview route. Invalid/unsafe KML is rejected. The synthetic fixtures' test polygons are not authentic project boundaries.

**There is no private `GET /api/projects` collection endpoint.** The public register can help discover the local fixture IDs, but it is not an organisation's private project dashboard. A production private project selector needs a backend endpoint agreed with the backend owner. Preserve newly created project IDs rather than relying on a nonexistent list call.

### PDD upload and human review

Upload one PDF to `POST /api/projects/:id/pdd` as multipart. Maximum 10 MiB and 300 readable pages. The response is `{ jobId }`; extraction runs asynchronously. Poll `GET /api/projects/:id/extraction` with backoff, typically every 3-5 seconds while the screen is active. It returns the latest commitment row or `null`, not a generic job-status object. Record the previous row ID before upload so an old accepted result is not mistaken for the new extraction. There is no developer-facing job-detail endpoint yet; if no new row appears, show a pending state and escalate a prolonged failure to operations.

```ts
const form = new FormData();
form.append('file', selectedPdf);
const response = await fetch(`/api/projects/${projectId}/pdd`, {
  method: 'POST', credentials: 'include', body: form,
});
const envelope = await response.json();
if (!response.ok || envelope.status !== 'success') {
  // Handle the error envelope and retain its request_id.
}
// Do not manually set Content-Type: the browser must add the multipart boundary.
```

Display percentage, basis, cadence, reporting cadence, beneficiary definition, exact `source_quote`, page, confidence and any review status/error. Model output is a proposal. Ask a person to review the source before accepting it. Low-confidence/pending proposals belong in the platform review queue; the platform's reviewed proposal still comes back with `accepted: false` for developer review.

Edit one field at a time with `PATCH /api/projects/:id/commitment`:

```json
{ "field": "reportingCadence", "value": "annual", "reason": "Reviewed reporting period against the source document." }
```

Allowed fields: `percentage`, `basis`, `cadence`, `reportingCadence`, `paymentSchedule`, `sourceLocator`, `beneficiary_definition`, `accepted`. Every edit needs a reason and appends a new version; use the returned row. `source_quote` and `page` are not directly editable through this endpoint. To accept the reviewed commitment, send `{ "field": "accepted", "value": true, "reason": "..." }` with a new key. Save edits sequentially because each request derives from the current latest version. Existing accepted edits can stay accepted; do not assume an edit automatically resets acceptance.

### Staged payments are separate from reporting periods

`cadence` is `monthly`, `quarterly`, `annual` or `staged`. A staged commitment must also have `reportingCadence: 'monthly' | 'quarterly' | 'annual'` or the API returns `422 REPORTING_CADENCE_REQUIRED`. When switching an existing calendar commitment, set `reportingCadence` first, then set `cadence: 'staged'`.

Optional schedule metadata has this shape:

```json
{
  "type": "verification_milestones",
  "description": "Payments follow verification milestones described in the source.",
  "sourceLocator": "J2.1 / Table 12"
}
```

The current TGB fixture uses staged payments and annual reporting. Do not display this as a promise of equal annual payments or invent stage percentages or automatic milestone eligibility. Period creation and closure follow the reporting cadence; schedule metadata explains the source's payment timing.

The consolidated specification cites `A.13.1 / Table 5`, while the pinned published PDD is verified at `J2.1`, page 47. Reports expose `sourceAlignment: 'edition_pending'` and `specifiedSourceLocator` when available. Show the verified citation and pending-source note; do not relabel the PDF as the requested edition. See [specification alignment](specification-alignment.md).

## 5. Household enrolment and roster

Use `GET /api/projects/:id/participants?page=1&per_page=20` for the private roster. Supported filters: `q` (name search), `status`, `agent`, `tier`, `flagged=true`. List phone numbers are masked; fetch `GET /api/participants/:id` only for an authorised detail view. `GET /api/participants/:id/payments` is paginated payment history.

Developer enrolment is `POST /api/projects/:id/participants` with `{ items: [...] }`, one to 500 items. Each item's shape is `EnrolmentInput`:

```ts
import type { EnrolmentInput } from '@attest/contracts';

const item: EnrolmentInput = {
  clientId: crypto.randomUUID(), // Persist once per captured household.
  projectId,
  consent: true,
  name: form.name,
  firstName: form.firstName,
  lastName: form.lastName,
  dateOfBirth: form.dateOfBirth, // YYYY-MM-DD
  phone: form.phone, // E.164, e.g. +234...
  identityType: 'bvn', // Or 'nin'.
  identity: form.identity, // 11 digits. Sensitive: do not log or put in URLs.
  capturedAt: new Date().toISOString(),
  point: [longitude, latitude],
  language: 'en',
};
```

Optional fields are `accountNumber`, `bankCode`, `signature`, `boundaryReason`, `photographId`, `consentEvidenceId`. Existing payout accounts should include their correct bank code. Default bank code is Xtradot's NIP `000014`; CBN `044` is not the routing code to put in `bankCode`. NIN enrolment requires an existing payout account (`WALLET_ACCOUNT_REQUIRED` otherwise). BVN enrolment can provision a wallet and dedicated account through Attest.

Consent is required. Missing GPS adds a flag; an outside-boundary point needs `boundaryReason` and remains flagged. Successful enrolment can still have identity/name/boundary flags: show them and let preflight decide payment eligibility. Name matching can be refreshed with `POST /api/participants/:id/name-check` and `{}`. The response contains `{ accountName, match, kycLevel, flags }`.

The batch response can be HTTP 200 with both successes and failures:

```json
[
  { "clientId": "saved-uuid-1", "status": "success", "data": { "id": "saved-uuid-1", "flags": [] } },
  { "clientId": "saved-uuid-2", "status": "error", "code": "WALLET_ACCOUNT_REQUIRED" }
]
```

This array is inside the envelope's `data`. Track each result separately. Preserve `clientId` and `capturedAt` when retrying an item. A corrected/subset batch is a new request body and needs a new request idempotency key. Cross-household identity duplicates are rejected. Raw BVN/NIN is discarded by the backend after verification; avoid frontend analytics, error telemetry or unprotected offline queues that would retain it.

Corrections use `PATCH /api/participants/:id` with `{ phone?, status?, reason }`; status is `active`, `removed` or `suspended`. Identity and name are not editable by this endpoint. Participant deletion is rejected. Removed/unpaid/excluded households remain part of historical denominator snapshots.

Enrolment notices are queued. Read `GET /api/projects/:id/notifications/summary` for `{ enrolled, noticePending, noReachableNumber }`. Do not label a household payment-ready just because enrolment returned success; preflight also checks notices, flags, account uniqueness and limits.

The type permits `en`, `yo`, `ha`, `ig`. Confirm which translations are approved before exposing choices; the deployed approval configuration defaults to English, and there is no frontend language-capabilities endpoint yet.

## 6. Runs, preflight and payments

For developer roles, the screen flow is:

| UI action | Request | What to render next |
| --- | --- | --- |
| Load periods/runs | `GET /api/projects/:id/runs` | Paginated runs, deadline and state |
| Create run | `POST /api/projects/:id/runs` | Returned run; payment has not started |
| Review calculation | `GET /api/runs/:id/arithmetic` | Required benefit share, planned amount, charges and shortfall |
| Check readiness | `POST /api/runs/:id/preflight` | `passed`, exclusions and arithmetic |
| Execute confirmed run | `POST /api/runs/:id/execute` with `{}` | Queued job ID; watch run/transfers |
| Check uncertain bank status | `POST /api/runs/:id/requery` with `{}` or `{ transferId }` | Current transfer results; no new payment submission |
| Retry definitive failures | `POST /api/runs/:id/retry` with `{ failureClass }` | Queued retry job; watch results |
| Cancel before execution | `POST /api/runs/:id/cancel` with `{}` | Updated cancelled run |

Create body: `{ period, declaredGross, fundingAmount, declaredNet? }`. `declaredNet` is required when the accepted commitment uses a net basis and cannot exceed gross. `rosterId` is optional for an existing authorised period snapshot; ordinarily let the backend create it. The project needs a linked source account for production payments. A platform administrator links it; the frontend must not let an operator substitute an arbitrary funding account.

Use period format matching the reporting cadence: annual `2026`, quarterly `2026-Q4`, monthly `2026-11`. The backend computes `closesAt` as the first UTC instant after the period. For staged payments, use `reportingCadence`. Do not send an editable close deadline in the normal UI. `sourceAccount`/custom `closesAt` are local compatibility options, not production onboarding controls. A period with an existing run or attestation cannot be recreated.

Display `RunArithmetic` fields directly: `commitmentPct`, `basis`, `declaredGross`, `declaredNet`, `required`, `estimatedCharges`, `totalNeeded`, `funded`, `shortfall`, `perHousehold`, `chargesCovered`. Funding must cover actual planned payments and charges. A lower benefit payout can remain visible as underfunding; do not overwrite the required amount to hide its shortfall. Tariff and account funding/reconciliation endpoints are in the reference.

Preflight initially accepts `{ "exclusions": [] }`. A response with `passed: false` is a valid HTTP 200 result. Show returned exclusions `{ participantId, reasons: string[] }`; collect an explicit explanation for each excluded household and rerun preflight with:

```json
{ "exclusions": [{ "participantId": "household-id", "reason": "Documented reason for excluding this flagged household from this run." }] }
```

Acknowledging an exclusion **excludes** that household from payment; it does not override a failed check or remove the household from coverage. Execute only after `passed: true` and the user's confirmation of the displayed amounts/exclusions. Server state is authoritative; disable duplicate clicks while a request is pending.

Run states: `draft`, `funded`, `preflight_failed`, `executing`, `partially_complete`, `complete`, `cancelled`. Transfer states: `queued`, `in_flight`, `settling`, `settled`, `failed`, `reversed`. Read `GET /api/runs/:id` and paginated `GET /api/runs/:id/transfers`. Transfer rows include `amount`, `fee`, `vat`, `stampDuty`, `totalDebit`, `state`, and optional settlement/failure fields. Account numbers are masked in the transfer list.

`complete` does not by itself mean all households were paid. Display settled, failed, reversed and pending results separately. Settlement is also distinct from participant confirmation. A `failureMessage` is private bank diagnostic text; do not copy it into public pages, shared report labels or analytics. Provide a friendly failure category and use the message only in authorised detail views.

Only these failure classes are accepted by `/retry`: `INSUFFICIENT_FUNDS`, `BANK_UNAVAILABLE`, `ACCOUNT_RESTRICTED`, `LIMIT_EXCEEDED`. The backend also checks whether a failure is definitive. A timeout or lost response is an uncertain outcome: refresh/requery rather than starting a replacement run or making another payment request with a fresh key. `/requery` reads status; the worker resumes unsubmitted pending batches.

One execute action handles the entire eligible roster. The backend splits bank bulk requests into at most 200 items; 500 eligible households use 200/200/100. The UI must not submit its own bank batches. Live processing can take several minutes under shared bank limits and settlement hydration. A `{ jobId }` response is an acknowledgement, not settlement; keep the pending/progress UI visible and let operations inspect prolonged jobs.

### Live updates with SSE

Use `/api/runs/:id/stream` with an owning developer cookie session. The stream emits standard SSE **message** frames; the JSON `data.type` carries the event name. There is no SSE `event:` field, so use `onmessage`, not `addEventListener('transfer.settled', ...)`.

```ts
import type { StreamEvent } from '@attest/contracts';

const stream = new EventSource(`/api/runs/${runId}/stream`);
stream.onmessage = (message) => {
  const event = JSON.parse(message.data) as StreamEvent;
  if (event.type.startsWith('transfer.')) {
    // event.transferId identifies the row; state is encoded in event.type.
    // Coalesce invalidations and refetch run + visible transfer page at most
    // once every 2-5 seconds. Do not issue one fetch for every event.
  }
  if (event.type === 'run.complete') {
    // Refresh totals; keep checking for later reversals while the page is open.
  }
};
stream.onerror = () => {
  // EventSource reconnects. Distinguish expiry with a debounced session check;
  // show reconnecting status and close the stream if the session is invalid.
};
// In effect cleanup/navigation: stream.close();
```

The server sends a current-state snapshot on a fresh connection, polls durable events every two seconds, sends heartbeats every 15 seconds and rechecks session validity every 60 seconds. Frames have IDs and support `Last-Event-ID` replay. Treat snapshot/replayed events as idempotent; an unknown cursor may produce another snapshot. The event body is `{ type, transferId? }`, not a full transfer row. Reconcile from GET endpoints after reconnect.

Native `EventSource` cannot send bearer headers. If you choose bearer auth, use a fetch-based SSE parser that handles frame boundaries, comments, IDs and reconnects, or use bounded GET polling. Never put the bearer token in a query parameter. Ordinary sign-in expiry can take effect on an existing stream at its next session recheck.

## 7. Attestations, coverage, reports and disputes

The worker automatically closes due periods. There is no frontend close/publish endpoint and no manual coverage override. Read `GET /api/projects/:id/attestations`; signed records contain `{ id, createdAt, document, hash, signature, publicKey, ...demonstrationDisclosure }`.

Coverage for a closed period is `document.paidCount / document.enrolledCount * 100`, with an explicit empty-denominator display. Use the signed period's denominator, not the current roster count or reference project population. Show benefit commitment, amount moved to households, charges, shortfall, confirmations, open/substantiated disputes and signal counts distinctly. Do not turn a bank settlement into a household confirmation or an alert into a substantiated finding.

Corrections append signed records with `document.supersedes` and a reason. Preserve history and show which record replaces which for a period. Do not sum an original and its correction as two separate disbursements. Hash/signature validity and anchor status are separate indicators; `pending` or `mock` anchoring is not a verified production ledger submission.

Canonical benefit-sharing downloads:

| Format | Endpoint |
| --- | --- |
| Enveloped JSON report | `GET /api/attestations/:id/report` or `?format=json` |
| PDF attachment | `GET /api/attestations/:id/report?format=pdf` |
| Public signed-attestation PDF | `GET /api/public/attestations/:id/pdf` |

The first two require an owning developer session or verifier role. They return the richer benefit-sharing report with source citation, coverage, attestation and anchor. The public PDF is a different signed-attestation artifact. Existing `/benefit-sharing` aliases are supported, but use `/report` for new integration. An HTML download link works with cookies. With bearer auth, fetch with the header and download a Blob. Check the HTTP status/content type before treating a response as PDF; a failure may be a JSON error envelope. Revoke temporary object URLs after download.

`POST /api/attestations/:id/disclosure` with `{ transferId }` produces a private household disclosure bundle for a settled transfer included in that attestation. Public `POST /api/verify/disclosure` with `{ bundle }` checks it. Public `POST /api/verify/attestation` accepts `{ hash }`, or a multipart signed-attestation PDF downloaded from this backend. PDF verification checks the exact cached file bytes and signature; it is not a general verifier for arbitrary or rewritten PDFs. The benefit-sharing PDF is not the signed-attestation upload artifact.

Developer dispute screens use `GET /api/projects/:id/disputes`, `GET /api/disputes/:id`, and `POST /api/disputes/:id/respond` with `{ body }` (up to 4,000 characters). A response records `developer_responded`; there is no developer “mark resolved” control. Confirmation/bank evidence determines resolution. Model triage is a proposal. Do not silently dismiss a voice-note dispute because it needs listening.

## 8. Public and verifier screens: disclosure is part of the contract

Public endpoints return allowlisted project/attestation data, not household identity details. Use them directly for public screens; never build a public page by redacting a private roster in the browser. See the reference for register filtering, geography, comparison, watchlists and exports. Public JSON reads may be cached for 15 seconds.

Always handle these fields on project and attestation response wrappers:

```ts
interface DemonstrationDisclosure {
  isDemonstration: boolean;
  paymentData: 'synthetic' | 'unverified';
  demonstrationNotice: string | null;
}
```

When `isDemonstration` is true, visibly show the synthetic label on **each register row, project page, payment/coverage charts, report preview and exports**. Use the supplied notice. Mock and sandbox payment evidence is synthetic; it does not describe the named real project's actual payments. `paymentData: 'unverified'` is also not a verified-live badge. Preserve disclosure when generating a frontend download or screenshot.

`referenceStatistics` contains separately sourced real-project facts with `sourceUrl`, `sourcePage`, `asOf`, `retrievedAt` and a notice. The current TGB reference records 51,874 participants, 7,518,071 certificates issued and project start year 2003. Render only supplied fields and show their source/date. Do not use those participants as the synthetic run's denominator, label certificates as verified tonnes, or label start year as a certification date. A district count is not presently verified in the fixture. The current payment demonstration uses 500 synthetic households.

For pitch/context copy, use the user's corrected context: Plan Vivo **at least 60%**; Acorn **up to 80%**; Kenya land-based **at least 40%** under the Climate Change (Carbon Markets) Regulations 2024. Farm Africa reports 7,375 of 21,658 enrolled farmers **had sold any carbon by the close of 2023**, not “had been paid.” These are context facts, not global API defaults or a replacement for a project's accepted source commitment. The original Word documents have not been rewritten; see the alignment note.

## 9. Error behaviour and handoff checklist

| Code/status | Frontend response |
| --- | --- |
| `401 UNAUTHORIZED` | Clear private state; sign in again |
| `403 FORBIDDEN` | Show access denied; do not keep retrying |
| `409 DUPLICATE_REQUEST` | Check whether this is an edited request reusing a key or an existing period/item; reconcile before repeating |
| `410 TOKEN_EXPIRED` | Explain that the verification/invite/receipt token is unavailable; request the appropriate replacement |
| `429 RATE_LIMITED` | Back off and reduce polling; preserve pending mutation keys |
| `BOUNDARY_NOT_AVAILABLE`, `INVALID_BOUNDARY`, `BOUNDARY_OUTSIDE` | Obtain/fix KML, or collect a documented outside-boundary reason where supported |
| `CONSENT_MISSING`, `IDENTITY_DUPLICATE`, `WALLET_ACCOUNT_REQUIRED` | Fix the individual enrolment; preserve the capture's client ID |
| `DEVICE_UNBOUND` | Check agent activation, registered device public key and capture signature |
| `PDD_UNREADABLE`, `PDD_NO_COMMITMENT`, `EXTRACTION_LOW_CONFIDENCE` | Ask for readable source/review; never invent an accepted commitment |
| `REPORTING_CADENCE_REQUIRED` | Set the staged commitment's reporting cadence before creating a run |
| `FUNDING_NOT_RECEIVED`, `FUNDING_INSUFFICIENT`, `FUNDING_EXCLUDES_CHARGES` | Show backend arithmetic and account-link/funding action; rerun preflight afterward |
| `PREFLIGHT_EXCLUSIONS_REQUIRED` | Return to exclusions/readiness review |
| `PERIOD_CLOSED` | Open the existing period/history; no replacement payment run |
| `ALREADY_CONFIRMED`, `DISPUTE_ALREADY_OPEN` | Refresh receipt state and show the existing result |
| `PROOF_INVALID`, `LEAF_NOT_IN_ROOT` | Show verification failure; preserve the original artifact/bundle for investigation |
| `BANK_CAPABILITY_UNCONFIGURED`, `TARIFF_REVIEW_REQUIRED`, provider/5xx errors | Show unavailable/review-needed state with request ID; use operations support, not fabricated success |

Before handing back the frontend:

- Verify login, refresh, sign-out, expiry and a denied role through the real proxy.
- Preview a KML including holes/multiple polygons; use `[longitude, latitude]` and server area.
- Upload/review a PDD without mistaking the previous extraction for its replacement; test staged reporting validation.
- Handle per-item enrolment failures and flags without losing successful items or changing saved capture IDs.
- Run preflight, acknowledge exclusions explicitly, execute once, reconnect SSE and display mixed transfer outcomes.
- Check that a repeated action with the same key/body does not repeat work, and an edited action gets a new key.
- Download both PDF types, verify the signed-attestation artifact, and display corrections/anchor status separately.
- Test public pages without authentication; expose no household PII, exact household coordinates or private diagnostics.
- Keep reference statistics separate from synthetic payment figures and retain demo notices in rows/charts/downloads.
- Agree the remaining backend integration gaps: private project collection, frontend-friendly extraction job status, approved-language discovery, production account linking and deployed public origin.

This guide was checked against the current route handlers, shared contracts, local runner and service logic. It does not claim an end-to-end test of a separately built frontend or a deployed public application. Backend validation and release limitations are recorded in [specification alignment](specification-alignment.md) and [assignment status](raheem-status.md).
