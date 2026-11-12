# Attest Backend Product Requirements

## Purpose and required outcome

Version 1.0. Product owner: Attest. Audience: backend developer, integration engineer, frontend developer and acceptance reviewer. Date: 12 November 2026.

Build the backend that turns confirmed project income into automatic community payouts under an agreement approved during setup. Operators receive income through an Access Bank-powered experience, inspect earnings and wallet balances, and resolve exceptions. Community members receive the promised amounts and can acknowledge or dispute payment. Verifiers inspect payment outcomes on privacy-controlled maps and independently check published evidence.

The Forge 2026 Participant Edition API specification dated 9 November 2026 is the banking integration guide. Its actual sandbox identity is Xtradot Bank, NIP 000014 and CBN 044. All sandbox money, identities, banking and carbon verification are synthetic. Product branding must not imply this environment accesses real Access Bank accounts, NIBSS, NIMC or real funds.

This PRD specifies additions to the existing Attest backend. It is not a request to replace the frontend, clone a repository, rewrite the entire service or implement every unrelated Forge service. Requirements are binding product behaviour; implementation names and proposed Attest routes may be refined while preserving their meaning and existing clients.

### Success criteria

- Each confirmed, attributed credit creates exactly one incoming receipt and the correct entitlement calculation, despite duplicate callbacks and worker restarts.
- Eligible recipients are submitted automatically without approval of every run. Ineligible recipients retain visible unpaid entitlements and protected application reservations.
- Wallet, dashboard, payment map, statement and period report reconcile to the same underlying receipt, allocation and payment records.
- Unknown outcomes are queried before retry; no browser session is required to keep processing alive.
- The actual agreement is preserved, including weighted household shares, a separate community fund, evidenced net deductions and payment timing.
- Every delayed amount has a reason and next action. Messages, bank settlement, recipient confirmation and Hedera evidence remain distinct facts.

## Scope priorities

P0 means required for credible automatic-money processing, including its safety and recovery. P1 means required for the complete specified handoff and follows a working P0 foundation. P2 means optional provider-dependent enhancement. These labels set delivery order, not permission to drop agreed features silently.

P0: reachable banking integration; verified project accounts; durable incoming receipts; agreement and roster snapshots; exact allocations; separate fees; reservations; automatic dispatch; reconciliation; authenticated callbacks; permission checks; observable workers; basic wallet/dashboard contracts.

P1: point and polygon datasets; durable CSV import; complete identity/account review; document draft autosave/history; field-device recovery; WhatsApp; verifier payment maps; richer operator/operations/admin APIs; period aggregation; signed and Hedera-linked evidence.

P2: native provider split/escrow, optional checkout channels beyond the required income source, additional FX/cross-border functionality and native refund conveniences after contract tests. Loans, bills, airtime, card issuing and subscriptions are outside this PRD. Do not build a new carbon marketplace; extend existing carbon integration only to obtain and reconcile owner proceeds correctly.

## Source authority and sandbox constraints

Use the attached 31-page PDF as the documented baseline. PDF page numbers below are physical pages in that attachment. The PDF states that section 5.8 of the Participant Platform Guide takes precedence when the build differs. Obtain that guide and execute contract probes before claiming a documented feature is available in the team's deployed build. Do not infer the missing section's content.

| Documented rule | Source pages | Requirement for Attest |
| --- | --- | --- |
| Internal base URL and team API key | 1 and 2 | Run adapter inside an authorised team namespace or use an approved secure bridge |
| NGN amounts with two decimals; UTC timestamps | 2 | NGN only for this release; exact minor-unit arithmetic; WAT presentation as needed |
| 60 requests per minute per team key | 2 | Shared rate budget, bounded polling, backoff and queue priority |
| Provider idempotency retention 24 hours | 2 | Persist Attest financial deduplication beyond that window |
| Lists max 100 rows per page | 2 | Page through history; never assume first page is complete |
| Signed callbacks and stable event IDs | 3 | Verify raw body HMAC and timestamp; persist/acknowledge within 10 seconds |
| Name-enquiry references single-use and valid 10 minutes | 6 | Obtain at submission or use supported bulk auto-enquiry |
| Bulk limit 200 recipients | 10 and 11 | Split larger distributions; persist batches and per-item outcomes |
| Virtual accounts and wallet support | 14 to 16 | Probe actual account control and payout connectivity before activation |
| Ledger history and merchant settlement | 16 to 18 | Import bank evidence; separate successful collection from spendable settlement |
| Identity KYC and merchant checks | 18 to 20 | Use actual sandbox checks; label them synthetic |
| Carbon sale owner payout | 24 to 26 | Wait for successful payout, not retirement, before releasing proceeds |
| Split escrow refunds are nice-to-have services | 26 to 28 | Treat as optional until demonstrated; do not make them core dependencies |

The example virtual-account credit contains an account-creation reference such as VA-0042, reused for inflows, plus a session_id. That VA reference is not a unique incoming-payment identifier. Deduplicate business credits using the provider's actual transaction/session identity and account scope, as validated in the deployed build.

