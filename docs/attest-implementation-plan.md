# Attest Implementation Plan

Date: 12 November 2026

Execution sequencing is now consolidated in [the unified frontend and backend build plan](attest-unified-build-plan.md). Use that plan for paired feature delivery; this document remains the earlier detailed phase reference.

## Outcome

Deliver the supplied Product Interface and Backend Specification through tested feature increments on mark/production. Confirmed income attributed to a project must automatically produce the correct community allocations and eligible payouts under a previously approved policy. Operators monitor earnings, funds and exceptions; participants receive receipts; verifiers inspect consistent payment evidence on maps and reports.

This is an implementation plan, not a record of completed implementation. Proposed endpoints and entities in the specification remain subject to shared-contract design. Existing frontend and Fastify services are extended rather than replaced. Public project records remain open; workspaces remain protected.

## Delivery rules

- Preserve the current working tree. It contains unfinished fixes and tests from the earlier end-to-end review. Review and validate those changes before assigning them to feature commits; do not assume they are deployed.
- Stay on mark/production and commit each completed, verified feature separately. Deploy compatible migrations and backend contracts before exposing dependent frontend actions.
- Read the installed Next.js guides before changing relevant routing, server/client boundaries or page conventions, as required by AGENTS.md.
- Reuse current components, green design tokens, API adapters, exact money utilities, provider interfaces, batch processing and worker infrastructure.
- Default new automatic financial behaviour to off until its project policy and prerequisites are ready. Simulated and live provider environments must be visibly distinct.
- Use feature flags for automatic distributions, point-only projects, WhatsApp and verifier payment maps. Flags complement server authorisation; they do not replace it.
- Every feature includes typed contracts, ownership checks, audit behaviour, migration strategy where needed, UI states and meaningful tests.

## Dependencies and delivery order

Critical path: baseline and decisions → shared contracts and financial schema → confirmed receipt attribution → approved policy and allocations → automatic transfer execution → reconciliation and evidence → controlled live release.

Readiness work on geography, documents and community members begins after shared contracts and must finish before activating a real project. Shared UI primitives begin with the contract foundation. Dashboard screens follow authoritative wallet metrics; verifier payment maps follow both geographic datasets and payment outcomes. WhatsApp follows durable business events. Hedera proofs follow a defined, stable evidence schema.

| Phase | Main deliverable | Depends on | Completion milestone |
| --- | --- | --- | --- |
| 0 | Verified baseline and decision register | None | Existing changes understood; release gaps recorded |
| 1 | Contracts, migrations and shared UI foundation | 0 | API and state definitions agreed and tested |
| 2 | Project account, wallet and incoming receipts | 1 and bank contract | One confirmed credit produces one reconciled receipt |
| 3 | Geography, document and participant readiness | 1 | A real project can reach payment readiness |
| 4 | Versioned policy and allocation engine | 2 and relevant phase 3 data | Correct, repeatable entitlement calculations |
| 5 | Automatic payout orchestration and recovery | 4 | Income triggers payouts without per-run approval |
| 6 | Operator dashboard, wallet and distribution UI | 2 and 5 | Every figure opens matching underlying records |
| 7 | WhatsApp, receipts and feedback | 5 | Confirmed events create traceable messages and receipts |
| 8 | Verifier maps, reporting and ledger proofs | 3, 5 and 6 | Role-safe results reconcile across all views |
| 9 | Operations, administration and production release | All applicable phases | End-to-end and provider acceptance gates pass |

## Phase 0 Establish the baseline and policy decisions

### Work

1. Inventory current routes, contracts, database migrations, workers, provider modes and deployed revisions. Separate source support from live-provider readiness.
2. Review the outstanding local fixes, especially unsupported commitments, document processing, email feedback, dispute status/history, invitations and responsive layouts. Run the appropriate existing tests before treating them as the baseline.
3. Create a page-to-API coverage checklist from the specification, including every drawer and modal, and classify each as reuse, extend or new.
4. Record provider capabilities and unresolved product choices with owners. Product owner decides business policy; banking integration owner confirms actual bank behaviour; implementation translates both into contracts and tests.

