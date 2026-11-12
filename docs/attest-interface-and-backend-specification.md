# Attest Product Interface and Backend Specification

## Purpose and operating model

This specification defines the target Attest experience for product, design, frontend, backend and operations teams. It brings together the project documents and the owner's latest decisions: accept map points as well as boundaries; receive project income into an operator account powered by Access Bank; automatically distribute the community share; show wallet earnings and exceptions; use WhatsApp for messages; and connect payment evidence to a verifiable history.

The central operating rule is that a confirmed incoming payment attributed to a project triggers distribution under rules approved during setup. The operator does not approve each normal distribution again. The application pauses only the affected work when required information, funding, eligibility or provider confirmation is missing. The dashboard must explain every such pause.

This is a target implementation specification, not a declaration that all features are deployed. Existing means supported by inspected repository code; extend means current foundations need additional work; new means a capability must be introduced. Existing local code may differ from the hosted demo. Proposed API paths and storage entities are explicitly labelled below. A live Access Bank contract and confirmed provider capabilities are required before real automatic payouts.

The document replaces earlier manual payment initiation as the normal journey. Manual run creation may remain a controlled recovery or test tool, not the operator's primary action. Carbon credit measurement, marketplace checkout and a complete MRV interface are separate scope; existing carbon service endpoints do not establish those products.

### Product invariants

- Only confirmed, uniquely identified incoming funds trigger allocation. An expected payment, screenshot or unverified callback cannot trigger payouts.
- Every receipt belongs to one project and currency. Unmatched receipts remain in an exception queue; attribution corrections are logged and cannot pay the same money twice.
- Percentage, calculation basis, beneficiary allocation and timing come from an approved version of the agreement. A simple split is not inferred from a complex document.
- The roster, rules and amounts used by a distribution are snapshotted. Later edits do not silently alter existing entitlements or transfers.
- Bank submission, bank settlement, recipient acknowledgement and ledger anchoring are distinct states.
- Community obligations remain visible when a participant is blocked. Their allocation is not silently redistributed to others.
- Exact household locations, identity numbers and bank account details are restricted by role. No sensitive participant data is written to Hedera.

## Navigation and visual foundation

Preserve the existing green brand: bottle deep #1E3A2E, bottle mid #2C5342 and bottle muted #5A7D6B. Use the existing warm canvas #F7F4EB and dark text #181816, with secondary text #5C5A55 and dim text #68655D. Reuse application tokens and components. Green identifies primary actions and selection; red is reserved for confirmed failure/destructive actions, with a functional amber token for processing. Status always includes text or an icon, never colour alone.

Use a consistent shell with organisation/project selector, workspace navigation, page title, contextual actions, notifications and account menu. Selection must persist between related pages and be visible in every money view. Confirm a project switch if unsaved changes cannot yet be saved. Include clear environment labels for simulated banking and testnet evidence.

Desktop layout uses a roughly 240 px sidebar and flexible content area. Content padding is 24 to 32 px with 16 to 24 px section gaps. Forms use a readable 640 to 760 px column. Tablet navigation collapses to a rail or drawer. On mobile use a compact header and at most four main destinations plus More; forms become single column. Financial summaries move from four columns to two to one. Minimum touch targets are 44 px. Tables use a deliberate card alternative or a labelled horizontal scroll region; the entire page must not overflow.

Keep a clear hierarchy: one primary next action, secondary outlined/quiet actions, destructive actions separated from routine controls. Use readable mixed-case button labels, permanent field labels, inline help and inline validation. Put currency and reporting period beside amounts; use consistent decimal precision and tabular numerals.

### Shared interaction rules

Navigation uses shaped skeletons that preserve the eventual layout. Buttons show progress and block duplicate requests. Long jobs show actual stages and elapsed activity; never invent a completion percentage. A saved state requires a server acknowledgement. Every data surface has loading, empty, error, stale and permission-denied states. Errors explain the user action required and offer retry without discarding input.

Use 150 to 220 ms opacity/transform transitions for drawers, menus and step changes. Respect reduced-motion preferences. Maintain visible keyboard focus, logical tab order, screen-reader labels and announced status updates. Charts have text summaries and tables. Dialogs trap focus, close safely and return focus to the triggering control.

Back and Continue work in every onboarding flow. Save drafts as users progress; restore after refresh or login. Continue validates only the relevant step and moves focus to the first error. Browser Back must not lose a saved draft. A route redirect after login returns to the intended authorised workspace. Public records and public verification remain open.

## Information architecture

Routes listed here are target routes. Reuse existing routes where practical; paths marked proposed are not current contracts.

| Workspace | Destinations | Access |
| --- | --- | --- |
| Public | Home, register, project detail, operator profile, attestation, verify, report, about, privacy, terms | Open with privacy filtering |
| Access | Sign in, developer signup, email verification, reset, invitation, institution access | Public forms with protected transitions |
| Project setup | Identity, geography, document, review, wallet readiness, automation activation | Operator administrator |
| Operator | Overview, projects, members, map, agents, wallet, distributions, messages, disputes, documents, ledger, reports, settings | Organisation scoped |
| Field | Home, enrol, review, queue, record detail, profile/device | Assigned active agent |
| Participant | Receipt, confirmation, complaint, complaint acknowledgement | Expiring scoped receipt token |
| Verifier | Overview, projects, project detail/map, compare, watchlist, alerts, exports, proof | Institution scoped and privacy filtered |
| Operations | Overview, incoming exceptions, transfers, reconciliation, signals, investigations, jobs | Bank operations |
| Admin | Overview, approvals, extraction review, registry history, chain integrity, escalations | Platform administrator |

### Page structure used below