## Capability validation before enabling automation

The developer must deliver a capability report containing request/response fixtures, request IDs, observed behaviour and each unsupported item. Use synthetic credentials and data; redact keys and sensitive fields from shared evidence. Probes belong in the isolated team sandbox and must not reset existing team data without explicit coordination.

CAP01 Connectivity: reach the internal bank URL with the team key from the intended worker location. A Vercel function cannot be assumed to resolve or reach a .svc.cluster.local address. Recommended deployment is the banking worker/adapter in the Forge namespace, with approved ingress and authenticated application communication. If an approved relay is used, restrict methods and destinations; never expose a general bank-key proxy or place the key in frontend code.

CAP02 Account path: create a dedicated virtual account using supported synthetic customer identity, receive two separate credits and verify details/balances/history. Test whether that account is valid as source_account for bulk/intra/interbank payouts, and whether credited money is available there. The PDF documents receiving accounts but does not explicitly prove this complete debit path.

CAP03 Wallet path: create/read/fund a wallet and test the documented wallet-to-wallet route. The PDF does not establish that a wallet can directly fund bank/NIP payouts or sweep virtual-account credits into a wallet. Do not invent a wallet cash-out API or assume shared balances between these products.

CAP04 Carbon proceeds: register the supported project/owner, obtain verified MRV and credits, pay the registry checkout, retire and observe payout settlement. Verify whether the owner can use an Attest-controlled, debit-capable project account; examples use external owner beneficiary accounts. Receipt of an external owner's payout does not grant Attest authority to debit that account. Confirm whether owner bank restrictions differ in the actual build.

CAP05 Contract details: verify event names/payloads, lookup by transaction/reference/session, available/ledger balances, fee rounding, failed/reversed debit behaviour, virtual-account credit currency inference, bank statuses and name-enquiry/bulk responses. Probe optional split/escrow/refund only after must-haves work.

### Permitted implementation paths

Preferred: a dedicated project virtual account both receives funds and is demonstrably usable for authorised outgoing transfers. The project wallet is the application view of that controlled account plus obligations and reservations.

Alternative: a controlled team account with proven project attribution and per-project subledgers. Use only after documenting how incoming credit identity maps to one project, how shared balance is reserved across projects and how the team can debit it. Do not display a fabricated dedicated bank account. Resolve ambiguous credits through operations before distribution.

If the sandbox only pays external owner accounts that Attest cannot debit, automated onward distribution from those proceeds is blocked. Demonstrate the truthful two-stage path only if a supported funding transfer exists. Otherwise use the virtual-account simulated-inflow journey as a clearly labelled separate sandbox scenario. An admin top-up or simulated credit must not be represented as carbon-sale income or a live bank payment.

## Approved business rules

The owner has approved the following directions. Do not ask for approval of the same direction again; obtain project-specific agreement values and provider facts where needed.

1. Prefer separate project accounts, verify operator/account authority and hold unidentified credits.
2. Trigger financial work from confirmed available funds only. A collection redirect, retirement event, pending transfer or screenshot is insufficient.
3. Apply the approved gross/net basis, evidenced deductions, recipient weights, separate fund and timing. Missing or unsupported terms create a visible hold.
4. Keep household entitlement intact. Charges are separately funded from the operator's available share subject to the agreement. A fee shortage creates an explicit hold, not a hidden reduction to recipients.
5. Pay eligible recipients when permitted; preserve blocked shares rather than silently reallocating them. Snapshot the agreement, roster, weights and calculated amounts.
6. Pause stops new submissions, not already accepted bank transfers. Record incoming money while paused. Resume only the backlog permitted by an explicit effective policy; pre-activation money is never swept silently.
7. Operator withdrawals, if enabled, cannot consume community reservations. Incoming reversals after payouts become reconciliation incidents; no assumed clawback from participants.
8. Verifiers receive masked data at approved geographic precision. WhatsApp requires its own consent/templates and delivery evidence. Hedera stores evidence without participant PII and identifies its actual network.

## Required financial journeys

### Journey A Dedicated account income

An authorised operator completes project/account checks and activates supported agreement rules. A buyer or demo sender credits the dedicated account. The signed event is persisted and acknowledged promptly. The worker confirms attribution, currency and available funds using the event plus bank record/account evidence. It recognises one receipt, calculates obligations once, reserves amounts and queues eligible payments. Outcomes update wallet and dashboard. Recipient notices follow actual payment outcomes; reconciliation and period evidence follow independently.

### Journey B Carbon sale to onward community distribution

The existing carbon service registers the owner, submits MRV and obtains issued credits. The sandbox buyer completes checkout to registry merchant mer_900; GET /payments/{reference}/verify must confirm the payment before retirement. Retirement returns a pending owner payout, not settled income. Link the payout reference to the project and wait for successful transfer evidence. Route proceeds through the CAP04-proven controllable account path before community dispatch.

Source example: NGN 300,000 gross sale less NGN 6,000 registry fee produces NGN 294,000 owner payout. Preserve all three figures. The agreement's gross/net definition decides the benefit basis; the payout value must not automatically replace gross revenue. The registry pays its own NIP payout fee according to the guide; do not charge it again as an operator household-transfer fee.

