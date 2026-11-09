# Attest — backend specification and build prompts

The complete backend, the Forge sandbox it runs on, and the API contract that is the seam between it and the front end.

9 November 2026 · Lydia Solomon · backend lane · team05

**Read with** `2026-11-09-attest-product-spec.md` for domain rules and `2026-11-09-attest-foundation.md` for the design system. The front end builds against section 4 of this document, so section 4 is a contract and not a suggestion. Change it only by changing it here first.

**Authority.** Where this document and the Forge Sandbox Participant Platform Guide v1.0 disagree about the platform, the guide wins and this document is wrong and must be corrected. The guide names the Sandbox API Mock Specification v2 as the authoritative bank contract; get it if it has not arrived, because section 3 here is the operational summary and not the specification.

---

## 1. THE PLATFORM

Everything runs in a Kubernetes namespace on the Forge sandbox cluster. This is not a Vercel deployment and the constraints are real.

### 1.1 Hard platform facts

| Fact | Value | Consequence |
|---|---|---|
| Public URL | `https://team05.xtradot.co` | This is the demo URL. Judges open this. |
| Published Service | Exactly one, named `app`, port 80 | The Next.js app is the `app` Service. Everything else stays internal. |
| Protocol to the pod | Plain HTTP, TLS terminates upstream | Do not configure TLS in the app. |
| Architecture | `linux/amd64` | Build with `--platform linux/amd64`. An Apple Silicon image fails with `exec format error`. |
| Bind address | `0.0.0.0` on a fixed port | Not `127.0.0.1`. |
| Health endpoint | Required, cheap, e.g. `GET /healthz` returning 200 | Readiness probe hits it every 5s. |
| LoadBalancer / NodePort | Blocked by quota | Internal Services by name only. |
| Pods | 10 maximum | app, worker, postgres, redis is four. Budget the rest. |
| CPU | 400m requests / 2 cores limits, namespace total | |
| Memory | 768Mi requests / 2Gi limits, namespace total | Postgres and Redis in-cluster are tight. Size them deliberately. |
| Services | 5 | |
| Persistent volumes | 1, up to 10Gi | **One PV only.** Postgres and Redis cannot each have one. Redis runs without persistence; the PV goes to Postgres. |
| Namespace isolation | Network policy blocks traffic between team namespaces | |
| Public by default | Anything at `team05.xtradot.co` is reachable by anyone with the link | The register is meant to be public. Every console is gated. |

### 1.2 The constraint that shapes the architecture

**The platform APIs do not answer requests from a workstation. Calls time out by design.**

Local development therefore cannot reach the bank or the model gateway at all. The mock-first design in this document is not a convenience, it is the only way to build locally. Testing against the real sandbox is done from a throwaway pod inside the namespace, per guide section 8.1.

**The rate limit is 60 requests a minute per team, shared between the bank sandbox and Huawei MaaS.** This is the single most consequential number in the platform and it dictates two design decisions:

1. **A disbursement run must use `POST /transfers/bulk`.** Five hundred individual transfers would be 500 requests, over eight minutes at the limit, with 429s throughout. Infeasible on stage.
2. **Name enquiry happens at enrolment, not at run time.** Five hundred name enquiries plus five hundred transfers is a thousand requests. Enquiry at enrolment spreads the cost across days and is better product design anyway, for the reason in section 2.2.

Model calls are budgeted the same way: never on page load, never in a loop, never from an unauthenticated public endpoint, and cached when reused.

### 1.3 State is volatile

Bank sandbox data lives in memory. A platform restart returns every team to its opening state, and `POST /admin/reset` does the same on demand. The guide's instruction is to keep your own records in your app.

That is Attest's thesis stated by the platform. Attest is the system of record and the bank is the settlement rail. Build so that a sandbox reset loses no Attest data, and keep a re-seed script that rebuilds bank-side state in one command, because you will need it the morning of the demo.

### 1.4 Deployment

Image built for `linux/amd64`, pushed to GHCR or Docker Hub, pulled with a `regcred` pull secret if private. Deployment and Service per the guide's reference manifest in 4.2, with `envFrom` the `huawei-gateway` secret so `GATEWAY_KEY` arrives in the container. Tag every release `v1`, `v2` or a Git SHA, never `latest`, because `latest` makes rollbacks unpredictable and may not pull at all.

`kubectl set image` to release, `kubectl rollout status` to watch, `kubectl rollout undo` to roll back.

---

## 2. INTEGRATION REGISTER

Every external dependency, where it lives, what it needs, and what its mock does. Nothing touches an outside service except through the interfaces in section 5.

| Integration | What it does | Base URL | Credential | Reachable from |
|---|---|---|---|---|
| **Xtradot Bank sandbox** | Name enquiry, transfers, bulk transfers, wallets, virtual accounts, BVN and NIN verification, settlements, reconciliation, the carbon registry, webhooks | `http://bank-api.ingress-apisix.svc.cluster.local/v1` | `x-api-key: $GATEWAY_KEY` | Team namespaces only |
| **Huawei MaaS** | PDD commitment extraction. OpenAI-compatible | `http://huawei-maas.ingress-apisix.svc.cluster.local/openai/v1` | `apikey: $GATEWAY_KEY` | Team namespaces only |
| **Gold Standard registry** | Real project reference data for the seed | Public internet | None | Anywhere |
| **Hedera Consensus Service** | Anchors one message per period close | Public internet | Testnet account ID plus operator key, free self-service at portal.hedera.com | Anywhere with egress |
| **Africa's Talking** | SMS out, inbound replies, delivery reports, USSD sessions | Public internet | Sandbox username and API key, free self-service | Anywhere with egress |
| **Platform signing key** | Signs attestations | n/a | ed25519, generated once, stored as a namespace secret | n/a |

**There is nothing to chase for the bank or the model gateway.** The team key is already provisioned as the secret `huawei-gateway`, field `GATEWAY_KEY`, in the namespace, and the reference manifest injects it. It is the same key for both APIs; only the header differs, `x-api-key` for the bank and `apikey` for Huawei. It works only inside the cluster and is useless from the internet.

Hedera testnet and Africa's Talking are free self-service and take minutes each. They are the only credentials anyone has to go and get, and both are optional to the core demo.

### 2.1 The carbon registry, which is the find

The sandbox has a carbon domain, and the organisers seeded it for exactly this kind of entry:

