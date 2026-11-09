# Attest — full product specification

Version 1.0 · 9 November 2026 · Lydia Solomon, Raheem Akapo, Abiodun Mark

---

## 0. The one-line

Carbon projects promise communities a share of what their work earns. The money is paid in cash, which means nobody can prove it arrived. Attest moves that money through the bank and emits a record that cannot be written after the fact.

Three principles govern every screen in this document. If a design decision contradicts one of them, the decision is wrong.

**1. The record is computed, never typed.** No field anywhere in this product lets anyone enter a coverage figure. Coverage exists only as a function of transfers that cleared through the bank. A developer cannot author their own number, and neither can we.

**2. Coverage, not conduct.** The record states what fraction of enrolled households were paid and what fraction were not. It never states that a project is good, compliant, ethical or certified. We publish facts and let institutions form verdicts. This is also what keeps us out of the ratings-agency fight we would lose.

**3. Non-participation is visible.** A project that enrols two thousand households and pays four hundred has a coverage of twenty percent, and that is published. A system that only shows successful payments is a marketing tool. The denominator is the product.

---

## PART ONE — THE ENTIRE SOLUTION

### 1.1 The seven surfaces

**Used daily**

| Surface | Who | Exists to |
|---|---|---|
| Developer console | Carbon project operators | Enrol, fund, disburse, answer disputes |
| Field app | Field agents / enumerators | Capture households at the point of enrolment |
| Participant channel | Households | Know they are enrolled, know they were paid, say when they were not |

**Read**

| Surface | Who | Exists to |
|---|---|---|
| Public register | Anyone — buyers, press, communities, NGOs | Look up any project's coverage without asking permission |
| Verifier portal | Buyers, auditors, registries, lenders, investors | Due diligence at period and transfer granularity, with export |

**Operated**

| Surface | Who | Exists to |
|---|---|---|
| Bank operations console | Access Bank ops and compliance | See the onward flow of money after it lands — the view only a bank has |
| Platform admin | Attest | Onboarding review, registry sync, extraction QA, chain integrity |

### 1.2 The object model

Everything in the product is one of eleven objects. Getting these right is most of the architecture.

**Project** — a carbon project. Registry ID, registry of record, country, methodology, boundary polygon, issuance history, status.

**Commitment** — the declared promise, extracted from the project design document. Percentage, basis (gross or net revenue), cadence, beneficiary definition, source quotation, source page. This is the denominator of everything. Plan Vivo mandates sixty percent. Acorn mandates eighty. Kenyan law requires twenty-five. The commitment is not our opinion; it is the developer's own published words, held against them.

**Participant** — a household. Identity-verified, phone, wallet, enrolment location, enrolling agent, enrolment timestamp, status, flags.

**Roster** — the set of participants a project declares entitled for a given period.

**Disbursement run** — one batch. Period, declared gross, required amount, funded amount, roster, state.

**Transfer** — one payment to one participant. Amount, NIBSS session ID, idempotency key, timestamps, state, failure classification.

**Confirmation** — the participant's own acknowledgement that they received it. Deliberately separate from the transfer. A transfer that settled but was never confirmed is its own state, and it is visible.

**Attestation** — the emitted record for a closed period. Derived, hashed, chained, signed, timestamped, immutable.

**Dispute** — a claim from a participant or a third party. Checkable against transfers.

**Signal** — a fraud indicator from bank-side analysis.

**Agent** — a named, identity-verified field worker. Every enrolment carries one.

### 1.3 What is Access Bank's and what is ours

**Theirs.** Account creation, identity verification, tiered KYC, NIP transfers, balances, statements, onward-flow visibility.

**Ours.** Who is entitled, whether they were paid, whether they confirmed it, what the commitment was, and what the record says.

The pitch line: we are not building a bank, and we are not asking anyone to trust a startup. We are building the one artefact a bank can manufacture and nobody else can — a settlement record — and pointing it at a market that has stopped believing claims.

