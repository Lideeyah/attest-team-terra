# Attest Unified Frontend and Backend Build Plan

## Purpose and delivery outcome

Date: 12 November 2026. Working branch: mark/production. Status: planned, not implemented. This is the execution plan for the combined interface specification, approved implementation directions and Forge-aware backend PRD. It replaces separate frontend/backend sequencing with shared feature packages; detailed requirements remain in their source specifications.

The operating journey is: set up a project and locations, approve the document and allocation rules, verify the account and community roster, activate the policy once, receive confirmed project income, automatically pay eligible recipients, explain held or uncertain money, send receipts and publish verifiable results. There is no normal per-payment-run operator approval. Public records remain open; private workspaces are role protected.

A feature is delivered when its backend records and rules, typed API, frontend page progression, drawers/modals, error/recovery states and integrated tests work together. A page that only looks complete, or an API without a usable workflow, is not complete.

### Sources and precedence

Use the owner's approved product directions, the Attest Product Interface and Backend Specification, the Attest Backend PRD for Forge Sandbox and the existing implementation plan. Product requirements determine intended behaviour; the Forge PDF and actual capability probes determine which provider operations are possible. The Participant Platform Guide section 5.8 is the documented override when the sandbox build differs and must be obtained for integration sign-off. Unsupported provider capabilities remain explicit blockers, not invented endpoints.

All recommended directions are already approved. Project-specific agreement values, provider facts, WhatsApp configuration and production network choices still require real evidence/configuration; approval of direction does not supply these values.

## Shared operating rules

- Use NGN only for the sandbox release, exact money arithmetic and UTC timestamps. Present local dates clearly.
- Recognise confirmed available funds once per underlying bank credit. A pending payout, checkout redirect or carbon retirement is not spendable income.
- Snapshot the effective agreement, roster and allocation inputs. Preserve weighted household and separate community-fund terms. Missing inputs hold affected work.
- Keep household entitlements intact; charges use the operator's available allocation subject to the agreement. Blocked members retain owed amounts and application reservations.
- Query uncertain transfers before retry. Pausing cannot recall bank-accepted transfers, and resuming cannot silently sweep unapproved historical funds.
- Distinguish bank settlement, recipient confirmation, message delivery and evidence anchoring. Every dashboard amount must drill into matching records.
- Protect exact locations and identity/account data by role. No participant PII goes onto Hedera. Application reservations are not bank escrow unless the provider actually supports enforcement.
- Clearly distinguish local mock, connected Forge sandbox and live-provider environments. Synthetic sandbox funds and identities are never described as real banking verification.

## Team responsibilities and collaboration

Backend owns persistence, financial rules, provider adapters, jobs, permissions and authoritative read models. Frontend owns usable page progression, accessible components, responsive layouts and truthful presentation of API states. Both own shared contracts, fixtures, integration tests and feature acceptance. Acceptance reviewer owns reproducible scenario evidence; product owner supplies genuine project-specific business values without being asked to reapprove settled directions.

For every package, agree the request/response examples and state transitions first. Frontend can build against labelled contract fixtures while backend implements. Connect to the real application endpoint before acceptance; remove fixture-only success paths. Backend changes must be compatible with existing pages until the replacement is verified.

All feature commits remain on mark/production. Preserve outstanding local fixes; review and assign them to focused commits rather than resetting or bundling unrelated work. Commit by verified feature. Deploy additive schema and compatible APIs before exposing dependent actions. Financial automation remains off until its project prerequisites and recovery checks pass.

## Delivery roadmap and dependencies

| Milestone | Feature packages | Demonstrable outcome |
| --- | --- | --- |
| M0 Baseline and capability proof | U01 | A proven receiving-to-payout sandbox path, or an evidenced limitation |
| M1 Shared platform and access | U02 and U03 | Protected workspace, shared contracts and consistent UI states |
| M2 Project and community readiness | U04 to U07 | Saved setup, valid locations/document, imported and checked members |
| M3 Account income and financial records | U08 | Confirmed receipts and reconciled wallet visible in the app |
| M4 Automatic distribution | U09 and U10 | Income triggers correct payouts without per-run approval |
| M5 Complete operator and participant experience | U11 and U12 | Useful earnings dashboard, actionable exceptions and receipts |
| M6 Oversight and evidence | U13 to U15 | Verifier maps, linked evidence and operations/admin recovery |
| M7 Release acceptance | U16 | All roles complete integrated journeys with monitoring and rollback |