```
POST /carbon/projects               GET  /carbon/projects/{id}
POST /carbon/projects/{id}/mrv      GET  /carbon/mrv/{id}
POST /carbon/mrv/{id}/review        POST /carbon/credits/retire
GET  /carbon/certificates/{id}
```

With webhook events `carbon.mrv.verified`, `carbon.mrv.rejected` and `carbon.credits.retired`, a seeded merchant `mer_900 Forge Carbon Registry`, and two beneficiary accounts the test data labels **carbon payouts**: `0123987005 Arewa Solar Co-operative Society` at Zenith and `0123987006 Ogoja Community Forest Trust` at First Bank.

**Use it for the upstream half of the story Attest has been asserting.** Until now the concept began at "credits sell and the developer receives proceeds", which the demo had to assume. The sandbox supplies that chain: register a project, submit MRV, have it reviewed, retire credits, receive a certificate. The `carbon.mrv.verified` webhook is the natural trigger for "there is now revenue to share", and `carbon.credits.retired` is the event that starts a disbursement period.

So the demo arc becomes: MRV verified, credits retired, certificate issued, proceeds received, run executes, transfers settle, period closes, hash anchors, attestation appears on the public register. Every link in that chain is a real sandbox call, and the two carbon-payout beneficiary accounts are where community money lands.

### 2.2 Name enquiry, which closes a gap in the concept

Every transfer is two calls: name enquiry, then the transfer carrying the returned `name_enquiry_ref`. The enquiry resolves the account holder's name. The ref is single-use and expires after ten minutes, the destination must match the enquiry, and intra and interbank refs are not interchangeable.

**The real response, confirmed against the sandbox on 9 November:**

```json
{"name_enquiry_ref":"NE-NIP-20261109-BLQ8O9",
 "session_id":"000014261109194508562930021256",
 "account_number":"0123987001",
 "account_name":"CHUKWUEMEKA IFEANYI NWOSU",
 "bank_name":"GTBank","destination_bank_code":"000013",
 "kyc_level":2,"bvn_masked":"222*****007",
 "nip_response_code":"00","expires_at":"2026-11-09T18:55:08Z"}
```

Three fields in there matter more than the ref itself.

**`account_name`** is the integrity check. The open weakness in the concept was that a bank can prove money moved but not that the account belonged to the right household. At enrolment, resolve the account and compare the returned holder name to the enrolled household name, store the match result, and flag a mismatch. A household enrolled as one person whose account resolves to another is visible at enrolment rather than inferred later from onward flow.

**`bvn_masked`** is stronger still, and it was not in the design. Enrolment already verifies the household's BVN through `POST /identity/bvn/verify`. The enquiry then returns the masked BVN *of the account holder*. If the verified BVN and the account's masked BVN agree, and the names agree, the account provably belongs to the person who was enrolled. Two independent links instead of one, and neither requires storing a BVN in full: compare against the masked form and keep only the hash and the last four.

**`kyc_level`** solves a problem section 2.9 flagged. There is no tiering endpoint, so tiers looked unknowable. The enquiry returns the level, which means pre-flight can check the per-household amount against the published limits using data captured at enrolment, with no extra call at run time.

`expires_at` confirms the ten-minute window. `session_id` is the NIP session identifier and is what goes into the attestation leaf as the settlement reference.

Onward-flow analysis remains the deeper signal. These three run on every single enrolment.

### 2.3 Charges, which change the arithmetic

Every transfer response returns `fee`, `vat`, `stamp_duty` and `total_debit`, and `GET /tariff` returns the active schedule. The guide is explicit: read charges from the response and never hard-code them, because the platform team may switch from the event schedule to the CBN 2026 schedule for demo day.

**The live schedule, confirmed against the sandbox on 9 November.** `GET /tariff` returns worked examples rather than a formula:

| Transfer | Fee | VAT | Stamp duty | Total |
|---|---|---|---|---|
| Intrabank, any amount tested | 0.00 | 0.00 | 0.00 | **0.00** |
| NIP ₦3,000 | 10.00 | 0.75 | 0.00 | 10.75 |
| NIP ₦25,000 | 25.00 | 1.88 | 0.00 | 26.88 |
| NIP ₦75,000 | 50.00 | 3.75 | 0.00 | 53.75 |

VAT is 7.5 percent of the fee. Stamp duty is zero on the event schedule, but the guide warns the CBN 2026 schedule may be switched in for demo day, which adds ₦50 on any transfer of ₦10,000 or more. Read charges from each response regardless.

**Intrabank is free, and that is an architecture decision.** Households enrolled into Xtradot wallets through `POST /wallets` are paid intrabank at zero cost, which means the entire committed share reaches the household and coverage computed net of charges equals coverage computed gross. That is worth saying in the pitch: on this rail every naira of the committed share arrives, because the rail is intrabank.

Interbank still has to work, because households bank where they bank, and the two carbon-payout accounts in the fixture table are at Zenith and First Bank. So both paths are built, the per-transfer charge is recorded from the response, and the run builder shows the difference before the run rather than after.

**The attestation records two separate figures**, amount moved to households and charges borne, and coverage is computed on what households received. Computing it on what left the developer's account would overstate coverage, which is precisely the failure Attest exists to prevent.

### 2.4 Requery, never resend

From the guide, and it is assessed: on `504 TIMEOUT` the outcome is unknown. Never resend. Query `GET /transfers/{reference}` or `POST /transfers/interbank/requery` until the status is final. Resending is the classic double-debit defect.

This is a hard rule in the disbursement service and it has its own test.

### 2.5 Trigger values, which make the state sweep real

The sandbox forces outcomes, so every failure state is reachable against the real bank and not only against a mock:

| Trigger | Result |
|---|---|
| Account `0000000001` | `ACCOUNT_NOT_FOUND` |
| Account `0000000002` | `TIMEOUT` after 10s |
| Bank code `999999` | `BANK_UNAVAILABLE` |
| Amount ending `.01` | `INSUFFICIENT_FUNDS` |
| Amount ending `.02` | `TIMEOUT`, then failed and reversed after 30s |
| Amount ending `.03` | Pending 2 minutes, then successful |
| Amount ending `.04` | Successful, then reversed after about 60s |
| Amount ending `.05` | First webhook delivery withheld |
| Reference prefix `DUP-` | `DUPLICATE_REQUEST` |
| BVN `22299999999` | No match |
| NIN `70099999999` | No match |