### Approved directions and provider dependencies

The owner approved all recommended directions on 12 November 2026. Treat the following as implementation decisions, not questions to ask again:

- Prefer a dedicated project account or virtual account where supported. Verify operator ownership. Unmatched credits remain Needs identification and cannot trigger payouts. Confirm the supported currency with the banking provider before live activation; do not assume cross-currency support.
- Trigger allocations only from authenticated, confirmed available funds, with stable bank transaction identification and deduplication. Query uncertain outcomes. Banking confirmation, callback and reversal details must be checked against the actual provider contract.
- Store gross/net basis, allowable evidenced deductions, allocation weights, separate community-fund destination and timing in the approved agreement. Missing required inputs hold the affected allocation rather than being guessed.
- Charge fees separately from household entitlements, using the operator's available share subject to the agreement. Pay eligible recipients under the approved partial-distribution policy and preserve blocked recipients' shares. Snapshot the roster and rules; later changes do not rewrite past allocations.
- During a pause, record incoming money and obligations but stop new payout submissions. Resume only the backlog covered by an explicit approved policy. Operator withdrawals exclude community reservations. Post-payout incoming reversals become reconciliation exceptions, not assumed automatic recovery from recipients. Transfers already accepted by the bank cannot be recalled by pausing the app.
- Verifiers see masked payment outcomes at approved geographic precision; exact household locations require specific entitlement. WhatsApp uses recorded consent, approved templates and provider delivery evidence. SMS fallback follows consent/policy. Hedera records the approved evidence scope without PII, shows its actual network and distinguishes report anchoring from event-level funds evidence.

Provider-supported account provisioning, actual bank-event semantics, organisation-specific agreement values, WhatsApp templates/fallback permissions and the final production Hedera network remain configuration/integration dependencies. Approval of these directions does not invent missing provider capabilities or select unprovided financial terms.

Do not block unrelated UI and schema work while external details are pending. Keep unsupported real-money paths disabled and show the specific readiness blocker. Do not implement financial assumptions silently.

### Acceptance

Baseline test results and remaining failures are recorded. The coverage checklist includes every specified workspace. Provider-independent work is separated from external launch dependencies. No existing local changes are lost.

## Phase 1 Contracts schemas and shared UI foundation

### Backend

Define shared money, currency, timestamp, pagination, job, policy, receipt, allocation and payment-state contracts in backend/packages/contracts/src/index.ts. Extend models and persistence with additive migrations after the current 004 migration. Add project_accounts, incoming_receipts, automation_policies, allocations/items, wallet journals/lines and durable outbox structures; preserve existing recipient receipt-token semantics.

Define exact minor-unit arithmetic, uniqueness constraints, journal balance invariants, ownership indexes and effective-version rules. Specify authenticated callback normalisation independently of provider-specific field names. Use a compatible transition strategy for existing run APIs and historical records.

### Frontend

Create or extend shared PageHeader, metric cards, status badges, filters, table/card layouts, drawers, confirmation dialogs, job progress, saved-state indicators and empty/error states. Reuse existing equivalents before introducing new names/components. Establish project/period URL state without including sensitive data.

Add keyboard focus management, reduced-motion behaviour, accessible status announcements and mobile full-screen drawers. Establish a page inventory and permission matrix for protected routes, mutations, exports and event streams.

### Acceptance

Contracts compile across both services. Migrations work against a populated test database. Every financial state has a readable label. Shared overlays support keyboard/mobile use. Cross-organisation access fails server-side. No balance is represented as zero when unavailable.

## Phase 2 Project accounts wallet and incoming receipts

### Backend

Extend the bank adapter only against a confirmed Access Bank or contracted integration specification. Implement account readiness, approved source-account binding, confirmed balance reads and statement import/query. Keep provider identifiers separate from application identifiers.