---

## PART TWO — THE USER FLOW, END TO END

Thirty-five actions, in order, each tied to the one before it.

### Phase 0 — Developer onboarding

**1.** Developer lands on attest.ng and signs up. First field is the registry project ID, not a company name. The project is the primary object; the company is secondary.

**2.** System pulls the project from the registry of record — Gold Standard public registry API, Berkeley Voluntary Registry Offsets Database for the rest. Returns boundary polygon, methodology, issuance history, vintages. *Why this first: if the project does not exist in a registry, there is nothing to attest and onboarding stops here.*

**3.** Developer uploads the project design document. Extraction runs on it and returns the declared benefit-sharing commitment — the percentage, the basis, the cadence, the beneficiary definition — together with the exact sentence it came from and the page number.

**4.** Developer reviews the extraction and confirms or corrects it. Both the extraction and any correction are stored. *Why: the commitment has to be quotable and the correction has to be on the record, or a developer can quietly revise their own promise downward.*

**5.** Access Bank runs KYB on the developer entity. A corporate disbursement account is opened via Wallet-as-a-Service.

**6.** Project goes live on the public register immediately, with zero households enrolled and zero paid. *Why this matters more than it looks: if projects only appear once they have paid someone, the register is a self-selected showcase. Appearing at zero is what makes the register meaningful.*

### Phase 1 — Enrolment

**7.** Developer sets the roster target: household count, communities, period.

**8.** Field agents are issued credentials. An agent is a named person with their own verified identity and a bound device.

**9.** Agent visits a household and captures: name, phone, BVN or NIN, GPS at the moment of capture, photograph of the household head, recorded consent.

**10.** The device checks the capture point against the project boundary polygon. Outside the polygon the enrolment is **flagged, not blocked**. *Why: legitimate edge cases exist — a household that farms inside the boundary and sleeps outside it — and hard blocks teach agents to falsify coordinates. A flag is information. A block is an incentive to lie.*

**11.** Offline capture queues locally with its original timestamp and location signed by the device key. On sync, the server records both capture time and receipt time. A large gap is not an error, but it is a recorded fact.

**12.** Identity verification runs against the bank. Name-match score returned. Below threshold goes to a review queue rather than failing silently.

**13.** Duplicate identity across the whole platform is detected and **blocked**, with an explanation. This is the one hard block in enrolment. Biometric identity uniqueness is the floor the entire anti-fraud design stands on.

**14.** A wallet is created through WaaS at the tier the verification supports.

**15.** Household receives an SMS: you are enrolled in project X, you are entitled to a share of what it earns, your wallet ends in NNNN, here is how to check. **This is sent before any money moves.** *Why this is one of the most important actions in the product: a household that was never told it was enrolled cannot notice that it was never paid. Telling them first converts them from a line item into a witness.*

### Phase 2 — Funding

**16.** Credits sell. Developer receives buyer proceeds.

**17.** Developer opens a new disbursement run: period, roster, declared gross revenue, funding amount.

**18.** The commitment arithmetic panel shows the working in full. Commitment sixty percent of gross. Declared gross ₦X. Required ₦0.6X. Funding ₦Y. Shortfall ₦Z. *Why the shortfall is shown and the run is still allowed to proceed: blocking underfunding sends the payment back to cash, where nothing is recorded at all. Allowing it and recording it is how the shortfall becomes visible.*

**19.** Developer funds the disbursement account. One inbound payment.

**20.** Pre-flight check runs across the roster: dormant wallets, failed verification, duplicate account numbers, flagged enrolments, tier limits that the per-household amount would breach. Developer resolves or proceeds with exclusions, and the exclusions are recorded with reasons.

### Phase 3 — Disbursement

**21.** Run executes as batched NIP transfers through WaaS. Each transfer carries an idempotency key derived from run ID plus participant ID.