Amounts ending `.00` never trigger. The header `x-test-outcome: successful | failed | pending | timeout | reversed` forces an outcome directly.

The `.04` reversal-after-success case deserves attention: a transfer that settles and is then reversed is a record Attest has already stamped. The reversal must produce a correction in the period it was found, never a rewrite of the settlement, and that is the behaviour to demonstrate.

### 2.6 Webhooks

Register `http://app.team05.svc.cluster.local/hooks/forge` or a public URL. `webhook_secret` is returned once at registration.

Headers `x-forge-event`, `x-forge-timestamp`, `x-forge-signature: sha256=<hex HMAC-SHA256 of "{timestamp}.{raw_body}">`. Verify the signature over `timestamp + "." + raw_body` using the raw bytes, reject timestamps older than five minutes, de-duplicate on `event_id`, respond 2xx within ten seconds. Failed deliveries retry at 1 minute, 5 minutes, 15 minutes, 1 hour and 6 hours.

Events to subscribe: `transfer.pending|successful|failed|reversed`, `transfer.bulk.completed`, `virtual_account.credited`, `settlement.completed`, `carbon.mrv.verified|rejected`, `carbon.credits.retired`, `webhook.test`.

### 2.7 Huawei MaaS

OpenAI-compatible, so the OpenAI SDK works with a changed base URL. The SDK's `api_key` field takes any placeholder; authentication is the `apikey` header carrying `GATEWAY_KEY`.

Models: `glm-5.3`, `glm-5.2`, `glm-5.1`, `deepseek-v4.1-flash-1017`, `deepseek-v4.1-flash`, `deepseek-v4-flash`. Availability depends on what Huawei has enabled, so fall back down the list on a not-found.

**Disable reasoning.** GLM models reason by default and `max_tokens` does not cap it. Pass `extra_body: { chat_template_kwargs: { thinking: false } }`. The guide measured a one-line reply at 137 tokens with reasoning and 18 without, and the rate limit is shared with the bank.

Gateway timeout is 120 seconds for Huawei and 30 seconds for the bank, so set client timeouts accordingly.

### 2.8 Synthetic data only

The guide's policy: no real names, account numbers, BVNs, NINs, card numbers or other personal data anywhere in the sandbox, including logs and seed files.

The seed therefore uses the supplied fixtures and synthetic identifiers in their style, not invented-but-realistic ones. Real place names are fine; real people's details are not. Participant BVNs in the seed follow the `222000000NN` pattern, NINs the `700000000NN` pattern.

### 2.9 Not implemented

Merchant onboarding, KYC tiering, mandates, split and escrow, refunds and disputes, cards beyond the test set, cross-border, bills and risk return `404 NOT_FOUND`. KYC tiering being absent matters: tiers exist on the seeded accounts and limits are enforced, but there is no endpoint to change a tier. Enrolment therefore reads the tier it is given and the pre-flight check works against the published limits: tier 1 ₦50,000 single and ₦300,000 daily, tier 2 ₦100,000 and ₦500,000, tier 3 ₦5,000,000 and ₦25,000,000, corporate ₦10,000,000 and ₦100,000,000.

---

## 3. BANK API CONVENTIONS

Taken from the guide. These are the sandbox's rules, not ours, and they override anything written here previously.

| Item | Value |
|---|---|
| Auth | `x-api-key: $GATEWAY_KEY` on every request |
| Idempotency | `Idempotency-Key: <uuid>` required on every POST that moves money or creates a record. Same key and body replays the original response with `Idempotent-Replayed: true`. Same key, different body returns 409 |
| Amounts | **NGN, two decimals.** Not kobo |
| Timestamps | ISO 8601, UTC `Z` |
| Pagination | `?page=1&per_page=20`, max 100. Lists return `meta` |
| Rate limit | 60 requests a minute per team, shared with Huawei. 429 beyond |

Response envelope:

```json
{"status":"success","message":"...","data":{},"meta":null,"request_id":"req_7f3a9c21"}
{"status":"error","error":{"code":"INVALID_REQUEST","message":"...","field":"amount"},"request_id":"req_7f3a9c22"}
```

Always log `request_id`; it is what support asks for.

Bank error codes, which Attest's own codes map onto: `INVALID_REQUEST` 400, `UNAUTHORIZED` 401, `INSUFFICIENT_FUNDS` 402, `ACCOUNT_RESTRICTED` 403, `CONSENT_REQUIRED` 403, `ACCOUNT_NOT_FOUND` and `NOT_FOUND` 404, `DUPLICATE_REQUEST` 409, `NAME_ENQUIRY_EXPIRED` and `NAME_ENQUIRY_MISMATCH` 409, `ACCOUNT_DORMANT` and `BENEFICIARY_FROZEN` 422, `LIMIT_EXCEEDED`, `BVN_MISMATCH` and `INVALID_OTP` 422, `RATE_LIMITED` 429, `BANK_UNAVAILABLE` 503, `TIMEOUT` 504.

---

## 4. THE ATTEST API CONTRACT

The seam. The front end builds against this with a mock server; the back end implements it. Integration is changing a base URL.

### 4.1 Conventions

Aligned to the bank's conventions above so there is no translation layer in the middle.

JSON throughout. Amounts are **NGN decimal strings** with two places, never floats and never kobo, matching the bank. Timestamps are ISO 8601 UTC. Pagination is `?page=&per_page=` with a `meta` block, matching the bank. Every mutating request accepts and honours `Idempotency-Key`.

Response envelope matches the bank's shape, so one parser serves both:

```json
{"status":"success","message":"...","data":{},"meta":null,"request_id":"..."}
{"status":"error","error":{"code":"TRANSFER_DORMANT","message":"...","field":null,"remediation":"..."},"request_id":"..."}
```

### 4.2 Error codes

The front end switches on `code` and never parses a message. Attest's codes are a superset of the bank's, so a bank error surfaces unchanged where it is meaningful to the user and is translated only where Attest knows more.