Each page description specifies appearance, behaviour, overlays, backend dependencies and the next step. Lists, tables and detail drawers use the same filters and preserve URL state where safe. Sensitive data must not be included in URL parameters. A drawer provides quick inspection; a full detail page provides a shareable authorised destination for deeper investigation.

## Access and setup pages

### Sign in and recovery

Appearance: a narrow form beside a concise product explanation on desktop; a single form on mobile. Fields are email and password, with show-password, reset link and a green Sign in button. Show the destination workspace after login, without exposing account existence to unauthorised users. Recovery and email verification have explicit pending, expired and completed states.

Behaviour: preserve the intended destination, reject unauthorised roles on the server, prevent duplicate submissions and clear passwords after completion. Sessions expiring during editing preserve a safe draft and request sign-in. Institution registration explains whether access needs approval rather than claiming a provisioned account.

Backend: existing auth signup/signin/session/verify-email/reset endpoints and resend verification support. Email delivery needs a live provider. Add role provisioning only through approved administration; the client cannot assign itself a role. Overlay: session-expired dialog with Sign in and safe return.

### Setup step one Project identity

Appearance: a six-step progress indicator and one main form. Capture project name/reference, registry information where applicable, operator organisation, country and currency. Registry lookup shows the source and retrieved date. Do not claim registry verification for operator-entered details.

Behaviour: lookup and project creation are separate confirmed actions. Store a setup draft and resume it. Existing POST /api/projects/lookup and POST /api/projects provide the foundation. Missing lookup service shows retry or a clearly unverified draft path if product policy permits it. Continue opens geography.

### Setup step two Locations and boundaries

Appearance: upload panel, dataset list, map preview, legend and a compact validation summary. Accept point datasets, polygon boundaries or mixed datasets. Initial required support is KML and coordinate CSV for points, and KML polygons for boundaries; GeoJSON is a proposed extension. The backend must validate format independently of file extension.

Behaviour: retain geometry type, source name/hash, coordinate system, import time and uploader. Preview each dataset before confirmation. Identify invalid coordinates, duplicate features and missing labels. Never derive a claimed boundary from unrelated points. With points only, save and continue; label area and inside/outside checks Boundary needed. Distinguish community/site points from participant locations, and link them explicitly rather than guessing by name.

Overlays: upload preview drawer; feature detail drawer; replace-dataset confirmation requiring a reason and explaining historical effects. Existing boundary upload/project boundary/map APIs need extension for point layers. Proposed location datasets and feature endpoints are described in the API section. Continue opens document upload.

### Setup step three Document upload and processing

Appearance: document title/version, drop zone, selected file, upload progress and processing timeline. Stages are Uploading, Reading document, Finding commitment, Ready for review or Needs attention. Show an honest waiting message when processing is queued.

Behaviour: upload once, persist the job reference, recover its state after refresh and allow navigation away. Re-uploading creates a new document version. Failed processing offers retry or reviewed escalation, not a false success. Store the original source file securely, its hash and extracted source passages with page references.

Backend: existing POST /api/projects/:id/pdd; GET /api/projects/:id/extraction/status; GET /api/projects/:id/extraction/jobs/:jobId. Extend original-file/version retention and history as required. Continue becomes available when a reviewable result exists.

### Setup step four Commitment review and history

Appearance: source passage with page number beside editable structured terms. Fields include percentage, gross/net basis, beneficiaries, allocation method, timing, deductions and any separate community fund. On mobile, source and fields stack with a persistent source toggle. A history tab shows versions and comparisons.

Behaviour: save draft edits automatically with Saving/Saved/Retry feedback. Autosave does not activate a rule. Approval creates a versioned active agreement with a reason for reviewed changes. Unsupported terms block activation and identify the exact missing capability. An accepted agreement cannot be silently replaced. Changes affect future receipts only unless a controlled correction is explicitly approved.

Backend: extraction results already persist; PATCH /api/projects/:id/commitment creates reviewed versions and audit entries. Extend with a separate revisioned draft resource so each keystroke does not create an approved business version. Use optimistic concurrency to prevent one reviewer overwriting another. Drawer: version comparison. Modal: approve rules, including scope and effective time.

### Setup step five Wallet and account readiness

Appearance: Access Bank-powered account panel, operator verification checklist, masked account details, connection state, currency, balance freshness and community-payment readiness. Display pending approval honestly. A copy action acknowledges only copying.

Behaviour: bind a verified account to the correct organisation/project. A dedicated account or virtual-account reference is preferred for deterministic incoming attribution; otherwise require a reliable project reference. Wallet creation, ownership verification and funding readiness are distinct checks. Never show an unavailable balance as zero.

Backend: existing admin source-account linking, project funding and reconciliation endpoints are foundations. Complete wallet provisioning, organisation verification, balance/reservation model and customer-facing account lifecycle require extension. Drawer: account verification evidence. No unrestricted bank-detail edit after activation.

### Setup step six Activate automatic distribution

Appearance: final checklist summarising agreement version, project account, recipient eligibility, allocation method, fee treatment, timing and exception handling. Show what will happen when money arrives. If the roster is not ready, allow saving setup but keep automation explicitly inactive.

Behaviour: an authorised administrator approves the rule once. Display Active, Paused or Needs setup prominently. Once active, confirmed attributed receipts automatically start distribution without a per-run approval. Pausing prevents new submissions within defined limits; it cannot recall transfers already accepted by the bank or erase obligations.

Backend: proposed versioned automation policy and activation endpoint, scoped permission, audit event and worker readiness checks. Modal: activation confirmation with exact rules. Later policy changes require a reason, effective date and a visible version. Next step opens the overview and community readiness checklist.

## Operator workspace pages

### Overview and earnings dashboard