### Journey C Partial or blocked distribution

Create every recipient/fund entitlement before eligibility filtering. Pay eligible items using the unchanged entitlement amount. Retain blocked money and reason against its owner. Reverification may release that same entitlement through a new controlled attempt, without recomputing other recipients or paying settled items again.

### Journey D Unknown payment late reversal and pause

A timeout means outcome unknown. Keep money protected and query existing references/TSQ before retry. Process late reversals with explicit principal/fee evidence and compensating records. A pause leaves already submitted payments monitored; new receipts are recognised but held. On resume, evaluate each eligible held receipt under the recorded effective policy and original snapshots.

## Functional requirements

### BR01 Provider adapter and durable orchestration

Priority P0. Reuse the existing provider and batch interfaces, but validate them against this PDF and the actual build. Use the common response envelope, x-api-key and UUID idempotency headers. Store provider request IDs and sanitised response evidence. Use a shared per-key rate limiter across instances, reserving budget for status/recovery; honour Retry-After. Do not poll every recipient every few seconds. A 201/202 or accepted bulk response is not proof that every payment settled.

Persist jobs and outbox records atomically with business changes. Use leases, bounded retry, recovery after restart and a dead-letter queue. Callback acknowledgement must occur after durable persistence but before slow provider calls. Timestamp tolerance is five minutes; maintain clock synchronisation. Stable event-ID deduplication must be supplemented by unique business-credit/transfer references.

Acceptance: concurrent callback replay and worker restart create one financial result. A queued job survives a crash. Requests respect the team budget. Callbacks acknowledge within the documented 10-second window. The backend remains functional when no browser is open.

### BR02 Organisation identity and project account readiness

Priority P0. Store organisation, project, provider customer/merchant/account identifiers, account authority, currency and verification evidence. Use merchant onboarding and KYC where applicable; POST /merchants/onboard returns under_review and later merchant.activated. Do not mark ready merely because CAC checks say passed or an account balance is readable. A synthetic individual BVN cannot stand in for legal corporate ownership.

Use /identity/bvn/verify or /identity/nin/verify with actual supplied test details. Store decision fields, masked identifiers and evidence references, not unnecessarily retained full identifiers. Name enquiry resolves accounts; KYC endpoints provide supported tiers/limits. Keep institutional roles separate from customer KYC.

Acceptance: wrong identity/account matches prevent activation. Under-review merchants stay pending. Readiness explains the missing check. The same project account cannot be silently allocated to multiple projects; changing it requires an audited migration of financial context.

For third-party account information accessed through open banking, obtain the documented OTP-authorised consent and required accounts:read, balance:read or transactions:read scope. Respect expiry/revocation and stop reads when consent is withdrawn. This data consent does not authorise debiting the account or demonstrate legal account ownership by itself. Use team-controlled bank-history access only where the provider contract authorises it; do not treat a shared team key as unrestricted participant-account consent.

### BR03 Incoming receipts and project attribution

Priority P0. Normalise virtual-account credits, carbon owner payouts and merchant settlements into one incoming_receipts domain. Include provider, environment, account/project/currency, event IDs, transaction/session identity, amount, confirmation time, provenance and reversal links. Distinguish commercial income, funding/top-up, internal movement and reversal. Not every credit is benefit-bearing revenue.

For checkout, use server-side verification and settlement evidence before treating merchant proceeds as spendable. Partial payment remains pending per the guide; overpayment requires the recorded policy for excess funds. Aggregate merchant settlement and its underlying sales must not both create revenue allocations. Reconcile a sale's gross basis with settlement net cash without double counting.

Acceptance: repeated events with different delivery IDs for the same business credit allocate once. Two credits to the same VA creation reference allocate separately when transaction identities differ. Unmatched/ambiguous credits remain visible with no payout. Account-total balance alone does not identify which credit arrived.

### BR04 Agreement extraction drafts and approval

Priority P1 for editor APIs; approved structured rules are P0 for payouts. Persist source document/version/hash, extraction job/result, quotations/page references, draft revisions and approved versions. A draft saves automatically with optimistic concurrency; saving never activates financial rules. Edits record actor, time, field changes and approval reason. Approval is explicit and effective-dated.

Model percentage using basis points or an explicit exact precision; model gross/net deductions as approved line items. Store household/fund shares separately, verified allocation inputs and receipt-relative deadlines. Separate reporting cadence from release rules. Fail closed on unsupported terms; model-generated extraction cannot authorise money movement.

Acceptance: refresh restores the saved draft; conflicting edits return a revision conflict; approved history remains unchanged. Unsupported source terms identify the actual missing rule instead of converting to equal payments.

### BR05 Community import verification and geography

Priority P1, with payment eligibility P0. Persist CSV import jobs/rows, stable row keys, validation, consent references and per-row results. Reject missing consent; a file upload is not consent. Reuse enrolment identity and account checks. Account correction requires re-verification and applies to future attempts; historical destination details remain intact.