```
FORBIDDEN  RATE_LIMITED  INVALID_REQUEST  NOT_FOUND  DUPLICATE_REQUEST

IDENTITY_DUPLICATE  BVN_MISMATCH  IDENTITY_UNREACHABLE
NAME_MISMATCH  NAME_ENQUIRY_EXPIRED  NAME_ENQUIRY_MISMATCH
BOUNDARY_OUTSIDE  GPS_UNAVAILABLE  CONSENT_MISSING  DEVICE_UNBOUND

REGISTRY_NOT_FOUND  REGISTRY_UNREACHABLE
PDD_UNREADABLE  PDD_NO_COMMITMENT  EXTRACTION_LOW_CONFIDENCE
MODEL_UNAVAILABLE

ROSTER_EMPTY  PERIOD_CLOSED  FUNDING_NOT_RECEIVED  FUNDING_INSUFFICIENT
FUNDING_EXCLUDES_CHARGES
PREFLIGHT_EXCLUSIONS_REQUIRED
ACCOUNT_NOT_FOUND  ACCOUNT_DORMANT  ACCOUNT_RESTRICTED  BENEFICIARY_FROZEN
INSUFFICIENT_FUNDS  LIMIT_EXCEEDED  BANK_UNAVAILABLE  TIMEOUT
TRANSFER_REVERSED

ANCHOR_PENDING  ANCHOR_UNREACHABLE  CHAIN_DISCONTINUITY
PROOF_INVALID  LEAF_NOT_IN_ROOT

TOKEN_EXPIRED  ALREADY_CONFIRMED  DISPUTE_ALREADY_OPEN
DISPUTE_RESOLUTION_BASIS_REQUIRED
RECONCILIATION_MISMATCH
PARTICIPANT_DELETE_NOT_PERMITTED
```

Three are new and each exists for a reason found in the platform guide. `NAME_MISMATCH` is the enrolment check from 2.2. `FUNDING_EXCLUDES_CHARGES` is the arithmetic warning from 2.3. `TRANSFER_REVERSED` is the `.04` case from 2.5, a settlement that is undone after it was stamped.

`PARTICIPANT_DELETE_NOT_PERMITTED` exists so an attempt to delete a participant fails loudly rather than silently 404ing. The absence of deletion is a feature and the API says so.

### 4.3 Endpoints

**Auth**
```
POST   /api/auth/signup                 { email, password, organisation, role }
POST   /api/auth/signin
POST   /api/auth/verify-email           { token }
POST   /api/auth/reset/request          { email }
POST   /api/auth/reset/confirm          { token, password }
GET    /api/auth/session
GET    /api/invites/:code
POST   /api/invites/:code/redeem        { identity, deviceKey }
```

**Project onboarding**
```
POST   /api/projects/lookup             { registryId } -> registry record
POST   /api/projects                    { registryRecord } -> project
GET    /api/projects/:id
POST   /api/projects/:id/pdd            multipart -> extraction job id
GET    /api/projects/:id/extraction     -> { commitment, sourceQuote, page, confidence }
PATCH  /api/projects/:id/commitment     { field, value, reason }
POST   /api/projects/:id/register       registers the project in the sandbox carbon registry
GET    /api/projects/:id/mrv            MRV submissions and their review state
POST   /api/projects/:id/mrv            submit MRV
GET    /api/projects/:id/certificates   retirement certificates
```

**Roster**
```
GET    /api/projects/:id/participants   ?status=&agent=&tier=&flagged=&q=&page=&per_page=
POST   /api/projects/:id/participants   bulk import
GET    /api/participants/:id
PATCH  /api/participants/:id            { phone?, status?, reason }   phone and status only
GET    /api/participants/:id/payments
POST  /api/participants/:id/name-check  re-runs name enquiry, returns match result
DELETE /api/participants/:id            -> 403 PARTICIPANT_DELETE_NOT_PERMITTED, always
```

**Agents**
```
GET    /api/projects/:id/agents
POST   /api/projects/:id/agents/invite  { name, email }
GET    /api/agents/:id
PATCH  /api/agents/:id                  { status, reason }
```

**Runs**
```
GET    /api/projects/:id/runs
POST   /api/projects/:id/runs           { period, rosterId, declaredGross, fundingAmount }
GET    /api/runs/:id
GET    /api/runs/:id/arithmetic         -> { commitmentPct, declaredGross, required, estimatedCharges,
                                             totalNeeded, funded, shortfall }
POST   /api/runs/:id/preflight          -> { passed, exclusions[] }
POST   /api/runs/:id/execute            submits as a bulk transfer
POST   /api/runs/:id/retry              { failureClass }
POST   /api/runs/:id/requery            { transferId? }  never resends; polls status
POST   /api/runs/:id/cancel
GET    /api/runs/:id/transfers          paginated
GET    /api/runs/:id/stream             Server-Sent Events
```

`/arithmetic` returns `estimatedCharges` and `totalNeeded` read from `GET /tariff`, never hard-coded. `/execute` submits through `POST /transfers/bulk`, because the rate limit makes individual transfers infeasible. `/requery` exists so the front end has a safe action on a timeout and no path that resends.

Stream events: `transfer.queued`, `transfer.in_flight`, `transfer.settled`, `transfer.failed`, `transfer.reversed`, `run.complete`. Each carries the transfer ID and the new state and nothing else, so the front end patches its own table. `transfer.reversed` drives the correction path.

**Funding**
```
GET    /api/projects/:id/funding
GET    /api/projects/:id/reconciliation
GET    /api/tariff                      proxies the bank tariff, cached
```

**Disputes**
```
GET    /api/projects/:id/disputes
GET    /api/disputes/:id
POST   /api/disputes/:id/respond        { body }
POST   /api/disputes                    public intake { projectId, category, body, voiceNote? }
```

**Attestations and verification**
```
GET    /api/projects/:id/attestations
GET    /api/attestations/:id
POST   /api/attestations/:id/disclosure { transferId } -> bundle
POST   /api/verify/attestation          { hash } | multipart pdf
POST   /api/verify/disclosure           { bundle }
```

**Field**
```
POST   /api/field/device/bind           { deviceKey }
POST   /api/field/enrolments            batch, idempotent on client UUID, per-item results
GET    /api/field/enrolments/:id
GET    /api/field/me
```

**Public**
```
GET    /api/public/register             ?q=&country=&sort=&page=&per_page=
GET    /api/public/projects/:id
GET    /api/public/developers/:id
GET    /api/public/attestations/:id
GET    /api/public/projects/:id/geography   H3 buckets only, no points
```