Authenticate and deduplicate credit events. Attribute each receipt to one project/currency, query uncertain credits and persist unmatched money as an operations exception. Introduce balanced wallet entries and reservations, with compensating reversal entries instead of rewriting history.

Implement wallet summary, paginated statement and incoming-receipt endpoints. Expose as-of time, freshness and reconciliation differences. Extend existing funding/reconciliation contracts compatibly.

### UI

Deliver setup account-readiness step, wallet page, account drawer, statement filters, incoming receipt detail and unmatched-income operations list. Show Available, Reserved, Received, Paid, Charges and Reversals with precise definitions.

### Acceptance

A duplicated credit callback creates one receipt and one journal effect. Wrong project/currency cannot allocate money. Unconfirmed credits cannot become earnings. Statement totals reconcile against provider evidence. Incoming reversals remain traceable. Unmatched money has a visible owner/action.

## Phase 3 Complete project and participant readiness

### Geography

Implement versioned location datasets/features for KML points, KML polygons and coordinate CSV points. Reuse PostGIS and Leaflet/OpenStreetMap. Add preview, validation, source hashes, feature types and explicit participant/site links. Adjust boundary-required enrolment rules so point-only projects can proceed under an explicit geographic-check policy.

Deliver geography setup, dataset/feature drawers and operator map layers. Keep missing locations and unavailable containment checks visible. The supplied point-only KML is an acceptance fixture; it must not be converted into an invented polygon.

### Documents

Persist original file versions and extraction references. Implement revisioned review drafts, debounced autosave, conflict handling, history comparison and explicit agreement approval. Reuse current extraction job/status and superseding commitment records. Save/restore setup progress and validate each Continue action.

Represent separate household/fund terms, calculation basis and timing accurately. Preserve the existing unsupported-term guard until the allocation engine handles the corresponding rule. The sample PDF is a complex-rule fixture, not an equal-payment example.

### Community members and agents

Implement durable CSV import jobs, mapping/preview, per-row validation, consent references, stable row keys and partial-success reporting. Reuse enrolment checks. Add visible identity/account/name/duplicate/restriction results, controlled review, recheck and verified account-change workflows. Do not infer consent from an upload.

Complete agent invitation/activation/suspension and define supported lost-device recovery/key rotation. Preserve encrypted field capture, original timestamps, offline queue and accepted-item deduplication. Deliver member/detail drawers, status dialogs, enrolment progress and CSV results screens.

### Acceptance

Points and polygons save independently. Refresh restores saved document/setup drafts. Concurrent edits do not silently overwrite. Partial CSV retries do not duplicate accepted members. Provider outage differs from identity mismatch. Historical transfers retain their original destination after account correction. Offline captures survive reconnect and synchronise once.

## Phase 4 Approved automation policy and allocation engine

### Backend

Implement effective-dated policy draft/approve/activate/pause operations with reasons and audit entries. Link each policy to an approved agreement version. Snapshot relevant roster and verified allocation inputs per incoming receipt.

Support equal household allocation and the specified weighted method, plus a distinct community-fund destination. Validate area/survival inputs and define auditable rounding with exact sum preservation. Separate gross/net basis, approved deductions, payment deadlines, reporting cadence and release conditions. Missing inputs create a precise hold.

Persist allocations and entitlement items separately from transfer attempts. Keep blocked members' shares reserved/owed instead of reallocating them. Add policy and allocation read endpoints and readiness evaluation.

### UI

Complete commitment term fields, automation activation summary/modal, pause/change modal, policy history and allocation breakdown. Show what future incoming funds will trigger. The setup checklist links directly to missing prerequisites.

### Acceptance

Same receipt, rules and roster produce the same allocations. Duplicate/concurrent processing creates one distribution. The sample 20 percent household and 10 percent fund split is preserved using eligible net revenue and verified weights. Missing basis/weights block the affected distribution clearly. Policy changes do not rewrite old receipts. Activation/resume behaviour for old held funds follows the explicit approved policy.