Critical dependencies: U01 → U02 → U08 → U09 → U10 → U11 → U16. U09 also requires approved rules and verified roster inputs from U05/U06. U13 requires geography from U04 and outcomes from U10. U12 consumes persisted events from U10; U14 consumes reconciled events and period outcomes. Operations recovery from U15 is required before enabling unattended payouts, not postponed until after launch.

U03 to U07 can progress alongside the account foundation once contracts are stable. Dashboard layout can use explicit fixtures early, but financial acceptance waits for U08/U10. No fixed calendar estimate is asserted until U01 establishes the baseline and provider access. Track engineering effort separately from platform/provider onboarding delays.

## U01 Baseline and sandbox capability proof

Owners: backend integration lead and frontend lead. Dependency: none. References: backend PRD CAP01 to CAP05 and existing local end-to-end fixes.

Backend work: inventory source/deployed revisions, migrations, provider modes and worker deployment. Prove bank reachability from the intended worker. Create/read a dedicated account, credit it twice and verify whether its balance can fund outgoing bulk/intra/interbank transfers. Prove the carbon owner-payout account is controllable before promising automatic onward distribution. Confirm KYC/merchant behaviour, history fields, charges, reversals and event identity.

Frontend work: inventory every page, overlay and current dead end against the interface specification. Identify role/session gaps and existing components worth reusing. Record the status of unfinished local fixes without claiming they are deployed.

Output: capability matrix, sanitised fixtures, page/API coverage checklist, baseline test results and agreed architecture. The bank URL is internal to team namespaces; do not assume Vercel can reach it. Prefer a reachable adapter/worker in the Forge namespace or an approved authenticated restricted bridge. Never put the team key in the browser.

Fallback: if dedicated VA payout is unsupported, use only a proven team-controlled funding path with project attribution and shared-account reservations. If carbon proceeds go to an external account Attest cannot debit, mark that journey blocked; a labelled simulated inflow can demonstrate a separate supported scenario. Do not fabricate sweeps, wallet cash-out or bank custody.

Acceptance: a reproducible proof identifies what actually works. Missing Platform Guide section 5.8 and provider facts are recorded. No shared-team reset is performed casually. Existing user work is preserved.

## U02 Shared contracts data foundation and reusable interface

Owners: backend and frontend. Dependency: U01. References: BR01, data requirements and shared interaction rules.

Backend work: define money/currency/status/job/revision/pagination contracts; account, receipt, policy, allocation, journal, reservation and outbox migrations. Add database uniqueness, transaction boundaries, ownership and compatible historical-record handling. Keep incoming monetary receipts distinct from recipient receipt tokens.

Frontend work: extend existing page shell, project selector, page header, metric card, filters, table/card layout, status badge, loading/empty/error/stale state, job progress and saved-state components. Standardise drawers, decision modals, notifications and form steps with existing green tokens. Define typed API adapters and error-to-user-message mapping.

Overlays: common drawer/sheet, confirmation dialog, notification drawer, unsaved changes and session expiry. Desktop drawers are approximately 420 to 560 px; mobile uses full-screen sheets. Avoid nested modals.

Acceptance: shared contracts compile in both services, additive migrations preserve data and every common async state is demonstrable. Keyboard focus, reduced motion, accessible status text and mobile layout work. No frontend-only permission or financial calculation is treated as authoritative.

## U03 Access roles and resumable workspace entry

Owners: backend and frontend. Dependency: U02. References: access pages and BR02/BR12 permissions.

Backend work: verify auth/session/email/reset behaviours and role scoping on pages, mutations, exports and streams. Complete supported institution provisioning and approval status. Prevent role assignment through client input. Identify actual email delivery capability.

Frontend work: finish sign-in, signup, verify email, resend, reset and invitation entry. Restore intended authorised destinations after login. Provide honest pending/expired/failed states and preserve safe drafts across session expiry. Keep public project/verification pages outside the login wall.