**Verifier**
```
GET    /api/verifier/watchlist
POST   /api/verifier/watchlist          { projectId }
GET    /api/verifier/projects/:id
GET    /api/verifier/compare            ?ids=a,b,c
POST   /api/verifier/export             { projectId, period, format }
GET    /api/verifier/alerts
POST   /api/verifier/alerts             { projectId, condition, threshold }
```

**Bank operations**
```
GET    /api/ops/signals                 ?class=&severity=
GET    /api/ops/signals/:id
GET    /api/ops/signals/:id/graph       -> { nodes[], edges[], sampled }
GET    /api/ops/cases
POST   /api/ops/cases/:id/action        { action, note }
GET    /api/ops/exceptions
GET    /api/ops/reconciliation
```

**Participant, unauthenticated**
```
GET    /api/receipt/:token
POST   /api/receipt/:token/confirm
POST   /api/receipt/:token/dispute      { category, body? }
```

**Inbound**
```
POST   /hooks/forge                     Xtradot webhooks, HMAC verified per 2.6
POST   /api/webhooks/ussd               Africa's Talking USSD callback
POST   /api/webhooks/sms-inbound        inbound SMS
POST   /api/webhooks/sms-delivery       delivery reports
GET    /healthz                         platform readiness probe
```

### 4.4 What the contract guarantees the front end

1. Every list paginates identically with `page`, `per_page` and `meta`.
2. Every failure is one of the enumerated codes, so every error state is reachable by making the mock return that code, or by using the sandbox trigger values in 2.5 against the real bank.
3. Live transfer state arrives only through `/api/runs/:id/stream`.
4. No endpoint returns a phone number, an identity number or a household coordinate to a verifier or a public caller, at any granularity.
5. Amounts are decimal strings matching the bank, so no screen converts units.
6. There is no endpoint that resends a transfer. The only safe action after a timeout is `/requery`.

---

## 5. SERVICES

**5.1 Identity and access.** Auth.js, role-based sessions, six roles. Scoping at the query, never in the response filter. Invite lifecycle with expiry, single use, revocation and device binding.

**5.2 Project and registry.** Syncs reference data from Gold Standard for the seed, registers the project in the sandbox carbon registry, stores the boundary as PostGIS geometry, exposes `isInsideBoundary(projectId, point)` via `ST_Contains`.

**5.3 Extraction.** Huawei MaaS through the OpenAI SDK with `thinking: false`. Returns commitment fields with a source span, page and confidence. Below threshold the result is written and marked for review rather than accepted. The original extraction is never overwritten by a correction.

**5.4 Enrolment.** Participant lifecycle. BVN or NIN verification through the bank. **Name enquiry at enrolment** with the holder name compared to the enrolled name and the result stored; a mismatch is `NAME_MISMATCH` and flags rather than blocks. Platform-wide duplicate identity as the one hard block. Server-side boundary validation that flags and does not block. Offline sync on client UUID with capture and receipt times stored separately. Identity stored as hash plus last four plus result, never in full. No delete path.

**5.5 Wallet.** Thin wrapper over the bank's wallet and account endpoints. Reads the tier it is given, because there is no tiering endpoint.

**5.6 Disbursement.** Run construction, commitment arithmetic including charges from `/tariff`, pre-flight against the published KYC limits, bulk execution, requery on timeout, per-transfer state machine, reversal handling.

Idempotency key from run ID plus participant ID, unique in the database, and the bank's own `Idempotency-Key` on every submission. **Never resend on timeout. Requery until final.** Both properties get a test before the executor is written.

**5.7 Attestation.** Period close, transfer tree, canonical document, hash, chain, signature, anchor, disclosure bundles, corrections, chain monitor. Append-only, as product spec 4.4 specifies. Records amount moved to households and charges borne as separate figures, and computes coverage on what households received.

**5.8 Signals.** Five detection classes. Onward-flow concentration, enrolment geo-clustering in PostGIS, device fingerprint reuse, dormancy-then-sweep, velocity anomaly. Plus name-mismatch clustering, which the enrolment check now makes available.

**5.9 Notification.** Africa's Talking. SMS out, inbound parsing, delivery tracking, USSD sessions, tokenised receipt links, templates per language.

**5.10 Public register.** Read-optimised, cached, aggregated. Shares its PII-exclusion layer with the verifier endpoints so the rule is enforced once.

---

## 6. BACKEND BUILD PROMPTS

Six phases. Paste the standing block from the front-end document first, then one phase at a time.

### BE-0 — SCHEMA, HYGIENE, DEPLOYABILITY AND THE CONTRACT STUB

```
1. Repository hygiene first. .gitignore covering .env and all variants, team05.yml and any
   teamXX.y*ml by pattern, any *.pem or *.key, /uploads, and the standard Node and Next.js
   entries. .env.example naming every variable from section 2 with empty values and a one-line
   comment each. Verify with `git check-ignore -v` that the kubeconfig pattern and .env are both
   ignored, and print the result. The GATEWAY_KEY is never written to a file: it arrives from the
   namespace secret via envFrom.

2. Make it deployable before it does anything. Dockerfile building for linux/amd64, app listening
   on 0.0.0.0 on a fixed port, GET /healthz returning 200 cheaply. The Deployment and Service
   manifest from the platform guide 4.2, Service named app on port 80, envFrom the huawei-gateway
   secret, resource requests sized against the namespace quota in section 1.1. Deploy it and
   confirm `curl -I https://team05.xtradot.co` returns 200 with nothing but a health check in it.
   Nothing else in this project is worth building until that returns 200.

3. Prisma schema for all eleven objects plus AuditEntry per product spec 1.2, with PostGIS
   enabled, boundary as geometry(Polygon, 4326) and enrolment point as geometry(Point, 4326). Add
   to Participant: resolved account holder name, name match result. Add to Transfer: fee, vat,
   stamp duty, total debit, reversal state. Add to Attestation: amount moved to households,
   charges borne.

4. One persistent volume only, and it goes to Postgres. Redis runs without persistence. Size both
   against the memory quota.

5. On the Attestation table, grant the application role INSERT only, no UPDATE and no DELETE,
   enforced in the migration. Write the test that attempts an UPDATE and asserts failure.

6. Unique constraint on Transfer (runId, participantId) so the idempotency key cannot duplicate at
   the database level, not only in code.

7. Implement every endpoint in section 4.3 as a typed route returning a correctly shaped stub
   using the envelope in 4.1 and the codes in 4.2. Generate a shared types package so the front
   end imports the same types rather than redeclaring them.