## Phase 5 Automatic payout execution and recovery

### Backend

Connect confirmed receipt processing to allocation and outbox creation transactionally. Reuse existing run preflight, batch submission, transfer outcomes and requery/retry services. Automatically submit eligible payments under the active setup approval; remove normal dependence on the operator clicking Execute.

Use stable keys per entitlement/payment attempt, atomic reservation updates and durable worker leases/retries. Distinguish definite failure, pending and unknown network outcome. Handle out-of-order/duplicate callbacks, partial batches, reversals and worker restarts. Add inspectable dead-letter/attention states and provider-independent recovery tools.

### UI

Replace the normal New run emphasis with automatic distribution monitoring. Build run overview/recipients/events/evidence tabs, transfer drawers and narrowly scoped retry review. Show held, processing, failed, unknown and reversed amounts separately. Pause affects future eligible submissions, not transfers already accepted by the bank.

### Acceptance

A confirmed attributed receipt causes eligible payouts with no per-run approval. Closing the browser does not stop processing. Replaying callbacks and restarting workers never duplicates money movement. Timeouts requery existing transfers before retry. Failed members retain unpaid entitlements. Fee/funding shortfalls do not overdraw or silently reduce obligations.

## Phase 6 Operator dashboard and complete workspace UI

### Backend

Implement dashboard aggregates over authoritative wallet, receipt, allocation and transfer records. Define date semantics and same-as-of reconciliation across metrics. Provide drilldown filters and bounded lists. Do not count pending payments as paid or double-subtract bank holds/reservations.

### UI

Deliver overview earnings/funds cards, income-to-payment flow, recent income/distributions, readiness checklist, exceptions and map preview. Finish projects, wallet, distributions, members, agents, documents, messages navigation, disputes, reports and supported settings. Keep project/period context consistent.

Implement every related drawer/modal in the specification, including account details, incoming receipt, participant, transfer, version comparison, invitations, policy changes, attribution correction, retry, unsaved changes and expired session. Every primary action must call a real authorised operation; unsupported capabilities remain explicitly unavailable.

### Acceptance

Each card opens records that reconcile to its figure. Required mobile/tablet/desktop widths work without page overflow. Money pages show freshness. All multi-step flows preserve data and provide Back/Continue. Loading, error, empty, stale and permission states are covered. No false save, delivery or payment success is displayed.

## Phase 7 WhatsApp participant receipts and feedback

### Backend

Add a channel-aware WhatsApp adapter, approved templates, consent handling, authenticated delivery callbacks and idempotent message attempts. Trigger messages from persisted enrolment/payment/dispute events, not UI clicks. Implement permitted fallback/resend and message history APIs. Keep expiry/revocation for scoped receipt links.

### UI

Deliver messages list/delivery drawer, permitted resend dialog, participant receipt/confirm/complaint states and dispute response history. Separate Sent/Delivered/Read from bank payment outcomes. Alerts for operators/verifiers use authorised recipients and permitted templates.

### Acceptance

One settled transfer produces one intended notice despite duplicate callbacks. Opted-out recipients are handled according to policy. Delivery failure does not undo payment. Expired links reveal no private data. Repeated confirmations/complaints are safe, and developer replies do not resolve complaints without the required authority.

## Phase 8 Verifier maps reporting and ledger evidence

### Backend

Implement role-scoped payment-map/table endpoints joining recorded geometry with the selected period/run. Apply server-side location precision and participant masking. Keep missing-coordinate records in totals. Complete watchlist removal, alert management and supported exports.

Define funds-event evidence payloads and append-only correction links. Extend existing signing/attestation/Hedera foundations for the approved event scope; keep testnet/mainnet/demonstration states distinct. Anchoring failure must not alter confirmed bank-payment status. Add proof history and scoped verification reads.

### UI