Appearance: project selector, date/period filter, automation state, last bank update and up to four primary financial cards. First row: Income received, Community obligation, Successfully paid and Needs attention. Second row: Available, Reserved, Processing, Operator share and Charges. On mobile prioritise four cards with expandable supporting figures.

Below the cards show an income-to-distribution flow, recent receipts, recent automatic distributions, actionable exceptions and a payment map preview. Each card opens the corresponding filtered wallet or distribution list. Include a readiness checklist only while setup is incomplete.

Behaviour: distinguish cash receipts from accounting earnings; pending income is not received income. Explain gross versus eligible net basis. Do not add overlapping metrics into a misleading total. Needs attention includes a count, amount, cause and next action. A banner such as 12 payments need attention opens the exact affected transfers. Read-only verifier totals must reconcile to the same underlying records.

Backend: proposed aggregate dashboard endpoint with currency, filters, as-of time, freshness and metric definitions; existing project/funding/reconciliation/run data supply part of it. Avoid calculating financial truth independently in the browser. Empty state: Finish setup or Awaiting first project payment, as appropriate.

### Projects list and project details

Appearance: searchable project cards/table showing project name, location, account readiness, automation state, income received and outstanding obligation. Project detail includes identity, geography summary, active agreement and readiness. The Create project action starts the saved setup flow.

Behaviour: project selection carries through wallet, maps and payments. Archived projects retain their history. Changes to identity or geography have reasons and versions. Backend: existing project list/detail and registry sync; extend lifecycle/history and filtering. Drawer: project summary and source details.

### Community members list and participant detail

Appearance: counts for total, eligible, needs review and suspended; search; filters; Add member and Upload CSV. Columns include name, masked phone/account, verification states, location availability, allocation eligibility and payment history link. Avoid a single ambiguous Verified badge.

Participant detail shows identity decision, account-holder name result, consent evidence, location source, enrolment history, entitlement and payments. Sensitive identifiers remain masked and access logged. Changes preserve history; removal is a status change with reason, not deletion.

Backend: existing participants list/detail/payments, name-check and reasoned correction endpoints. Extend account-correction workflow: verify changed details before future payments, never rewrite a historical transfer destination. Drawer: participant quick view. Modal: suspend/reactivate with reason and effect on future distributions.

### CSV community import

Appearance: a dedicated step flow launched from Community members: template, upload, column mapping, preview, validation, confirm and results. Preview shows row numbers, normalised fields and exact issues. Group errors without exposing full identity values in unnecessary reports.

Behaviour: validate on the server, require actual consent evidence/reference, prevent duplicate enrolments and preserve accepted rows across retries. Show imported, rejected and pending-verification counts separately. Allow safe error-file download and resubmission of rejected rows. Real coordinates are optional according to project policy, with Missing location visible.

Backend: existing POST /api/projects/:id/participants accepts a batch of enrolments. Extend with persistent import job, per-row status and idempotent row keys for robust large imports. Never label an entire file successful after partial acceptance. Modal: confirm counts before import; drawer: row error details.

### Account and identity review

Appearance: a queue of members needing review with separate Identity, Bank account, Name match, Duplicate, Restriction and Payment eligibility results. Detail displays evidence permitted to the reviewer and a clear explanation of unavailable services.

Behaviour: verify BVN/NIN with supplied personal details, resolve bank/account name, compare names and inspect available account-identity linkage. Existing-account verification and provider wallet creation are distinct flows. NIN-only enrolment currently needs an existing account; do not promise automatic wallet creation for it. A manual decision cannot fabricate a provider pass. Record reason, reviewer and time for any allowed exception.

Backend: existing enrolment checks and name-check endpoint; extend a controlled review decision endpoint and recheck jobs. Eligibility is server-calculated. Disallow payment while mandatory checks remain unresolved. Modal: record permitted review outcome; unavailable actions explain the required external result.

### Project map

Appearance: OpenStreetMap basemap, layer control for boundaries, site/community points and permitted participant locations; period/run filters; status legend; search and a list toggle. The map fills useful viewport space without covering mobile navigation. Fit the actual selected features; show an intentional empty map when none exist.

Behaviour: points and boundaries can exist independently. Filter payments by one period/run so old successful payments do not make an unpaid current period look green. Clusters show counts and totals. Separate payment, eligibility and dispute layers. Missing locations remain in an associated table and denominator. Public and verifier views apply appropriate geographic precision.

Backend: existing private project map/boundary and coarse public geography are insufficient for a full verifier payment map. Extend server-side geographic queries, privacy transformations, geometry versioning and scoped payment joins. Drawer: feature/payment details, with link to full authorised record.

### Field agents

Appearance: agents table with invitation/activation/suspension, device status, enrolment counts, sync delays and exceptions. Detail shows scoped submissions and activity. Invite opens a short modal with name/email and expiry information; successful creation offers the actual invitation link.

Behaviour: redeem on the agent device, verify identity and activate before field capture. Suspension blocks new authorised activity without deleting submitted records. Revoke invitations explicitly. Backend: existing invite/redeem/revoke, agent identity/status and field-me APIs. Extend device loss/recovery and key rotation before offering a Reset device button.

### Wallet and funds

Appearance: account header; Available, Reserved and Total balance; confirmed credits; operator/community allocation summary; statement with debit/credit type, amount, status, running balance where reliable, project and reference. Include statement period and last reconciled time. Account details appear in a drawer with a safe Copy action.

Behaviour: incoming receipts open their automatic distribution. Financial balances come from reconciled bank evidence and reservations, not addition of arbitrary UI rows. Treat community commitments separately from cash balances. Unsupported withdrawal or refund controls must not appear operational. Operator withdrawal policy and approval requirements must be settled before enabling that action.