Overlays: session-expired dialog and invitation outcome. Acceptance: unauthenticated workspace requests redirect safely, wrong-role requests fail on the server and public records stay accessible. Resend/registration never claims actual delivery without provider evidence.

## U04 Project identity and point or boundary geography

Owners: backend and frontend. Dependency: U02/U03. References: BR05 and setup steps one/two.

Backend work: extend project/location contracts with versioned KML points, KML polygons and coordinate CSV points; PostGIS validation, source hash and feature ownership. Separate sites/communities from participant locations. Replace blanket boundary-required enrolment rules with the approved explicit containment policy. Preserve registry source/provenance.

Frontend work: build saved identity and geography steps, six-step progress, dataset list, upload validation, map preview, feature selection and boundary/point layers on OpenStreetMap. Points-only projects save successfully with area/containment labelled unavailable. Back/Continue preserve values.

Overlays: dataset preview, feature drawer and dataset replacement with reason. Contracts: project lookup/create; location-dataset upload/read/features; map/boundary reads. Acceptance: the supplied point-only KML is retained as points, never invented into a polygon. Missing locations remain visible and invalid coordinates fail with understandable messages.

## U05 Source documents autosave and versioned rules

Owners: backend and frontend. Dependency: U02/U03; project identity from U04. References: BR04/BR06 and setup steps three/four.

Backend work: retain original document versions/hash, extraction jobs/results and quoted source pages. Introduce revisioned review drafts with conflict detection and approved effective versions. Model gross/net basis, evidenced deductions, household/fund shares, verified weighting inputs and timing independently of reporting cadence. Preserve unsupported-term guards until the corresponding engine is supported.

Frontend work: upload progress and recoverable processing stages; source passage alongside editable structured fields; Saving/Saved/Retry feedback; source toggle on mobile; comparison/history view. Save drafts automatically, but make approval explicit. Restore the review after refresh/navigation.

Overlays: source/evidence preview, version comparison and approval of future rules. Contracts: PDD upload/job reads, commitment-draft read/save/approve and history. Acceptance: no lost saved drafts, silent concurrent overwrite or editing of prior approved records. The sample document's household/fund split and weighted terms are either correctly represented or explicitly blocked.

## U06 Community CSV identity and account verification

Owners: backend and frontend. Dependency: U02/U03/U04; relevant agreement inputs from U05. References: BR02/BR05.

Backend work: persistent import jobs/rows, column validation, consent references, stable row keys and per-row outcomes. Reuse BVN/NIN and bank-name checks; separate identity, account resolution, name comparison, duplicate, restriction and payment eligibility results. Add controlled review/recheck and account correction with re-verification. Use available provider tiers/limits rather than inventing bank eligibility.

Frontend work: community list/detail; template → upload → mapping → preview → validate → confirm → results; safe error download and rejected-row resubmission. Build account-review queue, independent status indicators, roster history and future allocation inputs. Sensitive information stays masked.

Overlays: import confirmation, row errors, member quick view, review decision and member suspension/reactivation. Acceptance: partial import retries never duplicate accepted people. Missing consent is not inferred from CSV upload. An unavailable service differs from identity failure. Historical payments retain original recipient account details after corrections.

## U07 Field agents offline capture and device recovery

Owners: backend and frontend. Dependency: U03/U04/U06. References: BR05 and field workspace.

Backend work: complete invite/redeem/identity activation/suspension, device binding, recovery/key rotation, evidence upload and idempotent sync outcomes. Preserve signed capture provenance and original GPS/time. Recovery must not retrospectively alter historical signatures.

Frontend work: agent list/detail and invitation link; field home, enrolment, review, encrypted queue, submitted record and device/profile. Enrolment steps are consent, personal details, account/wallet, location/evidence and review. Back preserves input. Queue distinguishes local save from server acceptance and offers permitted corrections.

Overlays: invitation, consent explanation, evidence preview, suspend/recover device and safe leave. Acceptance: disconnected capture survives reconnect/restart, accepted records sync once, suspension is enforced and point-only projects do not receive false containment results. No unsupported Reset device control is offered.

## U08 Account readiness incoming income and wallet