8. Audit log service, append-only, recording actor, action, before, after and time for every state
   change to a Participant, Run, Dispute, Case or Roster.

9. DELETE /api/participants/:id returns 403 PARTICIPANT_DELETE_NOT_PERMITTED unconditionally, and
   no other code path removes a participant row. Write the test.

10. Build-time exclusion for all developer tooling, per section 6A.1. Any /dev route and the dev
    trigger endpoint are compiled out when the production flag is set, so they do not exist in the
    deployed bundle rather than merely being guarded. Add the build-time check from 6A.2 that fails
    the build if any NEXT_PUBLIC_ variable name contains KEY, SECRET or TOKEN.
```

**Exit checklist**
- [ ] `curl -I https://team05.xtradot.co` returns 200
- [ ] `git check-ignore -v` confirms the kubeconfig pattern and `.env` are ignored; `.env.example` complete
- [ ] `GATEWAY_KEY` appears in no tracked file and no log line
- [ ] Pod runs inside the namespace quota, verified with `kubectl describe resourcequota team-quota`
- [ ] Every endpoint in 4.3 responds with the correct envelope
- [ ] Shared types package consumed by the front end without redeclaration
- [ ] Attestation UPDATE and DELETE rejected at the database level, proven
- [ ] Participant DELETE returns 403 and no other delete path exists, proven
- [ ] Every `/dev` route and the dev trigger endpoint return 404 on `https://team05.xtradot.co`
- [ ] Build fails if a `NEXT_PUBLIC_` variable name contains KEY, SECRET or TOKEN
- [ ] TypeScript builds with zero errors and zero `any`

---

### BE-1 — PROVIDERS, MOCKS AND SEED

```
Every external dependency behind an interface with a deterministic offline mock and a live
implementation, selected per dependency by environment variable. The mocks are mandatory, not a
convenience: the platform APIs do not answer from a workstation, so local development has nothing
else to build against.

  BankProvider       nameEnquiryIntra, nameEnquiryInterbank, transferIntra, transferInterbank,
                     transferBulk, getBulkStatus, getTransfer, requery, getTariff, getBalance,
                     createWallet, fundWallet, verifyBvn, verifyNin, getSettlements, reconcile,
                     registerCarbonProject, submitMrv, getMrv, retireCredits, getCertificate,
                     registerWebhook
  ExtractionProvider extractCommitment(pdd) -> { percentage, basis, cadence, beneficiary,
                     sourceQuote, page, confidence }
  RegistryProvider   getProject, getBoundary, getIssuances        (Gold Standard, public)
  AnchorProvider     submitMessage, getMessageProof               (Hedera)
  MessagingProvider  sendSms, parseInboundSms, handleUssdSession, getDeliveryStatus
  SignerProvider     sign, verify

The BankProvider mock reproduces the sandbox faithfully, including every trigger value in section
2.5 and the x-test-outcome header. That means: name enquiry that expires after ten minutes and
rejects a mismatched destination; single-use enquiry refs; intra completing in-call at 201 and
interbank returning 202 and settling in about five seconds; fee, vat, stamp_duty and total_debit on
every response; a tariff endpoint; the KYC limits from 2.9; dormant and frozen beneficiaries failing
at enquiry; PND sources unable to send; 504 TIMEOUT whose outcome is only knowable by requery; and
the .04 settle-then-reverse case. A mock that always succeeds is worthless here, because the failure
states are most of the product.

The ExtractionProvider mock returns a real commitment with a real source quotation, page number and
confidence, plus a low-confidence variant on demand.

Seed. One real project using Gold Standard reference data including its real boundary polygon and
its real declared commitment. 500 participants with plausible Nigerian names, real community and
local government names, and synthetic identifiers in the fixture style per section 2.8, distributed
plausibly inside the boundary with a handful deliberately outside and a handful whose resolved
account name deliberately does not match. Named agents with differing flag rates, one above
threshold. Three closed historical periods. One open period ready to run. A second clean project. A
third with a planted onward-flow concentration across 400 wallets into 3 accounts. Wire the two
carbon-payout beneficiary accounts from the fixture table into the demo project.

Re-seed script. Bank sandbox state is volatile and resets without warning, so one command must
rebuild every bank-side precondition for the demo: accounts funded via /admin/accounts/{n}/fund,
the carbon project registered, MRV submitted and reviewed, credits retired, webhooks registered.
You will run this the morning of the demo.

Dev state trigger endpoint, disabled in production, forcing any state the front end needs. Where
the sandbox has a real trigger, the endpoint uses it rather than faking it.
```

**Exit checklist**
- [ ] Every interface has a mock and a live implementation, selectable per dependency
- [ ] The bank mock reproduces every trigger value in 2.5 and honours `x-test-outcome`
- [ ] Name enquiry refs are single-use, expire at ten minutes, and reject a mismatched destination
- [ ] `ST_Contains` flags the deliberately out-of-boundary seed participants
- [ ] Name-mismatch seed participants surface as `NAME_MISMATCH`
- [ ] Re-seed script rebuilds every bank-side demo precondition in one command
- [ ] Every error code in 4.2 is reachable through the dev trigger endpoint

---

### BE-2 — ACCESS CONTROL

```
1. Auth.js with role-based sessions for all six roles.

2. Scope every query by principal, at the query. A developer reads only their own organisation's
   data. An agent reads only the project they were invited to and only their own enrolments. A
   verifier reads published and portal-level data and never participant PII. Bank ops reads
   signals, cases, exceptions and reconciliation across projects with no roster write rights.
   Platform admin reads onboarding review, extraction review, dispute escalation and the chain
   monitor.

3. Write the authorization suite now, before business logic. Positive and negative test per role.
   Specifically: developer A cannot read developer B's roster through any endpoint; an agent cannot
   list the roster; a verifier cannot obtain a phone number, identity number or household
   coordinate through any endpoint including export and geography; bank ops cannot mutate a roster.

4. Invite lifecycle: generation, expiry, single use, revocation, device binding.

5. Rate limit every unauthenticated endpoint. The platform guide is explicit that anything at
   team05.xtradot.co is reachable by anyone with the link, and that model calls must never be made
   from an unauthenticated public endpoint without your own throttling.
```