Backend: extend existing funding/reconciliation responses to include reservations and a durable account/statement model. Proposed wallet summary, transactions and receipt detail endpoints. Drawer: transaction history and linked bank events. Modal: only supported, authorised financial instructions with amount, destination and confirmation.

### Incoming payment detail

Appearance: receipt amount/currency, bank confirmation time, payer/reference where supplied, project attribution and status. Follow with the approved agreement version, eligible calculation basis, operator/community split and linked distributions. Show a chronological event timeline.

Behaviour: receipt confirmation triggers automation once. A receipt requiring net-revenue adjustments stays Needs allocation basis until an authorised, auditable basis is available; never guess allowable deductions. Receipts not tied to a project go to operations, not an arbitrary project wallet.

Backend: proposed incoming-receipt record and detail endpoint; existing funding notifications lack the full lifecycle. Drawer: original sanitised provider event. Modal: controlled attribution correction before allocation or formal correction after allocation; never a silent reassignment.

### Automatic distributions list and detail

Appearance: replace the normal New payment run emphasis with automatic runs grouped by incoming receipt. Show receipt, agreement version, community allocation, paid/processing/held/failed totals and creation time. Detail has Overview, Recipients, Events and Evidence tabs.

Behaviour: read progress, inspect blocked recipients, recheck uncertain transfers and perform only eligible retries. Initial authorisation is inherited from the active policy; recovery actions still need role checks and reasons. Record the unchanged original entitlement when an account is blocked. Do not redistribute held money automatically.

Backend: existing runs/arithmetic/preflight/execute/transfers/requery/retry/cancel support controlled run processing. Extend automatic creation from incoming receipts and immutable receipt/allocation/roster links. Preserve idempotency per distribution and recipient. Drawer: transfer detail. Modal: scoped eligible retry with duplicate-risk check, affected amount and reason. Never expose a blanket Retry all button for unknown outcomes.

### Messages and delivery

Appearance: event/channel/status filters; recipient masked; template/event, sent time and delivery status; detail timeline with permitted message preview. Show failed contact information as an actionable member issue. Provide preference/consent visibility.

Behaviour: use WhatsApp for agreed notices and alerts, secure receipt links and complaint acknowledgements. Record actual provider delivery callbacks. Retry only retryable failures under a documented policy. SMS fallback follows consent and product policy. Do not send duplicate receipts for duplicate bank callbacks.

Backend: current SMS notifications and callbacks exist. New channel-aware provider adapter, WhatsApp callbacks, templates, delivery attempts and paginated messages endpoints are required. Drawer: message attempts; modal: controlled resend with recipient/channel, not arbitrary sensitive free text.

### Disputes

Appearance: searchable list showing category, related payment, age, amount and status. Detail displays recipient statement/evidence, bank outcome, responses and a chronological history. Response composer has one Send response action with confirmation after persistence.

Behaviour: developer response is not independent resolution. Keep resolved cases resolved when new responses are added. Failed delivery of a response is visible separately. Backend: existing project disputes/detail/respond, receipt dispute and evidence endpoints; extend independent resolution access where required. Drawer: evidence preview; modal: authorised resolution with basis and audit trail.

### Documents and commitments

Appearance: document library with original files, extraction status, active agreement, drafts and version history. Review workspace opens source and fields together. Each version identifies author, time and effective scope.

Behaviour: automatic save applies to drafts; explicit approval activates future rules. Replacing a document preserves original evidence. Show allocations using an older version without changing them. Backend: extend extraction/commitment foundations with document versions, draft revisions and comparison/history APIs. Drawer: change comparison; modal: approve future rule version.

### Ledger and proofs

Appearance: event list filtered by funds received, allocation, payment outcome, reversal, period publication and correction. Each row shows business event time, amount if applicable, bank evidence status and ledger proof status. Detail links receipt, allocation, transfer and signed report.

Behaviour: distinguish database audit history from independently anchored proof. Show transaction/topic/sequence/consensus time when available, network and verification result. No participant PII goes on chain. Pending anchoring does not mark a completed bank transfer unpaid. The current Hedera adapter anchors attestation hashes on testnet; event-level funds anchoring is new work.

Backend: existing attestations, anchors, audit, chain and verification handlers. Extend event-ledger schema and authorised proof-read APIs; ledger entries must be append-only with compensating correction events. Drawer: evidence/proof inspector; modal: verification results only after actual verification.

### Reports and settings

Reports show period coverage, financial fulfilment, confirmations, disputes, shortfalls, reconciliation and proof status, with accessible tables and supported downloads. Date changes clear stale export selection. Exports retain the same filters and privacy scope as the screen. Existing attestation/report endpoints provide a foundation; complete wallet statements and earnings reports need extension.

Settings groups organisation, project, accounts, automation, team, messages, security and integrations. Only supported functions are editable. Automation changes display effective time, actor and reason. Integration secrets are never echoed to the browser. Team management, API keys and some notification controls require new backend contracts rather than placeholder success messages.

## Other workspace pages

### Field home enrolment and queue

Home shows active project, device status, connection state, saved captures and outstanding sync items. Enrolment steps are Consent, Personal details, Account or wallet, Location and evidence, Review and Submit. Back preserves values. Use actual capture time and GPS when available; missing GPS and outside-boundary exceptions remain explicit. For points-only projects, an unavailable boundary check is not a false failure.

The review page summarises masked data and required evidence. Submission first persists to the encrypted device queue, then syncs when possible. Queue rows show Local only, Uploading, Accepted or Needs correction. Accepted items are not resubmitted; rejected rows retain safe correctable data. Submission success and server acceptance are visibly different.