Accept versioned KML points, KML polygons and coordinate CSV points. Store geometry/provenance in PostGIS and link features explicitly to participants/sites. A point-only project may enrol with containment marked unavailable; do not claim its area or invent a polygon. Missing GPS and outside-boundary reasons remain visible under policy. Preserve encrypted offline capture, original time and signed device identity. Add controlled key recovery without retroactively re-signing captures.

Acceptance: partial CSV retries do not duplicate accepted members. Name uncertainty differs from identity failure/provider outage. Point-only input saves successfully. Missing coordinates do not remove members from reporting denominators. Provider verification is explicitly synthetic in the sandbox.

### BR06 Allocation and effective policy

Priority P0. Create one allocation per eligible incoming receipt and approved policy version. Record the effective agreement and roster snapshot, weights/measurements, deductions, operator/community/fund amounts, release conditions and held items. Support multiple receipts/distributions within one reporting period.

Implement equal household and verified-weight allocation with distinct community-fund destinations. Use exact minor units and deterministic largest-remainder allocation with a stable tie-break to preserve totals. Record rounding decisions. Block zero/invalid total weights and missing measurements. Store the full obligation before filtering recipient eligibility.

The sample afforestation commitment needs 20 percent household and 10 percent restoration fund from eligible net revenue, with verified weights and cleared-proceeds timing. Do not distribute 30 percent equally to households. This rule must either work or remain explicitly unsupported; the target release includes implementing it.

Acceptance: total operator/community/fund amounts reconcile to the agreed basis and incoming cash treatment. Concurrent processing produces one allocation. Future rule/roster edits do not alter saved entitlements. Multiple receipts in the same period are accepted and reported correctly.

### BR07 Wallet journals fees and reservations

Priority P0. A wallet is an authoritative application view of controlled banking funds, not a claim that a provider wallet and VA share money. Keep account identifiers, available/ledger balance, asOf time, application reservations, bank holds, operator allocation, community payable, actual charges and reversals distinct.

Use append-only balanced journal entries within each currency. Cash movements and obligation/reservation accounts must have a documented accounting mapping; do not fabricate bank movements for internal allocations. Map reservation consumption to bank pending debits so the same hold is not subtracted twice. Missing bank data is unknown, not zero. Reservations protect funds only against application-authorised actions unless a proven bank restriction exists; disclose external withdrawal risk and reconcile it.

NGN only in this release. Transfer fees follow the documented NIP bands and VAT, validated against actual responses. Name-enquiry and balance data may expose tier/restriction differences. Corporate and recipient/source limits must follow their actual applicable semantics; do not assume a beneficiary's tier alone determines the source account's daily debit allowance.

If operator share cannot fund the fees, hold affected dispatch with a visible shortfall; never trim household entitlement to fit charges. Optional native split/escrow can strengthen controls only after CAP05 succeeds. An application reservation is not bank escrow.

Acceptance: settled principal and actual charges reconcile to bank transaction history. Failed/reversed transfers release/re-reserve principal and fees according to evidence. Operator withdrawals, if offered, cannot consume reserved obligations. Statement totals remain correct across restarts and reversals.

### BR08 Automatic dispatch status and retries

Priority P0. A confirmed receipt under an active policy automatically creates/dispatches eligible items. Reuse bulk batches up to 200 items. For single transfers, use a fresh matching, single-use name_enquiry_ref valid for ten minutes. For bulk auto_name_enquiry, use verified expected names and explicitly chosen strictness. Existing loose name checking is not sufficient evidence of the approved identity policy.

Persist bank batch and item references before network submission. Maintain one entitlement with multiple attempts; new attempt references require a definitively failed prior attempt and renewed checks. Keep Attest deduplication permanently enough for its retention policy; provider 24-hour idempotency must not be the sole safeguard. An expired idempotency window cannot justify a fresh transfer of an uncertain entitlement.

Status query uses GET /transfers/{reference}, bulk status or interbank TSQ with session_id. Handle callbacks arriving before submission responses and after failure notifications. The sandbox can emit failed then reversed: do not ignore reversal evidence merely because the application already marked failed. Financial correction and fee refund must be recorded even if the final user label remains Failed and refunded.

Normalise transaction_id/session_id and completed_at/settled_at using verified documented meanings. Bulk successful items can omit full settlement evidence; retrieve transaction details. The PDF examples do not include stamp_duty in every response; current unconditional evidence requirements need contract review. Do not silently set missing unknown charges to zero. Accept a confirmed zero only under a validated provider tariff/schema rule.

Acceptance: one receipt triggers one payout per entitlement; timeouts query first; concurrent workers cannot overspend shared funds; partial bulk acceptance is handled per item; failed-then-reversed and successful-then-reversed outcomes reconcile correctly.

### BR09 Pause backlog exceptions and financial recovery

Priority P0. Provide audited active/paused/needs-setup states with effective versions. Pause blocks new provider submissions within its committed scope while monitoring in-flight transfers. Default pre-activation/unapproved backlog to review-required; resumption uses an explicit policy authorisation and original receipt evidence, not an unrestricted catch-up sweep.