**22.** Live progress per transfer: queued, in flight, settling, settled, failed.

**23.** Failures are classified rather than lumped: invalid account, dormant account, limit exceeded, network timeout, insufficient funds. Each class has its own remediation path, because "failed: 212" is useless to the person who has to fix it.

**24.** Each settled transfer fires an SMS to the household: amount, date, project, and how to confirm or report a problem.

### Phase 4 — Confirmation

**25.** Household confirms receipt by SMS reply, USSD, or a tokenised receipt link. The confirmation is a separate signal from the settlement, generated by a different party.

**26.** A transfer that settled but is unconfirmed after seven days raises a soft flag. *Why it is soft: phones get lost, numbers change, people ignore SMS. One unconfirmed transfer means nothing. A project where forty percent of settlements are never confirmed looks materially different from one where three percent are, and that difference is the product.*

**27.** Household can dispute in three plain-language categories: I never received this, someone else collected it, the amount was wrong. Free text and voice note optional.

**28.** The dispute is counted on the public register from the moment it is raised, before it is resolved. *Why, and this is the part that will be challenged: a register that only shows resolved disputes is controlled by whoever resolves them. The count of open disputes is published; so is the count of disputes that turned out to be unsubstantiated. A developer who attracts weaponised complaints is protected by the fact that every complaint is checkable against a settlement record.*

### Phase 5 — Attestation

**29.** Period closes on its scheduled date. Nobody triggers this manually.

**30.** The attestation is computed: enrolled N, paid M, coverage M/N, amount committed, amount moved, shortfall, confirmations C/M, disputes open at close, disputes substantiated, signal counts by class.

**31.** The canonical document is hashed, chained to the previous period's hash, signed, and anchored to a public ledger for third-party timestamping.

**32.** Published to the register, pushed to the verifier portal, available as a signed PDF and a machine-readable payload. It cannot be edited. A correction is a new record that references and supersedes the old one, dated when the correction was made.

### Phase 6 — The read side

**33.** A buyer in due diligence looks up the project and sees coverage over periods. A lender assessing the developer for working capital looks across all of that developer's projects, and the coverage history is the credit signal. A registry pulls the machine-readable payload into its own review. A community organisation sees the disputes.

### Phase 7 — The bank side, continuous

**34.** Onward-flow monitoring runs on where money goes after it lands. Four hundred household wallets sweeping into three accounts within forty-eight hours is the signature of a developer paying themselves through dummy households, and it is invisible from outside a bank. Clustering of enrolment coordinates, device fingerprint reuse across enrolments, and dormancy-then-sweep patterns are the supporting signals.

**35.** Signals go to bank operations as cases, not to the public as accusations. The published form is a count: N accounts under review this period. A substantiated case becomes a correction in the period it was found, not a rewrite of the period it occurred in.

---

## PART THREE — SCREEN BY SCREEN, WITH STATES

### 3.1 attest.ng — public

**Landing**
The one-line. The mechanism in three steps. A live strip of register figures — projects, households enrolled, amount settled, median coverage. Two entry points: for developers, for institutions. No testimonials, no logos we have not earned.
*States:* default; register-data unavailable (strip collapses, page does not break).

**Public register index**
Searchable, sortable table: project, country, registry ID, commitment, enrolled, paid, coverage, last closed period, open disputes.
*States:* loading skeleton; populated; filter returns nothing; search returns nothing; sort applied; pagination.

**Project page**
Commitment, with the quoted source sentence and page reference. Coverage by period as a series. Period table. Confirmation rate. Open and substantiated disputes. Signal count. Enrolment distribution map, aggregated to coarse buckets. Download signed attestation.
*States:* onboarded but no period closed (shows commitment and zero, explicitly); one period; many periods; period closed late; project suspended; project withdrawn (record remains, marked withdrawn); correction present on a prior period.

**Developer page**
Every project under one operator, aggregate coverage, trend across periods.
*States:* single project; multiple; one project withdrawn.