Deliver verifier project map/table with paid green, processing amber, failed red and unknown/not-started grey; explicit partial/reversed labels and dispute badges. Include point/cluster evidence drawers, compare/watchlist/alerts/exports, operator ledger/proofs and public period-record corrections.

### Acceptance

Map, table, wallet and period report use consistent records and definitions. No old-period payment colours the current period incorrectly. Private information cannot leak via map payloads or exports. Actual proof checks determine verification status. Original records remain available after corrections; no participant PII is anchored.

## Phase 9 Operations administration and release

### Complete operational pages

Finish incoming attribution exceptions, transfer exceptions, reconciliation differences, provider/job health, investigation cases and supported account-control actions. Finish organisation/source-account approvals, institution access, extraction review, registry history, chain integrity and escalation workflows. Add reasoned decisions and scoped audit trails. A queued provider action is never displayed as completed.

### Test and release gates

1. Run feature-level tests as each increment lands: exact money/allocation tests; API permission/contract tests; database transaction/uniqueness tests; job restart/replay tests; relevant component/browser tests.
2. Before release, run frontend tests/lint/type check/build and backend tests/check/build; run the integrated contract checks and database migrations against staging. Review any pre-existing failures separately from new regressions.
3. Execute the full browser journey for operator, agent, participant, verifier, operations, administrator and public visitor at 320, 375, 768, 1024 and 1440 px. Include keyboard, reduced motion, slow responses, loading/empty/error states and long content.
4. Use bank sandbox fixtures for duplicate credits, unknown outcomes, partial failures, insufficient charges, reversals and cross-project attribution. Validate WhatsApp callback/delivery handling and Hedera verification with their actual selected test environments.
5. Back up before production migrations. Deploy additive schema and compatible backend first, then frontend with automation disabled. Verify worker scheduling, secrets, callbacks, metrics and alerts before activating one approved pilot project.
6. Run a controlled, authorised live pilot with agreed limits and verified recipients. Reconcile receipt, allocation, transfers, balance and charges before widening activation. Live provider success cannot be inferred from mocks.
7. If release health fails, pause new automation, preserve jobs and evidence, reconcile in-flight transfers and roll back only compatible application changes. Do not erase journals or re-execute uncertain transfers. Use forward-fix/compensating migrations for irreversible data changes.

### Operational monitoring

Track unallocated receipts, allocation holds, oldest pending/unknown transfer, worker lag/retries, duplicate events, unreconciled amounts, provider availability, message failures and anchor backlog. Every alert links to a responsible queue and a recovery procedure. Avoid logging identity or bank secrets.

## Feature commit sequence

Suggested commit-sized packages, each with matching tests and necessary contracts/UI:

1. Baseline verified E2E fixes, separated by feature after review.
2. Domain contracts, statuses and additive financial migrations.
3. Durable receipt attribution and wallet accounting.
4. Wallet API and operator funding screens.
5. Point/polygon datasets and map preview.
6. Document drafts, autosave and version history.
7. CSV jobs and identity/account review.
8. Policy lifecycle and weighted/fund allocation.
9. Durable automatic dispatch and recovery.
10. Earnings dashboard and automatic distribution views.
11. WhatsApp delivery and participant feedback.
12. Verifier payment maps and management/export controls.
13. Funds evidence, Hedera proofs and corrections.
14. Operations/admin completion and production acceptance.

Large packages should be split into backward-compatible migrations/contracts, backend behaviour and UI commits where necessary. No commit should claim an external provider is live when only simulated tests passed.

## Definition of completion

A feature is complete when its authorised backend operation, persisted data/history, UI progression, required overlays, error/recovery states, accessibility/responsiveness and meaningful tests agree. A phase is complete when its acceptance milestone passes in the integrated environment. Production readiness additionally requires live-provider validation, durable workers, reconciliation, monitoring and recovery procedures.

No fixed calendar promise is made at this planning stage. After phase 0, estimate each package against the verified baseline and available bank/WhatsApp/Hedera access. Provider onboarding lead time must be tracked separately from implementation effort.