Exceptions include unidentified credit, unsupported rule, missing deductions/weights, insufficient fees, account restriction, payment unknown, reversal and bank mismatch. Store reason, affected amount, owner, next action and resolution history. Only permitted definitive failures expose retry. Refund/reverse endpoints listed as nice-to-have do not grant authority to recover household money; validate capability and authorised use before exposing them.

Acceptance: paused credits remain accounted for. Resume does not pay settled items again. A post-payout credit reversal creates an incident and shortage, not deletion of the receipt or forced recipient debit. Recovery leaves a complete audit trail.

### BR10 Reconciliation and financial read models

Priority P0. Import paginated /transactions history, per-reference transaction/status history and available/ledger balances. Use overlapping cursor windows and business identifiers to recover missed events without duplicating records. Opening balances, top-ups, sales, charges, reversals and external movements remain distinguishable. Preserve evidence/freshness and unresolved differences.

GET /settlements and POST /reconciliation are merchant-sales services per the guide. Use them for supported merchant collections; do not assume POST /reconciliation is a generic payout-wallet comparison. Build Attest's own account/allocation reconciliation for community payouts.

Expose income received, gross/net basis, operator allocation, obligation, paid, processing, held, failed/unknown, shortfall, charges, available and reserved with precise definitions. Every amount has matching drilldown filters, currency and asOf. Do not sum overlapping metrics. A run whose items all failed is processing-complete, not financially successful.

Acceptance: dashboard/statement/run/map/report reconcile to the same records. Balance differences identify contributing transactions. Pending bank holds are explained. Missing-provider data yields stale/unknown states, not fabricated success.

### BR11 WhatsApp receipts disputes and alerts

Priority P1. No WhatsApp, SMS or messaging-delivery API is documented in the attached banking PDF. Implement messaging through a separate configured adapter; do not invent Forge endpoints. Existing SMS support may remain under its own provider. Store channel opt-in, approved template, event/attempt key, recipient reference, provider ID and delivery outcomes. Fallback is consent/policy controlled.

Send notices from durable enrolment/settlement/dispute events. Secure receipt tokens are scoped, expiring and revocable. Confirmation changes only the acknowledgement record. Disputes retain bank evidence and reasoned responses; developer replies do not independently substantiate/dismiss them. Message failure never reverses payment. Without an external provider, label notifications simulated and expose honest delivery-unavailable status.

Acceptance: callbacks update attempts idempotently; opt-out is respected; duplicate bank events do not send repeated intended notices; expired links reveal no private data. Alert-rule creation differs from successful alert delivery.

### BR12 Verifier maps reports and access

Priority P1. Deliver scoped payment list/map endpoints joined to actual stored geography and selected receipt/run/period. Paid is green, processing amber, failed red and not-started/unknown grey; partial and reversed remain explicit. Distinguish disputes and recipient confirmation from bank outcomes. Cluster counts and totals must match the accessible table; missing-location payments remain counted.

Role permissions apply to every map feature, API, export, stream and job. Default verifier precision is coarsened/community-level with masked participant details. Exact household points require explicit entitlement and access auditing. General location-upload points must not be presented as participant payment locations without an explicit linkage. Public outputs use published privacy-filtered aggregates.

Complete watchlist removal, alert updates and period-filtered exports. Keep private operator balances separate from public published benefit results. Use stable snapshots so period comparisons are meaningful.

Acceptance: cross-role/project requests fail; exports cannot bypass map privacy; current-period colours do not derive from previous-period payments; missing-location recipients remain in totals.

### BR13 Documents evidence and Hedera

Priority P1. Preserve signed period reports, Merkle disclosure proofs, prior-hash links and superseding corrections. Extend from one-run-per-period reports to aggregation over all relevant receipt distributions. A late settlement/reversal produces a linked correction without replacing the original record.

Add a versioned funds-event schema for income recognised, allocation approved, payment settled/reversed and period published/corrected. Persist canonical event hashes and anchor submissions; batch/Merkle anchoring is permitted if per-event inclusion proofs are available. Do not write participant identity, account or exact location to a public ledger.

Hedera is not provided by this sandbox specification. Use a separate configured adapter. The current direct implementation targets testnet; identify network and consensus proof explicitly. Pending/mock anchors are not confirmed immutable evidence. Banking records establish movement of money; anchoring proves the committed record's integrity, not the truth of unsupported financial claims.

Acceptance: valid proofs verify; modified events fail; anchor retries do not create inconsistent records; testnet/mock/pending are labelled; payout processing does not wait on optional ledger availability after bank settlement.

## Data requirements and relationships

Extend existing models and additive PostgreSQL migrations; keep current client compatibility. Table names below are proposed. Important uniqueness rules belong in the database, not only controller code.