**Attestation page**
A single immutable record. Its figures, its hash, its position in the chain, its anchor reference, a verify action.
*States:* valid; superseded by a correction (both shown); anchor pending; chain discontinuity warning.

**Verify**
Two modes. **Period verification:** paste a hash or upload a downloaded attestation PDF; confirms it matches the chain and reports the anchor timestamp. **Single-transfer verification:** paste a disclosure bundle (leaf, proof path, root reference); confirms that transfer belongs to the stated period and was anchored at the stated time, without disclosing anything else in the tree.
*States:* match; no match; malformed input; proof path invalid; leaf does not belong to the named root; anchor unreachable (hash and proof still verifiable locally).

**Public dispute intake**
Anyone may raise a claim about a project without an account.
*States:* form; submitted; rate-limited; project not found.

### 3.2 Developer console

**Onboarding wizard** — registry lookup → PDD upload → extraction review → KYB → account link.
*States per step:* empty; in progress; pending external review; rejected with a reason and a path forward; complete. Plus: registry ID not found; registry API down (manual entry queued for admin review); PDD unreadable; extraction confidence low (field pre-filled and marked for attention); KYB pending; KYB rejected.

**Home**
Coverage this period. Open shortfall. Enrolled against target. Next close date. Open disputes. Flagged enrolments. An action list, ordered by what blocks the next payment.
*States:* pre-first-enrolment; enrolling; run in flight; period closing in under seventy-two hours; period closed; shortfall outstanding; disputes outstanding; account suspended.

**Roster**
Participants: name, masked phone, wallet state, verification tier, enrolment date, agent, flags. Filters on every column.
*Bulk actions are deliberately limited.* No bulk delete. Removal is a status change requiring a reason, and the removal is visible in the next attestation as a roster change. *Why: the obvious attack on a coverage denominator is to delete the households you did not pay.*
*States:* empty; populated; filtered; filtered-empty; import in progress; import partially failed; rows with flags.

**Participant detail**
Enrolment record, capture location and time, sync delay, enrolling agent, verification result, payment history, confirmations, disputes.
*Edit rules:* phone correctable with a logged reason. Identity not editable. Status changeable with a reason.
*States:* active; flagged; excluded from current run (with reason); disputed; duplicate-blocked; removed.

**Agents**
Agent list with enrolments, flag rate, average sync delay, status.
*States:* active; suspended; flag rate above threshold (surfaced, not hidden).

**Runs**
*States:* draft; awaiting funding; funded; pre-flight running; pre-flight failed; executing; partially complete; complete; cancelled; failed.

**New run**
Period selector, roster selection, declared gross, funding amount, the commitment arithmetic panel showing its working, pre-flight results, confirmation step.
*States:* draft; shortfall warning; exclusions required; funding not received; funding partial; roster empty; period already closed; ready to execute.

**Run detail, live**
Per-transfer table with state, progress totals, failure breakdown by class, retry control per class.
*States:* queued; in flight; settling; settled; failed-retryable; failed-terminal; retry in progress; run paused; run complete with failures outstanding.

**Funding**
Disbursement account details, inbound payments, balance, reconciliation against outbound transfers.
*States:* no funding received; funded; over-funded (balance carries); reconciliation mismatch (flagged for both developer and bank ops).

**Disputes**
Queue with the underlying transfer evidence attached to each. Developer responds; the response is logged.
*Resolution is not self-certified.* A dispute closes on either a participant confirmation or a reversal, not on the developer's assertion.
*States:* open; developer responded; awaiting participant; substantiated; unsubstantiated; escalated to platform.

**Attestations**
Closed periods, figures, downloads, chain position.
*States:* none yet; published; correction issued; anchor pending.

**Settings** — users and roles, notification preferences, API keys, webhook endpoints.

### 3.3 Field app

**Login** — agent credential plus device binding.
*States:* unbound device (binding request to developer admin); bound; credential expired; offline (cached session with an expiry).