Record detail is read-only after acceptance except through authorised correction. Profile shows the named agent and device status. Backend: existing field-me, enrolments, evidence and device binding; extend point-only eligibility and supported device recovery. Overlays: evidence preview, consent explanation and safe leave with unsaved capture.

### Participant receipts and complaints

Receipt is mobile first: project name, amount, payment status/date, masked recipient details and two clear actions, Confirm received and Report a problem. Do not require a general app account. Token expiry offers a safe assistance route without exposing another participant's data.

Confirm received changes state only after server acknowledgement. Report a problem offers Not received, Wrong amount or Not my payment, optional explanation and supported voice evidence. Acknowledgement shows reference and what happens next. Backend: existing scoped receipt read/confirm/dispute/evidence routes. WhatsApp links are new transport around these flows. Repeated confirmation is handled safely; complaint submission does not change the bank settlement state.

### Verifier overview projects and payment map

Overview shows watched projects, new period records and actionable alerts. Projects supports search and permitted filters. Project detail opens a summary with commitment, income/distribution totals permitted for that role, period selector and Map/Table switch. Green means confirmed paid, yellow processing, red failed and grey not started/unknown. Add explicit reversed/partial labels and a separate dispute badge.

Map-point details show permitted location, period, amount, bank outcome, confirmation and proof links. Role-approved precision can use community centroids or coarsened points; exact household coordinates require a specific entitlement and access logging. Aggregates must come from the same selected snapshot as the table. Missing-location payments remain counted.

Backend: existing verifier project reads are largely public-project summaries. New scoped payment-map/list endpoints are required; do not grant the verifier unrestricted operator endpoints. Drawer: payment evidence. Full proof detail supports independent verification without private identity data.

### Verifier comparison watchlist alerts and exports

Comparison aligns projects to comparable periods, basis and metric definitions. Watchlist manages monitored projects; alert setup captures project, condition, threshold and permitted delivery channel. Alerts show event evidence and delivery state. Export offers supported CSV/JSON/signed report formats and reports pending/failed generation honestly.

Backend: current compare, watchlist/alerts GET and POST, and export endpoints exist. Complete watch removal, alert edit/delete, WhatsApp delivery and any new private financial metrics need scoped contracts. Modal: create/edit alert. Drawer: alert evidence. Successful storage of an alert rule does not imply message delivery.

### Operations overview incoming exceptions and transfers

Overview prioritises unmatched receipts, delayed payments, reconciliation differences, failing jobs and provider incidents. Incoming exceptions shows confirmed funds awaiting attribution or calculation basis. Transfer exceptions groups unknown, failed, reversed and restricted outcomes with age and actionable reason.

An operations detail page combines sanitised bank events, reservations, allocation and worker attempts. Requery checks the existing payment; a retry is offered only after a definitive eligible failure. Freeze/unfreeze remains capability-driven and provider confirmation is separate from request submission.

Backend: current jobs, capabilities, exceptions, requery, recovery and funding foundations. New incoming-attribution and automatic-distribution exception APIs are needed. Overlays: attribution correction, retry review and documented action, each with reason and server authorisation.

### Operations reconciliation signals and cases

Reconciliation compares bank balance, receipts, payouts, charges, reversals and reservations as of the same time. A difference links to contributing events, not just a warning number. Signals shows unusual activity as investigation leads, with graph/table alternatives. Cases detail records evidence, decisions and provider actions.

Backend: existing reconciliation, signals/graph, cases/action, onward-sync and webhook recovery routes. Extend durable statement alignment, ledger entries and receipt-level differences. Never present a signal as proof of fraud or a queued account-control instruction as completed. Resolution requires a documented basis.

### Administration pages

Admin overview shows pending approvals, extraction reviews, integration health and chain verification exceptions. Onboarding approval displays organisation and source-account evidence. Extraction review uses the same source-and-fields layout with a reasoned versioned decision. Registry history displays source, digest, reviewer and time. Chain integrity displays linked records, signature checks and actual anchoring status. Escalations links the affected project/payment and recorded decision.

Backend: existing account-link, extraction-review, registry import/history and chain endpoints support parts of this. Complete KYB approval, general escalation queues, device recovery and institution provisioning are new or incomplete. Do not render a dead-end approve button where no authorised backend operation exists.

### Public pages

Home explains the product and leads to public records or sign-in. Register provides searchable project summaries. Project detail shows the published commitment, period payment coverage, shortfall, dispute totals and privacy-filtered geography. Operator profiles list their projects without private balances. Attestation detail shows original record, correction links, signed downloads and proof status. Verify accepts supported files/proofs and explains Valid, Invalid, Pending or Demonstration. Report provides the supported complaint route; about/privacy/terms remain readable on mobile.

Backend: existing public register/projects/developers/attestations/geography and proof verification. New private wallet information is not automatically public. Public results use published snapshots, with clear as-of dates. No login wall is added to these records.

## Drawer modal and popup inventory

Drawers open from lists and preserve the parent filter/scroll. Desktop width is approximately 420 to 560 px; complex evidence can use a wider authorised detail page. On mobile use a full-screen sheet with a visible close/back action. Modals are for focused decisions, never the entire onboarding journey. Avoid nested modals; closing an upload or save dialog must not imply cancelling server work.

