# Attest Backend Alignment Review

Date: 12 November 2026

## Conclusion

The owner has approved all recommended directions in the implementation plan. The inspected backend provides controlled payment-run processing, bank event verification, basic funding reconciliation, recipient checks and signed period evidence. It does not yet implement the complete incoming-income-to-automatic-distribution operating model.

This is a source-code review of the current local repository, including unfinished local changes. It is not a live-bank acceptance test or a claim that these changes are deployed. No application behaviour was changed during this review. The implementation plan has been updated with the approved directions.

## One Project accounts and attribution

Status: partial.

POST /api/admin/projects/:id/account links a ten-digit account to a project. A lock and source-account token prevent that account being assigned to another project through this route. The handler reads available balance and records an opening balance. Credit events are matched by account_number or source_account against the linked project account.

This is compatible with separate accounts per project, but it does not provision a new operator project account or demonstrate ownership verification. Reading a balance is not proof of approved operator ownership. Existing wallet/virtual-account creation in enrolment is for participants, not operator project wallets. No unmatched-income queue is created when a credit matches no project. Project receipt currency checks are not implemented in this event handler.

Required: account lifecycle/ownership checks, confirmed supported currency, durable incoming receipts, unmatched-credit queue and controlled attribution corrections. Account relinking must also preserve financial baselines/history rather than casually resetting the opening balance.

Evidence: backend/src/app.ts lines 138 to 141; backend/src/service.ts lines 447 to 449; participant wallet creation at service.ts lines 87 to 94.

## Two Confirmed income and automatic payouts

Status: signed callbacks and payment evidence exist; receipt-triggered payouts are absent.

The bank callback uses an HMAC signature over timestamp plus original request body, a five-minute timestamp window and constant-time signature comparison. It persists the event and its processing job transactionally under an event-ID lock. Repeated event IDs are ignored. Transfer settlement requires amount, charges, session reference and settlement time; incomplete settlement results are queried for fuller evidence. Uncertain batch requests are not immediately converted into confirmed failures.

However, virtual_account.credited currently writes a funding notification and queues reconciliation. settlement.completed queues reconciliation. Neither branch creates an allocation/run nor starts payouts. The credit branch does not query availability or validate currency/status against a richer incoming-receipt model. Deduplication is by provider event ID, not an explicit unique underlying credit transaction: two distinct events describing the same credit need additional protection.

Runs are created through POST /api/projects/:id/runs, then preflighted and executed through separate operator APIs. createRun rejects a second run for the same project and reporting period. This conflicts with processing several project income receipts in the same period. Period attestation/closure is also run-centred, so changing that uniqueness rule alone is insufficient; reporting must aggregate the period's multiple distributions correctly.

Required: confirmed receipt state machine, bank-transaction uniqueness, policy lookup, atomic allocation/reservation/outbox creation and automatic execution. Retain the existing transfer-evidence and requery safeguards. Confirm exact event meanings and authentication with the real banking contract rather than assuming this adapter proves live compatibility.

Evidence: backend/src/app.ts lines 239 to 245 and 344 to 349; backend/src/core.ts line 80; backend/src/service.ts lines 124 to 143 and 447 to 449; backend/src/batches.ts.

## Three Calculation rules and timing

Status: simple percentage and equal-share calculation; complex allocation incomplete.

The backend supports percentage commitments with gross/net basis. Net revenue is operator-declared, constrained to be no greater than gross; approved deduction items and their evidence are not modelled. The required amount is calculated with exact integer money arithmetic, then divided equally among the roster. It does not compute verified-area/survival weights or a separate community-restoration-fund transfer. Equal-share division also needs an explicit remainder policy to preserve the full entitlement total.

The current local unsupported-term guard recognises some household/fund splits, weighted allocations and cleared-proceeds deadlines and blocks acceptance/run creation. This is a useful protection, not an implementation of those terms; its text-pattern detection is not a comprehensive financial rule model.

Payment schedule descriptions and reporting cadence can be stored. Run deadlines are derived from calendar reporting periods. Descriptive milestone data does not establish a milestone-release engine, and a deadline relative to receipt of cleared proceeds is not implemented.

Required: explicit versioned allocation types, evidenced net deductions, weighted inputs, fund destination, exact rounding and separate release/deadline/reporting rules. The supplied sample document must remain blocked until its actual terms are supported.

Evidence: backend/src/service.ts lines 124 to 158; backend/src/period.ts; backend/src/commitment-review.ts.

## Four Fees eligible recipients and held money

Status: some useful safeguards; reservation and fee policy gaps.

The backend estimates fees, VAT and stamp duty. Preflight checks charges and bank available balance. Transfer settlement verifies total debit equals amount plus charges. Exclusions retain recipients in the roster/reporting denominator; eligible recipients can proceed after recorded acknowledgement. There is no automatic redistribution of excluded shares in the equal-share execution loop.