**Today** — enrolments captured, queue pending sync, target remaining.

**New enrolment** — consent → identity → details → photograph → location → review → submit.
*States:* GPS acquiring; GPS unavailable (submit allowed, flagged); GPS outside boundary (warning, reason required, allowed); identity service unreachable (queued); identity name mismatch (allowed, queued for review); duplicate identity (blocked with an explanation the agent can read aloud); photograph failed; consent not recorded (cannot proceed); offline (queued); submitted.

**Sync queue** — pending items, retry, conflicts.
*States:* empty; pending; syncing; partial failure; conflict requiring resolution.

**Enrolment detail** — read-only after submission. Corrections go through the console with a reason. *Why: an agent who can edit a submitted enrolment can retrofit it to pass a check.*

**My record** — the agent's own flag rate and sync delay, visible to them. *Why: people behave differently when they can see their own number before anyone else raises it.*

### 3.4 Participant channel

Not an app. Households will not install one.

**Enrolment SMS** — project name, entitlement in plain language, wallet last four, how to check.

**USSD menu** — check enrolment, check last payment, confirm receipt, report a problem. Language selectable.
*States:* enrolled; not found; no payments yet; last payment shown; confirmation recorded; dispute opened; session timeout.

**Payment SMS** — amount, date, project, confirm instruction.

**Receipt page** — mobile web, tokenised link, no login, built to load on a slow connection. Payment history for that project, confirm and dispute actions.
*States:* valid token; expired token; already confirmed; dispute already open.

**Dispute flow** — three plain categories, optional free text, optional voice note, acknowledgement of what happens next and when.

### 3.5 Verifier portal

**Project list** with saved searches and a watchlist.

**Project detail**, deeper than public: period-level transfer counts, confirmation rates, dispute detail with status and resolution basis, signal counts by class, enrolment distribution, agent flag rates in aggregate.

**Developer comparison** — side by side on coverage, confirmation rate, dispute rate, shortfall history.

**Export** — signed attestation bundle, CSV, API access.

**Alerts** — notify me when coverage drops below a threshold, when a dispute is raised, when a period closes late, when a correction is issued.
*States:* no watchlist; alerts configured; alert fired.

### 3.6 Bank operations console

**Signals queue** — onward-flow concentration, enrolment geo-clustering, device fingerprint reuse, dormancy-then-sweep, velocity anomaly. Each with severity and the accounts involved.

**Account graph** — where the money went after it landed, hop by hop. *This is the view that cannot be built outside a bank, and it is the answer to the central fraud objection.*

**Case management** — open, investigating, substantiated, unsubstantiated, closed. Actions: freeze, request documentation, escalate, clear.

**Verification exceptions** — failed checks, name mismatches, tier limits reached.

**Settlement reconciliation** — inbound developer funding against outbound transfers against balances, per project per period.

### 3.7 Platform admin

Project onboarding review. Registry sync status and failure log. Extraction review queue for low-confidence commitment parses. Dispute escalation. Attestation chain integrity monitor with alerting on any discontinuity.

---

## PART FOUR — TECHNICAL ARCHITECTURE

### 4.1 Shape

One API. One web application serving role-scoped surfaces. One mobile application for agents. One SMS and USSD gateway. One worker tier for batch execution and period close.

### 4.2 Stack

- **API** — Node and TypeScript, REST with webhooks out.
- **Data** — PostgreSQL with PostGIS. PostGIS is not optional: boundary containment becomes a query rather than hand-rolled geometry, and it is what makes the map work on the front end tractable.
- **Queues** — Redis, with a durable job store for disbursement batches.
- **Web** — React, one application, role-based routing.
- **Field app** — PWA with a service worker and IndexedDB for the offline queue, installable, no app store review in the way of a demo.
- **Banking** — Access Bank Wallet-as-a-Service for accounts, verification, tiering, and NIP transfers.
- **Extraction** — Huawei LLM access for project design document parsing, returning structured commitment fields with source spans and confidence.
- **Anchoring** — Hedera Consensus Service, one message per period close.