| Surface | Contents | Completion condition |
| --- | --- | --- |
| Notifications drawer | Actionable alerts and read state | Read state saved; action opens relevant record |
| Geography preview drawer | Features, types, errors, map | Dataset accepted by server |
| Member drawer | Masked details, checks, entitlement | Inspection only; edits use authorised flow |
| Transfer drawer | Amount, bank outcome, attempts, receipt/proof | Outcome comes from bank evidence |
| Incoming receipt drawer | Attribution, amount, rule, distribution | Confirmed receipt and linked allocation |
| Account details drawer | Bank details, freshness, verification | No mutation from merely opening/copying |
| Version comparison drawer | Old/new fields, reason, actor | Inspection of saved versions |
| Proof drawer | Signed record, network, anchor verification | Verification request returns a result |
| Agent invitation modal | Name, email, expiry, resulting link | Invite actually persisted |
| Automation activation modal | Rules, scope, prerequisites | Policy activated with version and audit |
| Policy pause/change modal | Reason, effective scope, limitations | New policy state persisted |
| CSV confirmation modal | Valid, rejected and pending row counts | Import job accepted; completion tracked separately |
| Participant status modal | Reason and future payment effect | Status saved and audited |
| Eligible retry modal | Definitive failures, amounts, reason | Retry job accepted; no early paid message |
| Attribution correction modal | Project evidence and allocation impact | Controlled correction committed |
| Alert modal | Condition, threshold, channel | Rule saved; delivery remains separate |
| Unsaved changes dialog | Save/retry/leave choices | User choice respected; no silent loss |
| Session expired dialog | Sign-in and return | Session restored before mutation retry |

Toast notifications are short acknowledgements of confirmed actions, not the only location of important errors. Payment failures remain visible in the page. Tooltips explain terminology; essential instructions do not depend on hover. Destructive actions require explicit labels and a reason where relevant.

## Backend structure and ownership

The existing application has a Next.js frontend and a separate Fastify backend, PostgreSQL with PostGIS, bank/provider adapters and asynchronous jobs. UI state must not become the financial source of truth. Frontend page loaders read authorised APIs; mutations validate server-side, persist business changes and enqueue durable work. Workers handle provider requests, polling, messages, extraction and anchoring. Provider callbacks enter verified event handling before changing business outcomes.

### Existing implementation anchors

| Repository area | Current responsibility | Required extension |
| --- | --- | --- |
| backend/src/app.ts | Authenticated/public routes and provider callbacks | New scoped contracts; keep controllers thin |
| backend/src/service.ts | Enrolment, runs, events, jobs, audit, period closure | Receipt-triggered allocation orchestration |
| backend/src/bank.ts and providers.ts | Banking and external service adapters | Confirm live Access Bank contract; WhatsApp adapter |
| backend/src/models.ts and store.ts | Typed entities and PostgreSQL persistence | Wallet, receipt, allocation, policy and location entities |
| backend/src/batches.ts | Transfer batch preparation/submission/outcomes | Reuse with allocation-level idempotency |
| backend/src/core.ts | Money handling, signatures, hashing and faults | Preserve exact arithmetic and typed domain errors |
| app and components | Role shells, screens and reusable controls | Shared states, new pages and truthful feedback |
| lib/api | Client contracts and backend communication | Typed new endpoints and consistent error mapping |

Existing tables include projects, participants, agents, commitments, rosters, runs, transfers, attestations, anchors, audit, jobs, notifications, events, receipts and provider idempotency records. Existing receipts represent recipient confirmation links; use a distinct incoming_receipts entity for money received by the operator. Do not overload the existing receipt model.

### Proposed records

| Proposed entity | Important data and relationships |
| --- | --- |
| project_accounts | Organisation/project, provider account reference, currency, verification and readiness |
| incoming_receipts | Provider credit identifier, account, project attribution, confirmed amount/time, allocation status |
| automation_policies | Project, approved agreement version, timing, fee/hold policy, state, actor and effective time |
| allocations and allocation_items | Incoming receipt, rule and roster snapshots, totals, per-recipient/fund entitlement and hold reasons |
| wallet_journals and journal_lines | Balanced cash/reservation/payable events, currency, reference and compensating entries |
| location_datasets and location_features | Project, geometry type, source hash/version, provenance, participant/site links |
| document_versions and review_drafts | File hash/storage, extraction job, revision, source passages, saved draft and approval links |
| import_jobs and import_rows | File hash, row keys, validation, accepted entity and retry-safe outcome |
| message_attempts | Channel, consent/template, event key, provider reference and delivery timestamps |
| ledger_events and anchor_submissions | Sanitised evidence hash, predecessor/correction links, network, pending/submitted/confirmed state |

Schema names are proposed and require migrations. Store monetary amounts in exact minor units or validated decimal strings, never floating-point arithmetic. Use database uniqueness, transactions and locks for money invariants, not only request-level checks. Record actor/time/reason for relevant mutations. Apply organisation/project ownership in every query and job.

### Current API foundations

| Domain | Existing contract examples | What remains |
| --- | --- | --- |
| Project geography | POST /api/registry/boundary; GET/POST /api/projects/:id/boundary; GET /api/projects/:id/map | Point layers and point-only enrolment |
| Documents | POST /api/projects/:id/pdd; extraction status/job reads; PATCH commitment | Draft autosave, visible history, complex terms |
| Members | GET/POST /api/projects/:id/participants; participant detail/payments/name-check | Durable CSV jobs and fuller correction/review |
| Funding | GET /api/projects/:id/funding and /reconciliation | Full wallet model, reserved amounts and statement |
| Payment processing | Runs create/read/arithmetic/preflight/execute/transfers/requery/retry | Automatic creation from receipt and rule snapshots |
| Bank events | POST /hooks/forge | Provider-confirmed receipt normalisation and allocation trigger |
| Messages | SMS callbacks and notification summary | WhatsApp and channel-aware attempts/history |
| Evidence | Attestations/disclosure; public verification; admin chain | Event-level funds proofs and role-scoped history |
| Verifier | Project summaries, compare, watchlist/alerts, export | Payment-point map and management controls |

### Proposed API contract groups