Owners: backend integration lead and frontend. Dependency: U01/U02/U03; project identity from U04. References: BR01/BR02/BR03/BR07/BR10.

Backend work: verified account lifecycle, account capability evidence, authenticated raw-body callbacks, credit/session uniqueness, project/currency attribution and durable incoming receipts. Persist/acknowledge callbacks before slower processing. Implement bank-history import, balanced journals, account balances/reservations and reconciliation. Record unmatched credits and classify income versus top-up/internal movement. Provider polling respects the shared 60-request/minute budget and history pagination.

Frontend work: setup account-readiness step, wallet/account summary, statement, incoming receipt detail, freshness and unavailable-balance states. Show gross sale, fees and net received where available. Never treat retirement/pending collection as spendable income. Provide a useful awaiting-income state.

Overlays: account details/proof, transaction timeline and incoming receipt evidence. Contracts: wallet summary/transactions, incoming receipts/list/detail and job state. Acceptance: two credits to a VA allocate two receipt records despite a shared VA creation reference; replayed business credit counts once. Bank balance, statement and journal reconcile. Unknown balance is not zero. CAP02/CAP04 determine the honest supported account path.

## U09 Effective automation policy and allocation engine

Owners: backend and frontend. Dependency: U05/U06/U08. References: BR06/BR07/BR09.

Backend work: versioned activation/pause/resume policy, effective roster/weights, evidenced net deductions, exact equal/weighted calculations, separate fund destination, deterministic remainder and protected held entitlements. Create allocations/reservations/outbox atomically per incoming receipt. Support multiple receipts within a reporting period and distinguish release deadlines from reporting close.

Frontend work: final setup checklist, activation summary, agreement/fee/timing explanation, policy status/history and allocation breakdown. Show prerequisites and direct links to resolve them. The normal primary action is Activate automation once; it is not Approve each run.

Overlays: activation, pause/change/resume with reason and explicit backlog scope. Contracts: policy draft/read/activate/pause/resume, allocations/detail/items and authorised release. Acceptance: original entitlements sum exactly, recipient exclusions do not change others' shares, future edits do not rewrite old allocations and insufficient fee funding creates a clear hold. The sample 20 percent household/10 percent fund net model works with verified weights before its policy can activate.

## U10 Automatic payouts and transfer monitoring

Owners: backend and frontend. Dependency: U09; operational recovery from U15 before activation. References: BR01/BR08/BR09.

Backend work: connect confirmed ready receipts to automatic preflight/dispatch; reuse batch intents up to 200 items, bank enquiries, stable references and durable workers. Enforce fresh single-use enquiries or validated bulk auto-enquiry. Treat timeout as unknown; query existing transfer/TSQ before retry. Process partial batches, out-of-order callbacks, failed-then-reversed and successful-then-reversed results. Attest deduplication must outlive the provider's 24-hour window.

Frontend work: automatic distributions list; detail tabs for overview, recipients, events and evidence; live/reconnecting progress; held/failed/unknown explanations. Replace normal manual-run emphasis with monitoring and exception resolution. Complete processing is not the same as every recipient being paid.

Overlays: transfer details, definitive-failure retry review and entitlement release. Acceptance: confirmed project income triggers eligible payouts while all browsers are closed. Replays, concurrent workers and restarts cannot double-pay. Unknown outcomes never expose a blind Retry all action. Existing/manual run tools remain restricted recovery/test paths where justified.

## U11 Earnings dashboard and complete operator navigation

Owners: frontend and backend read-model owner. Dependency: U08/U10; shell from U02. References: BR10 and operator workspace.

Backend work: authoritative period/date-filtered metrics with currency, asOf/freshness and drilldown identity. Include received income, obligation, operator allocation, available, reserved, paid, processing, held, failed/unknown, charges and shortfall. Define overlapping values and pending bank holds so nothing is subtracted twice.

Frontend work: responsive dashboard cards, money flow, recent receipts/distributions, actionable exception banner and map preview. Complete projects, members, map, agents, wallet, distributions, documents, messages, disputes, ledger, reports and supported settings navigation. Persist selected project and period. Income-labelled cards exclude mere top-ups unless explicitly included and labelled.