**Exit checklist**
- [ ] Authorization suite passes with a negative test for every boundary
- [ ] No endpoint leaks a phone number, identity number or coordinate to a verifier or public caller, proven
- [ ] Invite codes expire, are single use, revocable
- [ ] Unauthenticated endpoints rate-limited, and no public endpoint can trigger a model call

---

### BE-3 — ENROLMENT, WALLET AND DISBURSEMENT

```
1. Enrolment service per 5.4. BVN or NIN verification. Name enquiry at enrolment with the resolved
   holder name compared to the enrolled name and the result stored; a mismatch flags and does not
   block. Duplicate identity is the one hard block. Server-side boundary validation flags and does
   not block. Offline sync on client UUID with capture and receipt times stored separately.
   Identity stored as hash plus last four plus result. No delete path.

   Name enquiry at enrolment is deliberate: the rate limit makes enquiry at run time infeasible,
   and checking the account holder against the enrolled household is the integrity check the
   concept needed.

2. Wallet service per 5.5. Thin wrapper. Read the tier, do not try to set it.

3. Disbursement service per 5.6.
   - Commitment arithmetic reading charges from GET /tariff, never hard-coded, returning required,
     estimatedCharges, totalNeeded, funded and shortfall. If funding covers the commitment but not
     the charges, return FUNDING_EXCLUDES_CHARGES so the front end can say so before the run.
   - Pre-flight against the published KYC limits in 2.9, plus dormant, frozen and PND beneficiaries,
     duplicate account numbers and flagged enrolments.
   - Execution through POST /transfers/bulk, polling GET /transfers/bulk/{batch_reference} and
     reconciling against the transfer.bulk.completed webhook.
   - On 504 TIMEOUT: never resend. Requery via GET /transfers/{reference} or
     POST /transfers/interbank/requery until final. There must be no code path that resends after a
     timeout. Write that test before the executor.
   - Handle transfer.reversed: a settlement that is reversed after being stamped produces a
     correction in the period it was found, never a rewrite of the original.
   - Store fee, vat, stamp_duty and total_debit per transfer from the response.
   - Server-Sent Events on /api/runs/:id/stream.
   - A shortfall records and does not block.

   Write the no-double-pay test before the executor: retry the same batch, replay the same request,
   run two executors concurrently, and simulate a 504 followed by a requery, asserting exactly one
   transfer per participant in every case.

4. Confirmation service. Acknowledgement as a signal separate from settlement. Soft flag after
   seven days unconfirmed.

5. Dispute service. Closes only on a participant confirmation or a reversal; anything else returns
   DISPUTE_RESOLUTION_BASIS_REQUIRED. Test that a developer cannot self-certify.
```

**Exit checklist**
- [ ] No code path resends a transfer after a timeout, proven by test
- [ ] Double-pay impossible under retry, replay, concurrency and timeout-then-requery, proven
- [ ] Charges read from `/tariff` and stored per transfer; nothing hard-coded
- [ ] `FUNDING_EXCLUDES_CHARGES` returned when funding covers the commitment but not the charges
- [ ] A reversal after settlement produces a correction and leaves the original intact
- [ ] Name mismatch flags, duplicate identity blocks, out-of-boundary flags
- [ ] A 500-participant run completes without tripping the 60-per-minute limit
- [ ] SSE stream emits every event type including `transfer.reversed`, and reconnects cleanly

---

### BE-4 — ATTESTATION ENGINE AND THE CHAIN

```
Build the attestation engine per product spec 4.4, with two additions from the platform.

1. Period close job, scheduled, never manually triggered, the only writer to the attestation table.

2. Transfer tree. Every settled transfer becomes a leaf carrying a pseudonymous participant ID, the
   amount received by the household, the settlement timestamp, a hash of the bank reference, and
   the confirmation flag. No name, no phone number, no identity number.

3. The attestation. Canonical JSON with project ID, period, enrolled count, paid count, amount
   committed, amount moved to households, charges borne, shortfall, confirmation count, disputes
   open at close, disputes substantiated, signal counts by class, the Merkle root, and the previous
   hash. Canonicalise deterministically. SHA-256. Sign through SignerProvider.

   Coverage is computed on what households received, not on what left the developer's account.
   Charges are recorded separately. Anything else overstates coverage, which is the failure the
   product exists to prevent.

4. Anchor one message per close through AnchorProvider. Failure publishes with anchor pending and
   retries.

5. Disclosure bundles: leaf, proof path, root, anchored attestation reference. Verify without the
   tree.

6. Corrections as new rows referencing and superseding, dated when made. No code path, including
   administrative, rewrites a closed period. Write the test that attempts it and asserts failure.
   A reversed transfer and a substantiated fraud case both arrive here.

7. Chain integrity monitor per project, alerting on discontinuity.

Every figure is computed from settlement data. There is no input, no override, no admin field and no
seed path that lets any figure be entered by hand. Audit the codebase before closing this phase.
```

**Exit checklist**
- [ ] A closed period cannot be altered by any code path, proven by a failing-as-expected test
- [ ] Coverage computed on amount received by households, with charges recorded separately
- [ ] Canonicalisation deterministic across runs and machines
- [ ] A disclosure bundle verifies against the root without the tree
- [ ] A reversal and a substantiated case each produce a correction, original intact
- [ ] Anchor failure degrades to anchor-pending without blocking the close
- [ ] Chain monitor detects an injected discontinuity
- [ ] No hand-entered figure path anywhere, verified by audit

---

### BE-5 — CARBON CHAIN, NOTIFICATION, SIGNALS AND PUBLIC READ