These routes are a recommended design, not existing APIs. Exact payloads must be added to shared typed contracts before implementation.

- GET /api/projects/:id/dashboard returns amounts with definitions, selected currency/period and asOf/freshness metadata.
- GET /api/projects/:id/wallet and GET /api/projects/:id/wallet/transactions return verified account state, bank and reserved balances, and a paginated statement.
- GET /api/projects/:id/incoming-receipts and GET /api/incoming-receipts/:id expose confirmed incoming money and linked allocations.
- GET/PATCH /api/projects/:id/automation-policy plus POST activate/pause actions manage draft and approved effective versions with optimistic concurrency.
- GET /api/projects/:id/allocations and GET /api/allocations/:id expose automatic distributions; recovery actions remain scoped and reasoned.
- POST/GET /api/projects/:id/location-datasets and GET /api/location-datasets/:id/features manage point/polygon imports and source versions.
- GET/PATCH /api/projects/:id/commitment-draft and GET /api/projects/:id/commitment-history separate autosave from approval.
- POST /api/projects/:id/participant-imports and GET /api/participant-imports/:id provide persistent CSV status; rejected-row downloads redact unnecessary sensitive fields.
- GET /api/projects/:id/messages and signed POST /hooks/whatsapp provide channel history and authenticated delivery updates.
- GET /api/verifier/projects/:id/payment-map and /payments provide the same period-scoped, privacy-filtered dataset with pagination/clustering.
- GET /api/projects/:id/ledger-events and GET /api/ledger-events/:id/proof return authorised financial evidence and real anchoring status.
- GET /api/ops/incoming-exceptions and POST /api/ops/incoming-receipts/:id/attribute support controlled attribution and audit.

All list endpoints need bounded pagination, validated filters and stable sorting. Financial mutation endpoints need idempotency keys and conflicts that explain whether the earlier request succeeded. Jobs return a persisted identifier and a status read endpoint. Publish progress through scoped server events or bounded polling; reconnect by refetching authoritative state.

## Automatic payment lifecycle

### Sequence from incoming money to evidence

1. Access Bank or its contracted integration reports a credit. Authenticate the callback, normalise the event, persist a unique provider event and confirm its status. If needed, query the provider before recognising income.
2. Match the account/reference to exactly one project and currency. Unmatched or ambiguous funds remain Needs attribution with no payout.
3. Lock the incoming receipt and load the active automation policy, approved agreement and eligible roster snapshot. If no valid policy exists, preserve funds and explain the blocker.
4. Determine eligible revenue. If the agreement uses net revenue, accept only approved, evidenced deductions; if the basis is unavailable, hold allocation rather than assume gross equals net.
5. Calculate operator share, community obligations and any separate fund. Use deterministic rounding that preserves the total; keep held entitlements attributable to their owners.
6. Persist the allocation, entitlement items, balanced journal/reservations and an outbox job atomically. Uniqueness on receipt/allocation prevents duplicate distributions.
7. Run preflight against current account restrictions, funds, fee treatment and provider readiness. Preserve blocked recipients and their amounts. Submit the eligible scope automatically under the previously approved policy.
8. Send transfer batches with stable recipient/entitlement keys. A network timeout becomes Unknown, not Failed; reconcile or requery before any retry.
9. Apply authenticated provider outcomes monotonically, allowing explicit reversals. Complete paid/reservation/journal updates transactionally. Duplicate callbacks do not change totals twice.
10. Queue WhatsApp receipt messages from persisted payment outcomes. Store provider delivery results separately. A message failure does not reverse a payment.
11. Collect recipient acknowledgement or complaints through scoped links. Operations handle exceptions with reasons. Release or re-reserve funds only according to the actual bank outcome and policy.
12. Reconcile and publish period results. Sign the report, anchor the approved evidence hash, show confirmation/network and append corrections when later evidence changes the record.

Use a durable outbox so a committed allocation cannot lose its worker job. Retry jobs with bounded backoff, stable keys and a dead-letter/attention queue. Workers must survive restart without repeating payment. Keep the automation path server-side; a user closing the browser cannot stop it.

### State definitions

| Object | States shown to users | Key constraint |
| --- | --- | --- |
| Incoming receipt | Awaiting confirmation, Received, Needs attribution, Allocating, Allocated, Reversed | Received only after trusted confirmation |
| Automation | Needs setup, Active, Paused, Needs attention | Version and effective scope are explicit |
| Distribution | Preparing, Blocked, Processing, Partly paid, Paid, Needs attention | Derived from entitlement and transfer outcomes |
| Transfer | Not started, Held, Submitted, Processing, Paid, Failed, Unknown, Reversed | Unknown never becomes a blind retry |
| Message | Queued, Sent, Delivered, Read, Failed | Provider status is separate from bank status |
| Evidence anchor | Not requested, Pending, Submitted, Confirmed, Failed, Demonstration | Network and verification result remain visible |

### Balance and earnings definitions

Income received is confirmed project credits, with reversals represented separately or netted under an explicit definition. Earnings is the accounting interpretation, not an interchangeable label for all wallet credits. Community obligation is calculated under the approved basis and rule. Operator share is the contractual remainder, not automatically unrestricted cash. Reserved is money held for approved outgoing obligations. Available is the reconciled spendable balance after applicable reservations and restrictions, without subtracting the same bank hold twice.

Paid means confirmed settled transfers. Processing and unknown amounts are separately visible. Outstanding obligation equals recognised obligation less net settled community payments, adjusted by explicit correction events. Charges are not household income. Present original obligation, paid, held and unpaid amounts so exclusions cannot inflate the apparent fulfilment rate.