Overlays: notifications, recent-event details and context-preserving drilldowns. Settings includes supported organisation/account/policy/team/security/integration controls; finish required team/access and notification contracts before exposing edits. Never show a working API-key or preference action backed only by a toast.

Acceptance: every figure opens matching records, long names/large amounts work on mobile, empty/loading/error/stale states are readable and project switching cannot silently lose edits. Operator/private balance data is not made public automatically.

## U12 WhatsApp participant receipts and disputes

Owners: backend messaging lead and frontend. Dependency: persisted events from U06/U10. References: BR11.

Backend work: separate WhatsApp adapter, channel consent/templates, authenticated callbacks, durable attempts/deduplication and consent-controlled fallback. Retain secure scoped receipt tokens, confirmation/dispute/evidence and response history. The bank PDF supplies no WhatsApp service, so use configured external delivery or honestly simulated mode.

Frontend work: message list/attempt history, delivery summary, preference/consent display and permitted resend. Participant receipt opens mobile first with amount/status and Confirm received/Report a problem. Complaint categories and optional evidence lead to an acknowledgement/reference. Operator disputes show evidence and responses without self-resolution powers.

Overlays: delivery attempts, resend review, complaint/evidence and permitted independent resolution. Acceptance: bank success remains success if WhatsApp fails; duplicate callbacks do not duplicate intended notices; consent is respected; expired links leak no data; developer response is not a resolution. Alert rules and alert delivery remain separate.

## U13 Verifier payment map and oversight

Owners: backend access/data lead and frontend. Dependency: U04/U10/U11. References: BR12.

Backend work: privacy-scoped payment map/table by project/period/run with explicit geometry links, cluster totals, unmapped totals and role-approved precision. Complete watchlist removal, alert edit/delete and filter-consistent exports. Do not reuse unrestricted private operator capture endpoints for verifiers.

Frontend work: verifier home, projects/detail, map/table switch, comparison, watchlist, alerts and exports. Paid green, processing amber, failed red and unknown/not-started grey always have labels/icons. Partial and reversed are explicit; disputes/recipient confirmations are separate badges.

Overlays: point/cluster payment evidence, alert editor/evidence and export progress. Acceptance: map/table/report totals match for the same filters, previous-period success cannot colour a current unpaid point, missing locations remain counted and exports cannot bypass privacy. Public records retain coarser published information.

## U14 Ledger proofs period reports and public records

Owners: backend evidence lead and frontend. Dependency: U08/U10/U11; verifier evidence integrates with U13. References: BR13.

Backend work: aggregate all distributions in a reporting period, preserve signed/hashed history and append corrections. Define funds-event evidence schema, canonical hashes, inclusion proofs and durable anchoring. Keep real bank history distinct from database audit and Hedera evidence. Hedera requires its own integration; show mock/testnet/mainnet accurately and never place participant PII on chain.

Frontend work: ledger/events, proof inspector, period reports/downloads and correction links. Finish public home/register/project/operator profile/attestation/verify/report/about/privacy/terms. Public records remain usable without login. Verify actual supplied proof; do not display a seal merely because an anchor job was queued.

Overlays: proof results, event history, signed report details and source correction comparison. Acceptance: tampering fails verification, pending anchors remain pending, late settlement/reversal produces linked corrections and confirmed bank payments are not blocked by unavailable optional anchoring. All period distributions are reported once.

## U15 Operations administration and recovery

Owners: backend and frontend. Dependency: build incrementally from U08; integrate U09/U10/U14. References: BR09/BR10 and operations/admin pages.

Backend work: unmatched receipt attribution/correction, transfer queries, reconciliation differences, retry/dead-letter jobs, provider capability checks, account-control outcomes and auditable investigations. Complete organisation/source-account/institution approval, extraction review, registry history and escalation decision APIs. No fictitious bank freeze/refund capability is exposed.

Frontend work: operations home, incoming/transfer exceptions, reconciliation, signals/graphs, cases and jobs. Admin home, onboarding approvals, extraction review, registry/history, chain integrity and escalations. Show responsible owner, amount, reason and next action for every exception. A risk signal is not a fraud verdict.