### 4.3 Services

1. **Identity and access.** Roles: developer admin, developer operator, agent, verifier, bank ops, platform admin. Scoped to project for developers, global read for verifiers.
2. **Project.** Registry sync, boundary polygons, issuance history, status.
3. **Extraction.** PDD to structured commitment, with source span, page reference and confidence. Below threshold routes to human review.
4. **Enrolment.** Participant lifecycle, verification, deduplication, geo-validation, offline sync reconciliation.
5. **Wallet.** Thin wrapper over WaaS. Account creation, tier management, balance.
6. **Disbursement.** Run construction, pre-flight, batch execution, idempotent retry, per-transfer state machine.
7. **Attestation.** Period close, computation, canonicalisation, hashing, chaining, signing, anchoring, publication. Append-only.
8. **Signals.** Onward-flow graph analysis, coordinate clustering, device reuse, dormancy patterns.
9. **Notification.** SMS, USSD session state, templates per language.
10. **Public register.** Read-optimised and cached, serving aggregated figures only.

### 4.4 The chain, concretely

The record is built in two layers, and the second layer is what makes it usable by an auditor without exposing a single household.

**Layer one, the transfer tree.** Every settled transfer in the period becomes a leaf: pseudonymous participant ID, amount, settlement timestamp, a hash of the NIBSS session ID, and the confirmation flag. Each leaf is hashed and the leaves are assembled into a Merkle tree. The root is a single value that commits to every transfer in the period without revealing any of them.

**Layer two, the attestation.** A canonical JSON document containing: project ID, period, enrolled count, paid count, amount committed, amount moved, confirmation count, disputes open at close, disputes substantiated, signal counts by class, the Merkle root from layer one, and the previous attestation's hash. SHA-256 over the canonical serialisation, signed with the platform key, and published as a single Hedera Consensus Service message.

**Why two layers rather than one hash.** A single period hash is all-or-nothing: it proves the aggregate figures have not moved, and it proves nothing about any particular payment. With the tree, an auditor who asks whether one named household was paid in Q3 can be handed four things, and nothing else: the leaf, its proof path, the root, and the anchored attestation. They verify the household's payment belongs to that period without ever seeing the roster, the other amounts, or anyone else's identity. Selective disclosure rather than publish-everything-or-prove-nothing. This is also what lets a community organisation check a single complaint without us handing over two thousand households' payment records to do it.

**On why the integrity does not come from the ledger, which is the question a judge will ask.** The ledger gives a timestamp that is not ours, which is worth having and costs almost nothing. It does not make the number true. The number is true because it is derived from settlement data held at a bank that the developer does not control and cannot retroactively edit. Anchoring proves *when* we said it. The bank proves *that it happened*. Saying this plainly is stronger than claiming the blockchain is the trust layer, which judges have heard four hundred times and stopped believing.

**Non-retroactivity is enforced in the database, not in application logic.** The application role holds INSERT only on the attestation table — no UPDATE, no DELETE. The period close job is the only writer. A correction is a new row carrying a `supersedes` reference and its own date. There is no code path, including an administrative one, that rewrites a closed period.

### 4.5 Idempotency

Every transfer carries a client-generated idempotency key derived from run ID plus participant ID. A retried batch, a double-clicked button, a network timeout followed by a re-send — none of them can double-pay. This is the single most important correctness property in the system, and it is worth saying so to the judges, because it is the property a bank engineer will check for first.

### 4.6 Offline sync

Enrolments are created client-side with a UUID, a capture timestamp and a capture location signed by the device key. The server records capture time and receipt time separately. Conflicts resolve on the UUID. Sync delay is a stored, queryable fact, not a log line.

### 4.7 Geospatial