| Entity | Required content and invariants |
| --- | --- |
| project_accounts | Organisation/project, provider/environment, receiving and debit account references, currency, authority/readiness and proven capabilities |
| incoming_receipts | Credit identity, source provenance, gross/net cash values, project attribution, confirmation/reversal evidence; unique business credit |
| agreements and drafts | Source file/hash, extraction, revision, approved terms, actor/reason and effective version |
| automation_policies | Agreement link, active/paused scope, fee/hold/backlog rules and activation evidence |
| roster_snapshots | Participant IDs plus effective verification/allocation inputs, weights and version references |
| allocations and items | Receipt, policy/snapshot, entitlement amount/type, fund/member link, hold and release conditions |
| journals and lines | Balanced per-currency cash/obligation/reservation events and compensating links; no destructive financial edits |
| transfers and attempts | Entitlement link, stable provider identifiers, status/evidence, actual charges, retry/reversal history |
| jobs outbox and provider_events | Durable orchestration, leases, attempts, next action and event/business deduplication |
| imports and locations | Per-row idempotency/results; geometry/source version; explicit member/site relationships |
| messages and consent | Channel permission, templates, intended event, attempts and delivery evidence |
| evidence and anchors | Canonical schema version, hash/signature, disclosure/correction chain and network proof |

Use NGN minor units internally and decimal strings on Attest APIs. Convert to the sandbox's expected JSON amount shape only at the adapter boundary with precision/range validation. Avoid floating-point calculations. Preserve sufficient financial history for replay/reconciliation beyond provider idempotency retention. Store timestamps in UTC and identify business-day calculations explicitly.

## Attest API deliverables

These are Attest application endpoints, not Forge bank endpoints. Keep existing endpoints working while adding these typed contracts. All lists require bounded pagination, stable ordering and documented filters. Mutations need role checks, validation, idempotency where relevant, audit and clear conflict handling. Publish OpenAPI or equivalent complete contract examples for frontend use.

| Group | Required operations |
| --- | --- |
| Accounts and wallet | Provision/link/read readiness; wallet summary; paginated transactions; account proof/freshness |
| Incoming receipts | Project receipt list/detail; linked allocations; operations attribution/correction |
| Agreements | Document versions, job status, revisioned draft save, approve, history and effective terms |
| Automation | Read/update draft policy, activate, pause, controlled resume and backlog status |
| Allocations | List/detail, recipient/fund entitlements, held items and reasoned release |
| Payments | Existing run/transfer reads, actual arithmetic, status requery and controlled definitive-failure retry |
| Dashboard and reports | Metric definitions/asOf, filter-linked totals, period aggregation and download status |
| Members and geography | Durable CSV import/status/errors, verification/recheck, point/polygon datasets and privacy-scoped feature reads |
| Messaging and receipts | Consent/preferences, channel history, permitted resend, scoped confirm/dispute and authenticated callbacks |
| Verifier | Payment map/table, permitted evidence, watchlist/alert lifecycle and filtered exports |
| Ledger and operations | Event/proof reads, unmatched receipts, reconciliation differences, jobs/capabilities and audited recovery |

For each job return a stable jobId and statusUrl; retries reuse the same intended operation. Use revision/If-Match semantics for draft/policy edits. Dashboard payloads include environment, currency, asOf, freshness, automationState and metrics with unambiguous statuses. Map/table contracts include the same period/run filter identity and total count/amount, including unmapped records. Frontend must not reconstruct financial truth from partial pages of transfers.

### Suggested application endpoint names

These proposed paths are implementation guidance and are not present in the Forge PDF. Apply the current Attest API envelope and shared contracts, and document final names before frontend integration.

- GET /api/projects/:id/dashboard; GET /api/projects/:id/wallet; GET /api/projects/:id/wallet/transactions.
- GET /api/projects/:id/incoming-receipts; GET /api/incoming-receipts/:id; POST /api/ops/incoming-receipts/:id/attribute.
- GET/PATCH /api/projects/:id/automation-policy; POST /api/projects/:id/automation-policy/activate, /pause and /resume, with reason, expected revision and explicit backlog scope.
- GET /api/projects/:id/allocations; GET /api/allocations/:id; POST /api/allocation-items/:id/release with authorised verification/release evidence.
- GET/PATCH /api/projects/:id/commitment-draft; GET /api/projects/:id/commitment-history; POST /api/projects/:id/commitment-draft/approve.
- POST /api/projects/:id/participant-imports; GET /api/participant-imports/:id; GET /api/participant-imports/:id/errors.
- POST/GET /api/projects/:id/location-datasets; GET /api/location-datasets/:id/features.
- GET /api/projects/:id/messages; GET /api/verifier/projects/:id/payment-map and /payments.
- GET /api/projects/:id/ledger-events; GET /api/ledger-events/:id/proof; GET /api/jobs/:id scoped to the requesting role/project.

Example allocation response fields: id, projectId, incomingReceiptId, policyVersionId, agreementVersionId, rosterSnapshotId, currency, basisAmount, householdObligation, fundObligation, operatorAllocation, paidAmount, processingAmount, heldAmount, outstandingAmount, estimatedCharges, actualCharges, state, holdReasons and asOf. Monetary fields are decimal strings. Detail includes per-item entitlement/attempt links; summary totals do not replace an auditable item list. Incoming receipt reads expose transaction/session identity and attribution evidence only to permitted roles, with sensitive counterparty fields masked.