Overlays: attribution correction, documented case action, provider-action progress, job detail and reasoned approval. Acceptance: recovery never overwrites financial history or repeats uncertain transfers. Pause works and in-flight items remain monitored. A queued freeze/unfreeze/request is distinguished from confirmed provider execution. The minimum recovery controls must pass before automatic payouts are activated.

## U16 Integrated quality and release

Owners: frontend, backend and acceptance reviewer. Dependency: all required packages. Reference: backend PRD AT01 to AT28 and interface accessibility requirements.

Run meaningful tests per feature, then the full frontend tests/lint/type check/build, backend tests/check/build, integration-contract checks and populated-database migrations. Read the installed Next.js guides before changing its relevant APIs/conventions as instructed by AGENTS.md. Record pre-existing failures separately and fix regressions before release.

Execute browser journeys for operator, field agent, participant, verifier, operations, administrator and anonymous visitor. Test at 320, 375, 768, 1024 and 1440 px; keyboard, reduced motion, slow network, long content, modal focus, navigation Back/Continue, empty/error/loading/stale and session expiry.

Run actual Forge scenarios: duplicate credits, two receipts per period, signed callback/replay, transaction history beyond 100 rows, batch over 200 items, timeout/requery, late reversal, fee shortage, account restrictions, restart after commit/bank acceptance, pause/backlog and processing after the bank's 24-hour idempotency window. Use documented trigger endings only intentionally. Do not alter correct agreement rounding to hide sandbox triggers.

Deploy in order: database backup and additive migrations → compatible API and reachable durable workers → frontend with automation off → smoke/reconciliation/provider checks → activate one approved sandbox pilot project → widen after acceptance. A live-money release is a separate provider-readiness gate, not the conclusion of a synthetic demo.

Rollback pauses new dispatch, preserves jobs/journals and reconciles in-flight transfers. Use compatible code rollback or forward correction; never delete financial evidence or retry an uncertain transfer merely to recover a deployment.

## Contract and interface handoff checklist

Every package must publish: final endpoint names, permission scope, typed request/response, example success and blocked/error states, pagination/filter semantics, revision/idempotency behaviour, async job/status contract, audit entries, schema migration/backfill and acceptance fixtures. Both developers agree the meaning before wiring screens.

Frontend exposes the actual reason and next action, without internal codes as the main message. A user sees Saving, Saved, Checking payment or Needs attention; server logs retain the technical reference. Background progress is real; success appears only after persistence/provider evidence appropriate to that action.

All overlays have a close path, focus return and mobile behaviour. Destructive or financial actions show scope/amount/reason. Closing a modal does not imply cancelling an already submitted job. Notifications acknowledge actions but never replace persistent financial errors.

## Initial build queue

1. U01 baseline: review existing local changes and capture actual test/provider deployment status.
2. U01 capability probes: prove namespace access, VA debit path and carbon owner account control; record the supported integration path.
3. U02 contract package: NGN/status/job/revision models, receipt identity, account readiness and wallet API fixtures.
4. U02 foundation: additive financial migrations, event/business uniqueness, durable outbox and shared UI shell/states.
5. U03 protected entry and U04/U05 setup progression can then proceed alongside U08 account/receipt work.
6. Demonstrate the first integrated slice: sign in → select project → view real sandbox account readiness → receive two distinct confirmed credits → inspect both receipts and matching wallet records. No payouts yet.
7. Add approved rules/roster, then demonstrate one automatic distribution with held-member and duplicate-event recovery before broadening the dashboard.

Each queue item should become a small verified commit on mark/production. No new branch or production deployment is required merely to adopt this plan.

## Build status and definition of done

All U01 to U16 packages start as planned. Existing code offers reusable foundations, but this plan does not count a feature complete from source presence or demo appearance alone. Track each package as planned, implementing, integrating, acceptance, done or externally blocked with an owner and evidence. External blockers affect their dependent functionality, not unrelated progress.

Done means backend and frontend agree, permissions and financial invariants hold, the full page/overlay journey works, meaningful tests pass, sandbox limitations are labelled and recovery is documented. Maintain the feature checklist and test evidence beside this plan as work proceeds. Provider keys/secrets never enter documents or commits.