Registry boundary polygons stored as PostGIS geometry. Enrolment points validated with `ST_Contains` at capture and again server-side on sync. Public display aggregates to coarse H3 buckets.

**Household coordinates are never public.** Publishing the precise locations of people who have just received money is a safety failure, and a judge from a bank will spot it. Coordinates are visible in enrolment review and to bank ops in a case; everywhere else they are aggregated.

Clustering detection flags enrolment sets whose spatial distribution is implausibly tight for the household count claimed — the signature of a roster filled in at a desk rather than captured at doors.

### 4.8 Data protection

Identity numbers are stored as a hash plus the last four digits plus the verification result, never in full. Phone numbers are masked in every list view and revealed only on a participant record. Receipt links are tokenised and expire. Participant PII is not exposed through the verifier portal or the public register at any granularity that identifies a household.

Merkle leaves carry a pseudonymous participant ID, never a name, a phone number or an identity number, so a disclosure bundle handed to an auditor proves a payment without identifying the person who received it. Where an auditor genuinely needs the identity, that is a separate, logged disclosure that the developer authorises, and the authorisation is itself on the record.

### 4.9 Demo-day deployment

One seeded project using real Gold Standard registry data, including its real boundary polygon and its real declared commitment extracted live from its published project design document. Five hundred synthetic participants with sandbox WaaS wallets. On stage: execute a live run, watch transfers settle, close the period, anchor the hash, and show the attestation appear on the public register while the judges watch.

The demo is not the dashboard. The demo is the record appearing in public, live, and being unable to be changed afterwards.

---

## PART FIVE — BUILD ORDER

Dependency-ordered. Each item is buildable only once the one above it exists.

| # | Item | Owner |
|---|---|---|
| 1 | Data model and migrations, PostGIS enabled | Raheem |
| 2 | Auth and roles | Raheem |
| 3 | WaaS integration — account creation, verification, balance | Raheem |
| 4 | Registry sync and boundary polygon ingest | Raheem |
| 5 | Enrolment service with dedupe and geo-validation | Raheem |
| 6 | Field app capture flow with offline queue | Mark |
| 7 | Disbursement runs — pre-flight, batch execution, idempotency, per-transfer states | Raheem |
| 8 | Developer console — home, roster, new run, run detail live | Mark |
| 9 | SMS and USSD — enrolment notice, payment notice, confirm, dispute | Raheem |
| 10 | Attestation service — close, compute, hash, chain, sign, anchor | Raheem |
| 11 | Public register — index, project page, attestation page, verify | Mark |
| 12 | Enrolment distribution map, aggregated | Mark |
| 13 | PDD extraction with source spans | Raheem |
| 14 | Verifier portal and export | Mark |
| 15 | Signals and bank ops console | Raheem |
| 16 | Design system applied across all surfaces, demo seed data, run-through | Lydia |

Design, copy, information architecture, the public register's entire presentation, the demo script and the pitch sit outside this table and run in parallel throughout — that is Lydia.

---

## APPENDIX — The design system

Paper `#F7F4EB`. Cards `#FDFCFA`. Rules `#D8D4C5`. Primary text `#181816`. Secondary `#5C5A55`. Labels `#8C887E`. Accent bottle green `#1E3A2E`, pressed `#162C23`, active-row tint `#E8EDE8`. Warning clay `#7A5038`. Blocked rust `#8C3A2E`.

Geometric sans headlines. Serif body. Letterspaced uppercase monospace for every label, figure and piece of metadata — the monospace is what makes it read as a document rather than an app.

**Colour means action or exception. It never means status.** A confirmed payment is marked in ink with a stamp and a timestamp, not in green. A page where ninety-four percent of rows are green reads as decoration. A page of plain ink records with four rust flags reads as an audit, and the audit is what we are selling.

The accent appears roughly three times on any screen: the primary action, the active row, the mark. Everything else is ink, grey and rule.