```
1. Carbon chain against the sandbox registry, which supplies the upstream half of the story.
   Register the project, submit MRV, read its review state, read retirement certificates. Subscribe
   to carbon.mrv.verified, carbon.mrv.rejected and carbon.credits.retired. A verified MRV followed
   by a retirement is what opens a disbursement period, so wire that as the trigger rather than a
   manual action.

2. Webhook receiver at /hooks/forge. Verify x-forge-signature as HMAC-SHA256 over
   "{timestamp}.{raw_body}" using the raw bytes and the webhook_secret returned at registration.
   Reject timestamps older than five minutes. De-duplicate on event_id. Respond 2xx within ten
   seconds and queue the real work. Handle the .05 withheld-first-delivery case, and use
   /webhooks/deliveries and /webhooks/deliveries/{event_id}/replay when a delivery is missed.

3. Notification through Africa's Talking.

   Enrolment notice: on successful enrolment, before any money can move for that participant, an
   SMS with the project name, that they are entitled to a share of what it earns, their account
   last four and how to check. This is the mechanism that turns a household from a line item into a
   witness, so it is a hard step in enrolment and not a best-effort side effect. A failed send
   retries and surfaces as pending. Write the test that a transfer cannot be created for a
   participant whose enrolment notice was never attempted.

   Payment notice on settlement: amount, date, project, how to confirm or report a problem.

   USSD against Africa's Talking's callback shape: check enrolment, check last payment, confirm
   receipt, report a problem, language selectable.

   Inbound SMS parsing tolerant of misspelling, case and whitespace. Tokenised receipt links with
   expiry, single-project scope and revocation. Templates per language, checked against the voice
   rules in foundation 1.7. Delivery tracking including a queryable count of households with no
   reachable number.

4. Signals detection per 5.8. Five classes plus name-mismatch clustering. Account graph endpoint
   returning nodes, edges and a sampled flag.

5. Public read layer. The /api/public endpoints and the verifier endpoints share one PII-exclusion
   layer so the rule is enforced once. Geography aggregated to coarse H3 buckets. Cached and
   rate-limited. Documented, because the same endpoints back the verifier keys.
```

**Exit checklist**
- [ ] A verified MRV and a credit retirement open a disbursement period automatically
- [ ] Webhook signature verification rejects a tampered body and a stale timestamp, proven
- [ ] A withheld first delivery is recovered by replay
- [ ] A transfer cannot exist for a participant whose enrolment notice was never attempted, proven
- [ ] Every USSD state reachable, through the mock and through the Africa's Talking simulator
- [ ] All five detection classes plus name-mismatch clustering fire against the seed, no false positive on the clean project
- [ ] Raw signals unreachable from public or verifier routes; counts only
- [ ] Public API documented, cached, rate-limited, PII-free

---

## 6A. EXPOSURE AND HARDENING

`https://team05.xtradot.co` is reachable by anyone with the link, and the guide says plainly to gate what should not be public. Every item below is a build requirement, not advice.

**6A.1 Developer tooling must not exist in the production build.** This is a correction to an earlier version of these prompts, which route-guarded `/dev/states`, `/dev/kitchen-sink` and the dev trigger endpoint but still shipped them. A route guard on a public URL is one misconfiguration away from letting a stranger force a transfer state or read the component inventory. They are excluded at build time behind an environment flag so the routes do not exist in the production bundle at all, and the deploy checklist verifies each one returns 404 on the live URL.

**6A.2 The team key never reaches a browser.** `GATEWAY_KEY` arrives from the namespace secret and is read only inside server-side route handlers and worker code. It is never read in a client component, never passed as a prop, never placed in a `NEXT_PUBLIC_` variable, and never logged. Every bank and model call is server-side; the browser talks only to Attest's own API. Add a build-time check that fails if any `NEXT_PUBLIC_` variable name contains KEY, SECRET or TOKEN.

**6A.3 Webhooks verify before they act.** `/hooks/forge` computes HMAC-SHA256 over `{timestamp}.{raw_body}` using the raw bytes and compares in constant time, rejects timestamps older than five minutes, de-duplicates on `event_id`, and does nothing else until all three pass. An unverified webhook body is treated as hostile input.

**6A.4 Unauthenticated surfaces are rate-limited and cheap.** The register, verify, report and receipt routes are public by design. None of them may trigger a model call, an unbounded query or an unbounded export. Receipt tokens are high-entropy, expiring, scoped to one project and revocable, and enumeration is rate-limited per IP.

**6A.5 The PDD is hostile input.** A project design document is a file the developer uploads and its text is sent to a language model, so it can carry instructions aimed at the model. Mitigations are already in the design and are now named as security controls: the extraction is never auto-accepted, it is always shown to a human beside its source quotation and page, the percentage is validated as a number in a plausible range, and the original extraction is retained so a later correction cannot hide what was first returned. Uploads are size-capped, type-checked, stored outside any served path and never executed.

**6A.6 PII is minimised at the point of capture.** Identity numbers are stored as a hash plus the last four plus the verification result, and the masked BVN returned by name enquiry removes any need for the full value. Phone numbers are masked in every list. Household coordinates never appear on a public or verifier surface at any zoom, and the geography endpoint returns coarse buckets rather than points.

**6A.7 Dependencies stay few and mainstream.** No package enters the project to solve something a few lines of our own code solves. Lockfile committed, `npm audit` run as a gate before each deploy, and no package added in the last week of the build without a reason worth stating.

**6A.8 Secrets stay out of git.** `.gitignore` covers `.env` and variants, `team05.yml` and any `teamXX.y*ml` by pattern, and any `*.pem` or `*.key`, verified with `git check-ignore` rather than assumed. The kubeconfig moves between teammates through a password manager only, and is never pasted into a support message, an issue or a chat.

---

## 7. OPEN QUESTIONS FOR THE PLATFORM TEAM

These are blanks in the guide that change what gets built. Ask early.

1. **Does each item in `POST /transfers/bulk` need its own `name_enquiry_ref`?** Still the single most important unknown. Probing with an empty body returned `INVALID_REQUEST`, field `source_account`, so the endpoint takes a top-level source account and validates one field at a time. Walking the schema answers this without asking anyone; only ask if the walk stalls. If per-item refs are required, a 500-row run needs 500 fresh enquiries inside a ten-minute window against a 60-per-minute limit, and the core operation is impossible as designed.
2. **Does the bulk endpoint count as one request against the rate limit, or one per item?**
3. **Is outbound internet egress from a pod permitted?** A probe to `portal.hedera.com` returned 403, which is inconclusive: Cloudflare-fronted sites commonly refuse a bare curl. Re-probe against a target with no bot protection before concluding anything. If egress really is blocked, Hedera anchoring and Africa's Talking both degrade to mocked and the demo says so.
4. **Can a second public host be published?** The guide says to ask. Not needed, but useful to know before relying on one.
5. **Is the Sandbox API Mock Specification v2 available now?** The guide names it as authoritative and section 3 here is only the operational summary.
6. **Which tariff schedule is live on demo day**, the event schedule or the CBN 2026 schedule? Charges are read from the response either way, so this changes nothing in the code, but it changes the figures on stage.