## Security and operational requirements

Keep team keys, callback secrets, signing keys and evidence-encryption keys on the server. Restrict internal bank access to authorised adapter operations. Enforce organisation/project ownership on workers as well as HTTP routes. Encrypt sensitive evidence and minimise identity retention. Sanitise provider failures before showing them to users. Separate application audit history from public blockchain proof.

Monitor receipt-to-allocation delay, oldest unallocated receipt, transfer unknown age, worker backlog, bank rate budget, duplicate events, reservation mismatches, statement differences, message failures and anchor backlog. Provisional internal acceptance targets: persist valid callbacks within 5 seconds under expected load, staying inside the provider's 10-second requirement; enqueue ready allocations within 30 seconds of confirmed receipt processing under normal budget conditions. These are Attest targets, not promises from the PDF. Publish a load test and adjust operational capacity explicitly rather than hiding backlog.

Run a durable worker inside reachable infrastructure. Vercel alone must not be assumed to supply continuous processing or internal cluster access. Document scheduler/worker restart and dead-letter recovery. Old jobs must retain schema versions or have migration handling. Use feature flags and a project-level emergency pause. Bank API admin reset/fund/forced outcomes are isolated test controls and must not be available as ordinary operator financial actions.

## Acceptance test matrix

Use synthetic sandbox fixtures and isolated scenarios. Default settlement expectations in the guide are about two seconds intra, five seconds interbank, sixty seconds MRV/merchant activation as stated; poll actual state and respect throttling, rather than sleeping and declaring success. Track reference/session IDs and full final evidence for every financial case.

| Test | Input or scenario | Required result |
| --- | --- | --- |
| AT01 | Two different credits to one dedicated account | Two receipts/distributions; shared VA reference does not collapse them |
| AT02 | Replay same event; distinct event IDs for same credit | One income recognition and one entitlement set |
| AT03 | Same idempotency key/body; changed body | Replay handled; conflict cannot create another payment |
| AT04 | Restart after allocation commit and after bank acceptance | Jobs resume without a duplicate debit |
| AT05 | Missing project/policy/basis/weights | Recorded hold with amount/reason; no guessed allocation |
| AT06 | Multiple receipts in one reporting period | All distribute; period report aggregates them once |
| AT07 | Sample net split and non-divisible weights | Exact household/fund/operator amounts; deterministic kobo remainder |
| AT08 | Frozen beneficiary 0123987098 or dormant 0987654399 | Held entitlement; eligible others proceed under policy |
| AT09 | PND beneficiary versus PND source | Can-receive and cannot-send semantics follow actual contract |
| AT10 | Enquiry expired/mismatched/used | No payout; refresh only for a new verified eligible attempt |
| AT11 | 201 members or more | Batches no larger than 200; all item outcomes retained |
| AT12 | Trigger .01 amount | Insufficient funds recorded without reduced recipient entitlement |
| AT13 | Trigger .02 amount | Timeout queried; failed/reversed evidence reconciles; no fresh blind payment |
| AT14 | Trigger .03 amount | Long pending remains processing until actual success |
| AT15 | Interbank trigger .04 | Late reversal creates compensation/correction without losing original settlement |
| AT16 | Trigger .05 or webhook replay tool | Missed/retried delivery recovered and deduplicated |
| AT17 | Bank unavailable/429 | Bounded queue/backoff and status evidence; no fabricated failure/success |
| AT18 | Successful checkout not yet settled | No spending of unavailable proceeds; partial/overpaid handled explicitly |
| AT19 | Carbon retirement pending then owner payout success | Only verified controllable proceeds trigger onward distribution |
| AT20 | Pause, credit, resume and old backlog | Explicit policy determines dispatch; already paid items never repeat |
| AT21 | Insufficient operator fees/external withdrawal | Reservation/shortfall visible; no community share silently spent |
| AT22 | Point-only KML, CSV partial retry and missing GPS | Valid locations/members persist; errors and denominators remain honest |
| AT23 | Draft refresh/concurrent edits and unsupported terms | Saved draft restored; conflict/block surfaced; approval remains explicit |
| AT24 | No WhatsApp/Hedera credentials | Honest unavailable/simulated states; bank outcomes unchanged |
| AT25 | Verifier/export cross-project and exact-location request | Scope enforced; no PII leakage |
| AT26 | More than 100 bank history entries | Full pagination/recovery; totals reconcile |
| AT27 | Failure notification followed by reversal | Refund/fee evidence recorded despite prior failed state |
| AT28 | Duplicate processing after 24 hours | Attest deduplication still prevents repeat transfer |

Use exact trigger endings only in intentional tests. Normal tests can use .00 amounts to avoid accidental forced outcomes. Do not alter real agreement rounding to avoid triggers; label sandbox-triggered behaviours and override only through isolated documented test controls. Prefer non-destructive fixture creation. Coordinate /admin/reset because it restores the calling team's shared accounts and records.

## Existing backend changes required

