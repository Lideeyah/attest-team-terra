# Backend completion handover

Updated 11 November 2026. The consolidated revision is implemented; see [specification alignment](specification-alignment.md) for the canonical `/api/registry/boundary` and `/api/attestations/:id/report` routes, staged payment metadata, demonstration notices and the pending source-edition citation.

For the frontend handoff, use the [integration guide](frontend-integration.md) and [endpoint reference](frontend-api-reference.md). They cover browser routing/authentication, request examples, screen workflows, role access, downloads, live progress and remaining integration gaps.

Scope: Raheem's backend lane, BE-0 through BE-5, the participant bank contract, and Spec Patch 02. Mark's frontend surfaces consume the shared contracts and API additions below.

## Contract authority

Use the Participant Platform Guide section 5.8 over the participant API PDF where they differ. The organizer's supplied clarifications cover Xtradot branding, stamp duty, active tariffs, unsupported onboarding/tiering and the 200-item bulk limit. The full updated platform guide is not in this workspace. `strict` and `loose` are the documented/communicated name-check modes available to this build; the truncated third mode is not guessed. The executor uses `loose`, which was accepted by the live sandbox.

Attest's API continues to use NGN decimal strings. The bank adapter converts money fields to JSON numbers at the HTTP boundary because the live bank rejects strings. IDs and account numbers remain strings.

## Completed implementation

| Requirement | Implementation |
| --- | --- |
| At most 200 transfers per request | Durable `transfer_batches`; a 500-recipient run prepares 200/200/100 items |
| No duplicate payment after uncertainty | Claims commit before submission; unknown/submitting batches are queried and never automatically resubmitted |
| Resume unsent work | The worker resumes pending batches using their original request/key; budget exhaustion and explicit 429 defer work |
| Safe query action | `/requery` only reads payment status; it cannot submit a pending batch |
| Partial acceptance | Accepted and rejected items are recorded individually; sparse bulk responses are hydrated from individual transfer records |
| Settlement evidence | Amount, fee, VAT, stamp duty, total debit, settlement reference and timestamp are validated before counting a household as paid |
| Live response shapes | `/intra`, `completed_at`, `transaction_id`, `event`, `wallet_id`, `tier` and carbon-specific IDs are handled |
| Active tariff | The deployed worked-example shape is normalized; charges come from the response, with v2's band boundaries and VAT checked explicitly |
| Plan Vivo onboarding | Registry records support Plan Vivo/Acorn/Gold Standard; missing boundaries request an upload instead of fabricating geometry |
| KML boundary upload | Bounded XML parsing, DTD/entity/network-link rejection, polygons/multipolygons/holes, PostGIS validity checks and upload history |
| Benefit-sharing export | Signed JSON and PDF with source quotation/page, household coverage, cash received, charges, shortfall, confirmations, disputes and cryptographic references |
| Carbon chain | Register, submit/read MRV, retire against verified owned credits and a paid checkout, retrieve certificates by retirement ID |
| Reseed | Paid-checkout steps added; the same session resumes without repeating completed operations or payouts |
| Operations | Documented admin account-status endpoint; optional transaction/history adapter for onward-flow analysis |
| Existing controls | Database immutability, scoped roles, identity minimization, evidence encryption, receipt flows, signatures, Merkle proofs, corrections and production exclusion of developer routes remain enforced |

Migration `004_batches_and_boundaries.sql` adds the batch table and converts project geometry to MultiPolygon. Run all migrations as the database owner before starting the new application/worker. Application writes still use the restricted `attest_app` role.

NIN-only enrolment requires an existing payout account: the participant contract documents BVN, not NIN, for wallet/virtual-account provisioning. The API reports `WALLET_ACCOUNT_REQUIRED` rather than inventing an unsupported request. BVN enrolment creates a wallet and a dedicated virtual account, then resolves the account at enrolment.

## Frontend integration additions

All routes below use the existing response/error envelope. Downloads use session cookies or bearer authentication. Mutation keys remain required for JSON requests; file uploads are deduplicated by their source hash/history rather than an assumed JSON body.