For a simple illustrative NGN 1,000,000 confirmed gross receipt with an approved 20 percent household share, the household obligation is NGN 200,000 and the operator allocation NGN 800,000 before applicable fees/other restrictions. If NGN 150,000 settles, NGN 30,000 processes and NGN 20,000 is held, the outstanding household obligation is NGN 50,000. Do not count that processing money as already paid or imply the operator can withdraw reserved community funds.

### Complex agreement handling

The supplied sample document specifies 30 percent of eligible net revenue split between 20 percent household benefits and 10 percent community restoration fund, weighted household allocation and a cleared-proceeds deadline. Equal household distribution of the full 30 percent would be incorrect. Build separate beneficiary/fund allocation types and weighted calculations, or keep activation blocked with a precise explanation until those rules are supported.

An agreement deadline and reporting cadence are different fields. Automatic processing begins on receipt, but actual disbursement must respect the approved contractual schedule. A milestone or staged requirement needs an explicit release condition; it must not be bypassed simply because the account was credited.

## Privacy security and trustworthy feedback

Server authorisation must protect every workspace and record, including exports, streams and background jobs. Field agents see only permitted project/own records. Verifiers get explicit read scopes, not operator access. Bank operations and platform administration use distinct capabilities. Log sensitive-data access where required. Token links are scoped, expiring and revocable.

Verify callback signatures over the required original payload, reject stale/replayed events according to the contracted provider protocol and persist deduplication identifiers. Keep bank, WhatsApp, encryption and signing secrets on the server. Encrypt sensitive evidence and minimise retained identifiers; never expose raw identity values in logs or screenshots by default.

User language should explain actions: We could not confirm this account; Check payment status; Your changes are saved; This payment needs attention. Keep internal error codes, database names, API failures and implementation details out of routine screens. A technical reference can be available to authorised support without becoming the primary message.

## Delivery phases and acceptance checks

### Phase one Financial foundation

Confirm the live Access Bank integration contract, account ownership/provisioning, supported callback events, settlement meaning, fees, restrictions, reversals and query capabilities. Implement project receipt attribution, wallet journals/reservations and metric definitions. Acceptance: balances reconcile, unknown is not zero, cross-project income cannot be allocated and duplicate credits produce one receipt.

### Phase two Automatic allocation

Implement approved policy versions, supported allocation types, roster snapshots, atomic reservations and outbox jobs. Integrate existing batch processing. Acceptance: one confirmed receipt produces one allocation; restarting a worker does not duplicate payouts; blocked members retain entitlements; policy changes do not rewrite old runs; insufficient fees/funding produce an actionable hold.

### Phase three Setup members and communications

Implement point datasets and boundary-optional enrolment rules, durable CSV import, visible account checks, autosaved review drafts and history. Add WhatsApp provider and callbacks. Acceptance: point-only KML saves without a fake boundary; refresh restores a saved draft; concurrent edits conflict safely; partial CSV imports report exact outcomes; delivery status matches provider evidence.

### Phase four Operator and verifier experience

Deliver earnings dashboard, wallet statement, automatic distribution detail, exception drawers and verifier payment map/table. Acceptance: every amount drills into matching records; period filters remain consistent; missing locations remain counted; colour has text alternatives; private details do not leak through maps or exports.

### Phase five Evidence and production readiness

Complete signed period publication, intended Hedera anchoring scope, corrections and operations recovery. Acceptance: pending anchoring is not claimed confirmed; testnet is labelled; original records survive corrections; a receipt reversal remains traceable; scheduled workers run without an open browser.

### End to end test scenarios

- Account creation, expired verification/reset, sign-in return path and role rejection.
- Point-only, polygon-only and mixed uploads; malformed geometry; missing GPS; privacy-filtered maps.
- Document processing failure/recovery; autosave retry; concurrent review; unsupported terms; version changes during an active distribution.
- CSV duplicate/partial failure; identity mismatch; account-name uncertainty; provider outage; account correction and re-verification.
- Confirmed receipt, duplicate callback, ambiguous project, reversed credit, net-basis blocker, paused automation and currency mismatch.
- Automatic split/rounding, insufficient charges, held entitlements, transfer timeout/requery, eligible retry and bank reversal.
- WhatsApp opt-out, callback replay, undelivered message, repeated receipt confirmation and duplicate complaint.
- Wallet/statement/run/map/report reconciliation; period closing; late correction; actual proof verification.
- Keyboard and reduced-motion use; 320/375/768/1024/1440 px layouts; long names, large amounts, empty lists and slow networks.

### Decisions required before enabling real money

Settle whether accounts are dedicated per project or share a strict reference-attribution scheme; allowable net-revenue deductions and approvals; who bears charges; treatment of operator withdrawals/refunds; handling of incoming reversals after payouts; partial-distribution/hold policy; roster effective dates; community fund destination/approval rules; exact verifier geographic permissions; WhatsApp opt-in/fallback policy; and the event scope/network for Hedera proofs. These choices must become explicit policy and tests, rather than silent UI assumptions.

## Source and implementation notes

Product sources are the supplied Attest Concept, Product Specification and Frontend Handoff documents, the supplied sample PDF/KML and the owner's subsequent clarifications. The extracted updated handoff and original handoff had identical text; the short handoff numbered 1 addresses contrast. The owner's automatic-distribution, point support, WhatsApp and wallet requirements take precedence where older walkthroughs differ.

Implementation references are backend/src/app.ts, service.ts, models.ts, store.ts, bank.ts, providers.ts and batches.ts; app, components and lib/api; and app/styles/tokens.css. Repository inspection took place on 12 November 2026. Live banking, messaging and anchoring readiness must be established independently of demo behaviour. This document describes the required application and makes no claim that new routes, schemas or screens are already deployed.