However, when declared funding is below the obligation, arithmetic can reduce per-household amounts further to fit transfer charges within that smaller budget. This is not the approved general rule that household entitlements remain intact and fees are covered separately from the operator's share. There is no explicit operator/community split or double-entry reservation ledger. A blocked member remains visible but does not have a durable, separately tracked held entitlement with its own release workflow.

Roster participant IDs and commitment IDs are stored on the run. Eligibility and participant information are reread later, so this is not a complete immutable snapshot of allocation inputs/account evidence. Current preflight also requires the enrolment notice to be marked sent, while that status reflects provider acceptance rather than confirmed handset delivery; the future WhatsApp readiness policy must be explicit about which state is required.

Required: preserve entitlement amounts, fund fees separately, reserve held money, represent release/retry independently and snapshot the effective financial inputs. Apply provider limits from a confirmed capability/policy source rather than treating current hard-coded tiers as proof of bank rules.

Evidence: backend/src/service.ts lines 146 to 203, 277 to 284 and 426 to 434; backend/src/providers.ts estimateCharges.

## Five Pause resume withdrawals and reversals

Status: transfer recovery exists; automation lifecycle and funds-level reversal handling absent.

Existing runs can be cancelled only in supported pre-execution states. Bank batches have durable intent records, stable keys, unknown outcomes and requery/retry handling. Retry is limited to certain definitive failure classes and checks the provider unless the request was explicitly rejected. Transfer reversals trigger a correction job and can substantiate related disputes.

There is no project automation-policy activation/pause/resume model, no defined processing of receipts received during a pause or before activation, and no operator withdrawal/refund workflow with protected community reservations. Cancellation of one run is not pausing project automation.

Reconciliation currently calculates opening balance plus recorded funding credits minus settled transfer debits. It does not have a full journal for incoming-credit reversals, returned principal, retained/reversed fees, withdrawals or other account events. When an outgoing transfer becomes reversed it drops out of the settled-debit sum; the correctness of the resulting balance depends on real provider reversal/fee behaviour that is not represented by compensating journal entries.

Required: approved automation lifecycle/backlog policy, protected reservations, controlled withdrawal/refund contracts if enabled, receipt-reversal events and explicit compensating entries/exceptions. Never auto-recover money from participants without a supported authorised banking operation.

Evidence: backend/src/app.ts line 246; backend/src/service.ts lines 206 to 249 and 457 to 465; backend/src/batches.ts.

## Six Verifier privacy WhatsApp and Hedera

### Verifier access

Existing public geography groups participants into H3 resolution-four cells and returns only cells containing at least five participants. Verifier project reads return the public project summary. This protects exact locations in those views, but is not a period-specific payment map. Private operator maps expose capture points and are not suitable as unrestricted verifier endpoints.

Required: explicit verifier geographic entitlement, masked payment-map/table endpoints, period/run filters, consistent totals and controlled exact-location access.

Evidence: backend/src/service.ts line 311; backend/src/app.ts lines 149 to 153, 313 and 314.

### WhatsApp

The implemented message adapter is SMS, with live Africa's Talking and simulated modes. SMS delivery callbacks update recorded message outcomes. Enrolment stores general consent and language; channel-specific WhatsApp opt-in, templates, WhatsApp callbacks and delivery history are not implemented. General enrolment consent is not automatically WhatsApp consent.

Required: channel preferences/consent, WhatsApp adapter/templates, authenticated callbacks, idempotent attempts and approved fallback rules. Payment outcome remains separate from message delivery.

Evidence: backend/src/providers.ts line 69; backend/src/service.ts lines 426 to 434; backend/src/app.ts line 351.

### Hedera

Signed period attestations include previous-hash and correction/supersedes links, a Merkle root and restricted disclosure proofs. An anchor job submits the attestation hash. The direct Hedera implementation uses testnet, stores transaction intent for replay and verifies the hash through the testnet mirror node. Non-live anchoring is explicitly mock. These are evidence records; they are not a wallet containing operator funds.

Required: the approved event-level funds-history model, proof reads and honest pending/network states. The direct adapter does not select mainnet today. Hedera cannot independently establish that an unsupported bank statement or allocation rule is true.

Evidence: backend/src/service.ts lines 267 to 294 and 425; backend/src/providers.ts lines 82 to 112.

## Recommended implementation priority

1. Add project-account ownership/readiness and durable incoming receipts with credit-transaction deduplication and unmatched-income handling.
2. Implement approved policy versions and accurate entitlement/fee/reservation records, including the sample agreement's weighted/fund requirements.
3. Connect confirmed receipts to automatic distribution; replace one-run-per-period assumptions with receipt-level distributions and period-level aggregation.
4. Add pause/backlog/reversal policy, complete wallet reconciliation and recovery controls before live activation.
5. Build the dashboard from those financial records; add WhatsApp, privacy-scoped verifier payment maps and funds-event evidence.

The existing payment adapter, batching, signatures, audit, worker and report foundations should be reused. This review did not run new tests or contact live providers; the identified behaviours are supported by the cited source paths, not a fresh production walkthrough.