| Route | Access / response |
| --- | --- |
| `GET /api/projects/:id/boundary` | Developer roles; geometry or `BOUNDARY_NOT_AVAILABLE` |
| `POST /api/projects/:id/boundary` | Developer roles; one `.kml` multipart file, at most 2 MiB; returns geometry, `boundaryStatus`, SHA-256 |
| `GET /api/attestations/:id/benefit-sharing` | Owning developer or verifier; signed report payload |
| `GET /api/attestations/:id/benefit-sharing/pdf` | Owning developer or verifier; PDF with registration marks and embedded JSON |
| `POST /api/verifier/export` | Existing JSON export adds `reports`; PDF links now point to the benefit-sharing report; CSV remains available |
| `POST /api/projects/:id/register` | Full bank registration body: `type`, `location`, `owner`; name/methodology come from the project |
| `POST /api/projects/:id/mrv` | Participant-contract period/metric/value/evidence request; stores `submission_id` |
| `GET /api/projects/:id/mrv` | Reads submitted MRVs via `/carbon/mrv/{submission_id}` |
| `POST /api/projects/:id/credits/retire` | Paid `payment_reference`, owned verified `credit_batch_id`, quantity, buyer, numeric/string decimal price, currency and reason |
| `GET /api/projects/:id/certificates` | Reads `/carbon/certificates/{retirement_id}` |

Handle `BOUNDARY_NOT_AVAILABLE` by showing the KML upload path. `INVALID_BOUNDARY` means the file or geometry needs correction. New report/boundary types are exported by `@attest/contracts`.

## Demo and provenance

The main fixture uses the real Plan Vivo **Trees for Global Benefits** project in Uganda. `data/plan-vivo-tgb.json` records the published PDD URL/hash and a short verbatim commitment excerpt on page 47. The percentage is parsed from that excerpt. Payment cadence is staged against verification; annual reporting is a separate field. The available source PDD describes performance milestones. The requested A.13.1 edition remains explicitly pending.

All households, identity numbers, bank activity and test geometry are synthetic. Nigerian sandbox money demonstrates the payment mechanism; it is not an assertion that this Ugandan project uses the Nigerian rail. Historical and new attestation figures are computed from fixture transfers. Existing synthetic histories are preserved when the new fixture is added.

An authentic boundary KML is not available. The local fixture labels its polygon synthetic; an ordinary project with no boundary must upload one before enrolment. No Markit issuance history has been invented. Import a provenance-backed issuance export when it is supplied.

```powershell
npm install
npm test
npm run demo
npm run demo:assets
npm run local
```

`demo` produces `output/offline-demo.json`, the signed attestation PDF and `output/benefit-sharing-report.{json,pdf}`. `demo:assets` downloads/caches the published PDD and 2024 annual report under ignored `output/plan-vivo/`, verifies the pinned PDD hash, and checks the extraction proposal against its source page. The full PDD is not redistributed in source control. The proposal still requires human review.

`local` preserves the database, keys and mock-bank state under ignored `.local-state/`. It prints the local synthetic login credentials. The deployment image uses Node 24; this workstation's installed Node 23.11.0 was used for the local checks without replacing it.

## Live checks performed

The cluster connection succeeded; the prior TLS-blocked note is historical. A temporary resource-limited probe pod was created and then deleted.

- `/tariff`, account balance and Xtradot bank availability returned successfully.
- Wallet creation returned the documented `wallet_id` and `tier` shape.
- A two-item synthetic batch used `auto_name_enquiry: true` and `expected_names_check: loose`, with one intrabank and one NIP destination. Both settled. The combined household amount was NGN 20.00, with NGN 10.75 charges.
- Bulk request `req_38e9e91c`; completed batch query `req_3ffd2dfa`; individual settlement query `req_66d4443b`.
- An initial string-amount request was rejected before a batch was created. The adapter now sends numeric bank amounts.
- Captured, minimized tariff and settlement examples are regression fixtures. No gateway key was printed or written to a file.

These checks do not certify every adapter or a full live 500-household run. Bulk status omits session IDs, VAT/duty breakdowns and settlement timestamps; individually hydrating 500 records consumes several minutes at the shared rate limit. The durable worker respects the 55-call local budget rather than fabricating missing evidence. Adequate distinct synthetic bank identities/accounts are also needed for a full live roster.

## Release boundaries

The local validation results are recorded in `raheem-status.md`. Production bundles exclude developer routes; schema validation and the high-severity dependency audit are release checks. Eight low-severity transitive elliptic advisories remain in the Hedera SDK dependency chain; no forced breaking downgrade was applied.

Before a public release: provide the authentic KML and issuance export; integrate Mark's frontend; provision production database roles, image/pull credentials, stable signing/evidence/auth secrets and callback secrets; run the remaining in-cluster integration sweep. A real SMS/USSD delivery, SMTP delivery, Hedera anchor and the full carbon-chain flow have not been certified live. Reviewed local-language templates remain a separate human task.

No public application deployment or registry image push was performed. `deploy/kubernetes.yaml` still requires a real versioned image. The namespace was used only for the temporary diagnostic pod. The bank retains the clearly referenced synthetic probe transactions; no team-wide reset was issued.