The current repository has useful provider, signature, batching, worker and reporting foundations. Extend them, retaining compatibility and unfinished local fixes under review.

- app.ts and service.ts: incoming credits currently record funding/reconciliation, not automatic allocations. Add receipt normalisation, policy dispatch and attribution exceptions.
- service.ts: one run per project/period and run-centred period closure must become receipt distributions with period-level aggregation. Snapshot complete entitlement inputs, not only member IDs.
- arithmetic/preflight: replace equal-only logic for complex agreements and charge-driven household reductions. Add explicit operator fee funding and held entitlements.
- applyTransfer/batches: validate actual sandbox response fields and failed-then-reversed transitions. Preserve stable references, query uncertain outcomes and maintain attempt evidence.
- models/store/migrations: add account capability, receipt, allocation, policy, journals, reservations, import/draft/message/evidence entities and uniqueness constraints.
- providers/bank: retain sandbox identity, rate limits and exact envelopes. Extend transactions/KYC/merchant support; messaging/Hedera remain separate adapters. Do not assume optional services are available.
- contracts/API clients: publish typed read models for dashboard/wallet/maps and complete job/revision contracts, with compatibility notes for existing pages.

## Delivery packages and completion definition

Package 1 Capability report and contracts: prove network/account/carbon paths, document actual-build differences and deliver typed interfaces plus database design. Exit: a real sandbox end-to-end banking path is identified or its specific blocker demonstrated.

Package 2 Financial foundation: project accounts, incoming receipts, transaction import, wallet journals/reservations and fee semantics. Exit: two credits and replay/reversal cases reconcile with bank evidence.

Package 3 Rules and automatic execution: versioned agreements/policies, weights/fund, snapshots, outbox, batching, pause/backlog and recovery. Exit: receipt-to-payout automation passes restart, timeout and partial-failure tests without per-run operator action.

Package 4 Full frontend contracts: draft/history, CSV/identity/geography, wallet/dashboard, verifier maps, messaging and evidence endpoints. Exit: frontend can implement every specified screen and overlay without inventing financial rules or receiving private fields unnecessarily.

Package 5 Evidence and release: period aggregation, Hedera proof/corrections, operations/admin recovery, monitoring, migration/backfill and controlled sandbox walkthrough. Exit: acceptance matrix passes with documented genuine limitations.

Deliver migrations/backfill procedures, API contract with examples and user-friendly errors, event/state diagrams, fixtures, automated test results, capability matrix, deployment/worker configuration, secret names without values and an operations runbook. Commit by completed feature on mark/production. Stage compatible schema/backend before dependent frontend rollout. Preserve financial history; rollback pauses new dispatch and reconciles in-flight items rather than deleting journals or retrying uncertain transfers.

A requirement is complete only when data persistence, authorisation, UI-facing contract, audit/recovery behaviour and acceptance evidence agree. A simulated local bank passing tests does not substitute for the team's actual sandbox. A successful sandbox demonstration does not establish production banking readiness.

## Limitations and dependencies register

| Item | Known position | Required handling |
| --- | --- | --- |
| Participant Platform Guide section 5.8 | Referenced as overriding authority; not supplied here | Obtain and attach actual-build deviations before sign-off |
| Internal network access | Bank reachable from team namespaces only | Deploy reachable adapter/worker or approved restricted bridge |
| VA as debit source | Not proved by receive/create examples | CAP02 required; document supported alternative or blocker |
| Wallet to bank cash-out | Not documented in provided endpoints | Do not invent; bank account may back the wallet UI instead |
| Carbon owner account control | Examples pay external beneficiaries | CAP04; never infer debit authority from receipt visibility |
| Corporate ownership | Merchant checks documented; individual VA sample | Validate appropriate operator model; label demo limitation |
| Split escrow refunds | Listed nice-to-have, may differ by build | Probe and feature-gate; use application allocations for core |
| Bank funds reservation | No general lien/hold endpoint established | Application control plus reconciliation; do not claim bank ringfencing |
| WhatsApp and Hedera | Outside the banking document | Separate credentials/adapters; truthful simulated states until configured |
| Test data and rate budget | Synthetic fixed cast; team key and limits | Synthetic fixtures, shared throttling and no real identity claims |

## Source reference

Forge 2026 Sandbox API Specification v2 Participant Edition, 9 November 2026, 31 pages. Primary supporting sections: common conventions and webhooks pages 1 to 3; transfers pages 5 to 11; collections pages 11 to 13; accounts/wallets pages 14 to 16; transaction history/settlement/reconciliation pages 16 to 18; identity/merchant onboarding pages 18 to 20; consented open banking pages 21 to 22; carbon registry pages 24 to 26; optional split/escrow/refunds pages 26 to 28; errors/triggers/events/admin tools pages 29 to 31.

Attest product requirements incorporate the owner's approved wallet, automatic distribution, points, WhatsApp, verifier-map, document-history and CSV directions. Repository alignment is based on source review dated 12 November 2026. No live provider probes were executed to prepare this PRD; CAP01 to CAP05 are implementation deliverables, not completed findings.
