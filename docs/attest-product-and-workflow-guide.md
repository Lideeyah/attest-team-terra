# Attest: product explanation, feature walkthrough and operating workflow

Prepared 12 November 2026 from the supplied concept, product specification, frontend handoffs and the current repository.

## 1. What the project does

Attest helps land-based carbon projects turn a promise to share revenue with communities into a payment process and a verifiable record.

A project may earn money from carbon-credit sales and promise an agreed portion to participating households. Attest records the promise, enrols and checks recipients, prepares and tracks bank payments, collects recipient feedback, and publishes a signed record of the period's results.

The central question is: **What was promised, who was included, how much actually reached recipients, and what remains unpaid or disputed?**

The intended users operate agroforestry, afforestation, reforestation, peatland, blue-carbon and similar land-based projects. The documents focus on cash revenue sharing. A project whose community benefit consists only of a subsidised device is outside that core use case.

Attest does not itself prove that trees were planted, carbon was removed, a credit is high quality, or an enrolled person is the correct eligible household. Identity and account checks help establish who received money. Eligibility, land rights, work performed and the underlying carbon claims need their own evidence.

## 2. The product's operating rules

- Published payment figures come from recorded payment outcomes; an operator cannot type a preferred coverage number.
- Funding an account, submitting a payment and receiving bank confirmation of settlement are different events.
- Settlement and the household's own confirmation are also different facts.
- Unpaid, excluded, failed, reversed and disputed items remain visible in the appropriate records.
- Participant removal is a recorded status change, not erasure of their history.
- A published period is preserved. Later changes produce a new correction record with a reference to the original.
- Public information is aggregated. Exact household coordinates, identity details and account details are kept out of public maps and public verification proofs.
- A fraud signal starts an investigation; it is not automatically a finding of wrongdoing.

## 3. The main things stored in Attest

| Item | Plain-language meaning |
| --- | --- |
| Project | The carbon project, its registry reference, operator and geographical boundary. |
| Commitment | The project's documented benefit-sharing promise, including its source quotation and page. |
| Participant | A household or recipient enrolment, identity-check results, payment destination, consent and flags. |
| Agent | The named field worker responsible for captures, with an approved account and registered device. |
| Roster | The participant snapshot associated with a reporting/payment period. |
| Payment run | A prepared batch of household payments for a project and period. |
| Transfer | One payment, its bank reference, outcome, charges and relevant timestamps. |
| Confirmation | A recipient's separate acknowledgement that the money arrived. |
| Dispute | A complaint and its evidence, responses and resolution history. |
| Signal/case | A potentially concerning pattern and the investigation carried out around it. |
| Attestation | A signed period record containing the calculated results and links to previous records. |

## 4. Who uses the system

The seven business surfaces are public records, the developer workspace, the field workspace, participant channels, the verifier workspace, bank operations and platform administration. Authentication and onboarding are the entry routes into those surfaces.

### 4.1 Public records: anyone

No account is required for public project records and verification.

- **Landing page:** explains the product and provides entry points.
- **Register:** browse and search projects and their published results.
- **Project page:** view the commitment, closed periods, payment coverage, shortfalls, confirmation/dispute counts and aggregate geography.
- **Operator page:** view the projects associated with one operator and their published history.
- **Attestation page:** inspect a particular signed period record, download it and see whether a correction or anchoring issue applies.
- **Verify page:** check a record by hash or original signed PDF; check a single-transfer disclosure proof when one has been supplied.
- **Report a problem:** submit a project-level complaint without an account. A receipt link is required for payment-scoped voice evidence.
- **About, privacy and terms:** explain the service and its information-handling rules.

Public records report facts and exceptions. They should not be described as certification that the project is ethical, compliant or free of fraud.

### 4.2 Developer workspace: the project operator

Developer administrators manage the project and sensitive administration. Developer operators have operational access subject to server-side permissions; seeing an administration form does not grant permission to use it.

| Area | What the operator does |
| --- | --- |
| Onboarding | Look up the registry reference, check/upload the boundary, upload the project design document, review the extracted commitment and resume unfinished setup. |
| Home | Review the current period, enrolled/paid figures, shortfall, disputes, flags and the next actions. |
| Project selector | Switch between authorised projects or start another project setup. |
| Roster | Browse participants, search/filter supported fields and import household records from CSV. Invalid rows are reported separately. |
| Participant detail | Inspect capture time/location, identity/account-check results, flags and payment history. Correct supported fields with a reason or change status without deleting history. |
| Project map | Inspect the private project boundary and aggregate household distribution. Authorised private capture locations can be available as a separate layer. |
| Agents | Create invitations, verify agent identity, inspect enrolment/flag/sync information and suspend an agent when needed. |
| New run | Choose a period, enter the revenue basis and allocated funding, inspect the calculation, run preflight checks and authorise execution. |
| Run detail | Monitor transfer states, amounts and failures; recheck uncertain outcomes and retry only eligible definitive failures. |
| Funding | Inspect linked source-account information, balance and reconciliation information supplied by the backend. |
| Disputes | Read complaints and evidence, respond and retain the response history. The developer cannot simply declare a complaint resolved. |
| Attestations | Browse closed periods and download or inspect signed records and available reports. |
| Settings | Show account/project settings and explain administration features that are not yet supported. |

The specification also calls for team/role management, API keys, configurable client webhooks and notification preferences. These are not all implemented end to end; the settings page must not imply otherwise.

### 4.3 Field workspace: approved agents

The field app is a phone-friendly, installable web app with an encrypted local queue.

1. Redeem the invitation on the device that will be used in the field.
2. Wait for identity verification and activation by an authorised administrator.
3. Sign in and open the field workspace.
4. Capture consent, personal details, identity information, payment details and supporting evidence.
5. Request the actual device location. An outside-boundary capture requires an explanation and is flagged; missing GPS is recorded rather than replaced by an invented location.
6. Save the capture locally when offline.
7. Open the sync queue and submit when connectivity returns.
8. Check each acknowledgement. Accepted captures leave the queue; rejected or uncertain captures require attention.
9. Inspect submitted records through the supported read-only detail view.

Identity numbers may be needed temporarily for verification. They are not supposed to become permanent raw identity fields in server records. The local offline queue is encrypted; losing the device or clearing browser data can still lose unsynchronised work. Device replacement/rotation is not a complete self-service feature today.

### 4.4 Participant channels: households

Households are not expected to create developer accounts or install the field app.

The intended channels are enrolment/payment messages, SMS replies, USSD and an expiring receipt link. The receipt page displays the payment, allows the recipient to confirm receipt, and offers three complaint categories: nothing arrived, someone else collected it, or the amount was wrong. Payment-scoped voice evidence can be attached where supported.

The messaging/USSD handlers are backend capabilities. Actual delivery, a live short code and real phone-network behaviour depend on an external provider; the hosted demo does not establish those services as live.

### 4.5 Verifier workspace: auditors, buyers, lenders and standards bodies

- Browse projects and inspect a deeper view of their period records.
- Add projects to a personal watchlist.
- Compare projects using available payment, confirmation, shortfall and dispute information.
- Configure supported alert rules: coverage below a threshold, disputes, late closure and corrections.
- Export JSON records, CSV figures and available signed benefit-sharing reports.
- Verify records and, when an authorised developer supplies one, check a proof for one transfer without receiving the whole participant register.

Current limits include platform-provisioned institution accounts, no complete watchlist-removal/alert-editing workflow and no verifier API-key management. An alert rule being stored is not proof that an email alert was delivered.

### 4.6 Bank operations: payment and investigation staff

- Inspect background jobs and their actual outcomes.
- Review verification exceptions and reconciliation differences.
- Inspect signals such as onward-payment concentration, shared devices or unusual geographic patterns.
- Open an account-flow graph when the bank provides the required data.
- Record investigation actions: request documentation, escalate, clear or substantiate.
- Queue supported account-control actions only when the banking integration exposes them.

A request to freeze an account or refresh flows is not confirmation that the bank has completed it. These capabilities are simulated in the demonstration.

### 4.7 Platform administration: Attest operations

- Link a verified source payment account to a project.
- Review document extractions needing attention.
- Import approved registry source data and inspect source history.
- Check the integrity of a project's record chain.
- Review the available operational/escalation information.

The wider specification includes full organisation verification and standalone onboarding/escalation decision queues. Those complete workflows are not all supplied by the current backend.

## 5. The complete operating workflow

**Project and promise -> recipients -> verified roster -> funding and preflight -> payment -> recipient feedback -> period record -> independent review.**

### Stage 1: establish the project

**Owner:** developer, with platform assistance where required.

Create and verify the developer account, sign in, enter the registry reference, and review the returned project information. Supply a proper boundary file if the registry does not provide one.

**Output:** an identifiable project with a documented boundary/source. A registry lookup or a polygon on a map is not evidence of credit issuance, a sale or community payment.

**If it fails:** correct the identifier, retry a temporary registry failure or refer the source for administrative review. Do not replace a missing fact with a guessed value.

### Stage 2: record the benefit-sharing agreement

**Owner:** developer; platform reviewer when necessary.

Upload the project design document. Wait for a completed document check, inspect the exact quotation and source page, and review the percentage, gross/net basis, timing and beneficiary definition. Save corrections with reasons.

**Output:** a reviewed, versioned commitment. A queued upload is not a completed extraction, and a model-generated suggestion is not automatically an approved agreement.

**Gate:** the agreement must fit the payment model. Separate community funds, weighted entitlements, survival conditions and deadlines tied to cleared-sale dates cannot be silently replaced by equal household payments and a calendar-period deadline.

### Stage 3: complete operational readiness

**Owner:** platform administrator and developer.

Link the verified source account, complete the real organisation/banking checks outside or through the supported integrations, and confirm which services are live.

**Output:** a payment-ready project configuration. The existing account-link function is not a substitute for full organisation verification.

### Stage 4: authorise field staff

**Owner:** developer administrator and agent.

Create an invitation for a named agent, share it securely, and have the agent redeem it on their own field device. Verify the agent's identity before activation.

**Output:** an approved agent tied to a device. If a device is lost, suspend access and follow an agreed recovery procedure rather than promising automatic recovery of an unsynchronised queue.

### Stage 5: enrol households

**Owner:** field agent, with household consent.

Explain enrolment and obtain consent. Capture the required details, identity information, payment destination, evidence and real location/time. Save offline if necessary.

**Output:** a capture with an identifiable agent and original capture information. Outside-boundary and missing-location cases remain explicit exceptions.

### Stage 6: sync and validate

**Owner:** agent, system and developer reviewer.

Upload queued captures, read each result, and run identity/account/duplicate checks. Inspect name mismatches, unavailable verification, duplicate identity and location flags. Do not repeatedly import accepted records with new identifiers.

**Output:** accepted participant records plus an exception list. The period roster is a recorded snapshot; later enrolment does not silently rewrite an already published period.

### Stage 7: notify recipients

**Owner:** the notification service, monitored by operations.

Send the supported enrolment notice before payment. Explain the project and the recipient's way to check or complain. Confirm provider status rather than assuming a queued notice was delivered.

**Output:** notification evidence or an explicit delivery problem. Real SMS/USSD delivery remains an external-service requirement.

### Stage 8: prepare a payment run

**Owner:** developer.

After the relevant revenue event, select the period and eligible supported roster. Enter the applicable gross/net revenue and funding allocation. Inspect the commitment amount, estimated charges, funding needed and shortfall.

**Output:** a draft run with visible calculations. Declared revenue is an input requiring appropriate evidence; the application is not automatically proving the full commercial sale behind it.

### Stage 9: run preflight and authorise

**Owner:** developer.

Check recipients, destinations, verification, restrictions, notifications and applicable limits. Resolve issues or record permitted exclusions with reasons. Review underfunding and the effect of charges before authorising.

**Output:** an authorised run, or a clear list of blockers/exclusions. Exclusions must not erase the fact that those participants were enrolled.

### Stage 10: execute and monitor

**Owner:** system and bank, supervised by the developer/operations team.

Queue the payment batch, track each transfer and obtain authoritative outcomes. Distinguish queued, in progress, settled, failed and reversed. Record charges separately from money reaching recipients.

**Output:** bank-confirmed or explicitly unresolved transfer outcomes.

**Important recovery rule:** after a timeout, check the existing request's status. A timeout does not establish failure and should not lead to an uncontrolled resend. Retry only a failure that is definitively eligible for retry.

### Stage 11: collect receipt confirmation and complaints

**Owner:** household, developer responder and independent operations where needed.

Give the recipient a supported confirmation/reporting channel. Record acknowledgement separately from settlement. Preserve complaints, supporting voice evidence, developer responses and the basis for resolution.

**Output:** receipt confirmations and a checkable dispute history. A developer response is not a recipient confirmation and cannot itself close the dispute.

### Stage 12: reconcile and investigate

**Owner:** bank operations and platform staff.

Compare available funding, transfers, charges, expected balances and actual balances. Inspect signals and case evidence. Distinguish investigation requests from actions confirmed by the bank.

**Output:** reconciled information or explicit differences/open investigations. Do not treat a signal as proof of fraud.

### Stage 13: close and publish the period

**Owner:** scheduled background processing.

At the applicable close, calculate the enrolment snapshot, paid recipients, committed amount, actual settled amount, charges, shortfall, confirmations and dispute/signal information. Sign and link the record to the previous period; request independent timestamping where configured.

**Output:** a published period attestation with its actual verification/anchoring status. Operators should not manually close a period early merely to make results look complete. Local test controls that fast-forward a period are not normal product controls.

The hosted free-tier demonstration does not provide a continuously running production worker. Timely real-world period closure and payments require suitable scheduling, monitoring and operational capacity.

### Stage 14: verify, export and preserve later corrections

**Owner:** public readers and authorised verifiers.

Read the public project history, download the original signed record, verify it and export the available report. Obtain a particular transfer proof through the authorised disclosure process if required.

If a reversal, late settlement or substantiated correction changes the evidence, append a correction record. Keep the original and show the relationship between them.

**Output:** a checkable history rather than a document silently rewritten after publication.

## 6. Reading the figures correctly

| Measure | Calculation | Example |
| --- | --- | --- |
| Household payment coverage | Distinct paid households / households in the period snapshot | 80 / 100 = 80%. |
| Financial fulfilment | Money settled to households / amount committed | NGN 450,000 / NGN 600,000 = 75%. |
| Receipt confirmation rate | Confirmed paid recipients / paid recipients | 60 / 80 = 75%. |
| Shortfall | Committed amount minus actual settled amount, when positive | NGN 600,000 - NGN 450,000 = NGN 150,000. |
| Charges | Bank fees and other reported transfer charges | Shown separately; charges are not household income. |

These percentages answer different questions and can differ. A project can reach many households while still paying less than its total obligation. A successful transfer also does not mean the recipient has confirmed receipt.

## 7. What your supplied files mean for this workflow

### Sample afforestation PDF

The document is explicitly synthetic. Its community obligation is 30% of eligible net revenue, split into 20% for households and 10% for a restoration fund. Household allocation depends on approved area/survival-related conditions, and the payment deadline is linked to cleared proceeds.

The present equal-household run model is not a complete implementation of those terms. The latest local testing changes identify those limitations and block acceptance/run creation rather than incorrectly paying the whole 30% equally to households. Those latest changes still require final browser verification and deployment; do not assume the existing hosted build already contains every local fix.

### Supplied KML

The file contains 37 point placemarks, not closed project-boundary polygons. It cannot establish project area or point-in-project checks. Draw/export the actual boundary as a polygon; do not join unrelated pins or invent a boundary around them. Its locations also differ from the fictional location described in the sample PDF.

## 8. What works today and what remains

### Connected in the demo

Project setup and document processing; project switching; agent/device/identity workflows; household records and CSV import; payment runs and progress; public project and signed-record pages; verification and disclosure proofs; receipt/dispute flows; verifier comparisons, watchlists, alert rules and exports; and operations/admin integrations for the endpoints provided.

### Simulated or dependent on external services

Bank movements and balances, identity/provider responses, registry adapters, document-model extraction, messaging and public-ledger anchoring are mocked in the hosted demonstration. Real email delivery is not configured. Provider handlers and a real application backend do not make the underlying provider evidence live.

### Incomplete product capabilities

Full corporate verification/account provisioning; self-service institution provisioning; team-role administration and API-key/client-webhook/preferences management; complete watchlist removal and alert editing; device-key replacement/recovery; richer import-job tracking and some filters/target management; complete milestone/weighted allocations and separate community-fund payouts; and a full carbon-credit marketplace/checkout.

The backend contains additional carbon-registration, monitoring/verification and retirement capabilities. A complete operator-facing marketplace and independently verified carbon-sale workflow are not established by those endpoints alone.

### Current verification/deployment boundary

Earlier deployed document-processing/resume fixes are recorded in the repository. The most recent E2E fixes are still local and have not been committed/pushed/deployed. The local API journey tests passed 15 grouped journeys; a full suite passed 79 backend tests and 25 frontend tests, with additional targeted regressions passing afterwards. The refreshed all-page/browser pass was interrupted and must not be described as complete.

## 9. A sensible product walkthrough order

1. Public register and a project with signed history: understand the output first.
2. Developer dashboard and project setup: see where the project and promise come from.
3. Agents and field capture: see who enters participants and how offline work is handled.
4. Roster and exceptions: inspect who is included and what needs review.
5. Funding and a supported mock payment run: inspect arithmetic before execution.
6. Run detail: distinguish submitted, settled, failed and uncertain outcomes.
7. Receipt and dispute: see the household's independent feedback channel.
8. Attestation and public verification: check the resulting evidence.
9. Verifier comparison/export: view it as an auditor or buyer.
10. Bank operations and administration: inspect reconciliation, cases and source/chain controls.

For a live-money demonstration, finish the external-service, security, operational scheduling and unsupported-allocation work first. A public demo link is not evidence that those requirements are complete.

## 10. Source notes

The concept explains the problem and business model. The product specification describes the intended features and full lifecycle. The main and updated frontend handoffs have identical extracted text in the supplied copies and describe integration expectations, not proof of current deployment. The short handoff labelled '(1)' is a contrast-token correction, not another product specification.

The documents contain historical build/deployment notes and differing external policy/example assumptions. This guide uses the implemented workflow and project-specific agreement rather than asserting that every project has one universal revenue-sharing percentage. External legal or certification requirements need their own current verification.


## Product clarifications and required UI progression — 12 November 2026

This section records the owner's corrections and takes precedence over narrower descriptions above. These are requirements, not a claim that all screens or integrations are shipped.

### Geography: points and boundaries
Accept point datasets as well as polygon boundaries. Point-only projects can save locations, display communities, and link participant payments to locations. Show geometry type, coordinate validation, duplicate/missing locations, and a preview before saving. Never turn points into a claimed boundary automatically. With points only, label area and inside/outside checks “Boundary needed”; do not block saving locations merely because a polygon is absent. Existing enrolment currently requires a boundary, so this requires backend changes as well as uploader changes.

Verifier maps should select project, reporting period and payment run. Green = confirmed paid; yellow = submitted/processing; red = confirmed failed; grey = not started or unknown. Reversed and partially paid states need explicit labels. Disputes and recipient confirmation are separate badges, not replacements for bank payment status. Use text/icons as well as colour. Clusters show counts and totals; filters and an accessible table mirror the map. Missing locations remain in totals and appear in a list. Show privacy-approved locations with masked details; exact household coordinates require explicit access. Map points must come from recorded locations, never fabricated coordinates.

### WhatsApp messages and alerts
Add WhatsApp as a communication channel for enrolment notices, payment updates, receipt links, complaints and permitted verifier/operator alerts. Record opt-in, recipient, template, event, provider reference, queued/sent/delivered/read/failed state and retry history where supplied. Provider acceptance is not delivery. Use secure expiring receipt links. SMS can remain an agreed fallback; sensitive identity and bank information must not appear in notification text. Current provider code implements SMS, not WhatsApp, so WhatsApp needs a provider adapter, callbacks and configuration.

### Wallet and Hedera history
Provide a project Wallet & funds page: approved funding account, confirmed available balance, reserved funds, total received, total paid, charges, pending payments, reversals, reconciliation and statement. Distinguish bank-backed money from the application display. Provider data must establish balances; a blank or unknown balance must never appear as zero. Participant enrolment already has backend paths for an existing account or BVN-based provider wallet/virtual-account creation; this does not prove a complete live wallet experience.

Provide a separate Ledger & proofs view linking funding/payment events, reporting records and corrections to their available evidence. Show event time, amount, status, reference, related payment/run, signed record and Hedera anchor state. Include transaction/topic/sequence/consensus time and explorer/proof links when available. Display awaiting anchor, confirmed on testnet, confirmed on mainnet, failed or demonstration honestly. The current adapter targets Hedera testnet and anchors a record hash; it does not put every bank transfer or wallet balance on chain. A complete funds-event ledger requires defining and implementing which events are anchored. Keep participant PII off chain. Banking records establish movement of money; Hedera provides tamper-evident evidence of the committed record, not automatic proof that its contents are true.

### Automatically saved document review and change history
Persist upload identity/hash, extraction job, original extracted result, source quotation/page, reviewed versions and approval. Restore the draft after refresh or sign-in. Debounced draft edits should show Saving, Saved at time, or Could not save—retry. Preserve unsaved input on failure. Log each committed edit with actor, time, field, previous/new values, reason and source version; require a reason when accepting a changed commitment. Do not replace an accepted commitment silently or change an already authorised payment run. Current backend persists extracted records and creates superseding reviewed versions with audit entries; smooth editor autosave and a complete visible history require separate confirmation/implementation.

### CSV community upload and account checks
Place Upload CSV beside Add participant in Community members. Flow: download template → upload → map columns → validate/preview → correct errors → confirm import → show per-row verification results. Support bank details, identity type/details, consent evidence/reference, and optional real coordinates as allowed by the accepted schema. Show required fields clearly and minimise sensitive-data retention. Missing consent is not implied by uploading a spreadsheet. Repeated imports should not duplicate accepted members. Keep successful rows and provide a safe error report for rejected rows. A partial import must not be labelled wholly successful.

Account checking must show independent results: identity check (BVN/NIN and supplied biographical details), bank account resolution (bank/account to account-holder name), name comparison, available identity/account linkage, duplicate detection, account restrictions and payment eligibility. Existing service code performs these provider-backed checks or flags; in the demo provider responses are simulated. A mismatch, uncertain comparison or provider outage remains visible and can block eligibility according to policy. BVN-based provider wallet creation is distinct from verifying an existing account; NIN-only enrolment currently requires an existing account. Checking a person/account does not prove rightful community membership or land ownership.

### Required pages and navigation
| Area | Required pages or tabs | Progression |
|---|---|---|
| Access | Sign in, developer registration, email verification, password reset, invitation acceptance | Return to intended workspace after login; keep public records accessible |
| Project onboarding | Project identity; locations/boundary upload and preview; document upload/processing; commitment review/history; funding readiness; setup checklist | Back/Continue with saved draft and validation; show real readiness blockers |
| Developer | Overview; Projects; Community members/import/detail; Map; Agents; Wallet & funds; Payment runs/new/detail; Messages; Disputes; Documents & commitments; Ledger & proofs; Reports; Settings | Project selector persists; checklist links directly to incomplete work |
| Field | Home; enrolment steps; review/submit; offline queue; submitted record; profile/device | Consent → identity → account/wallet → location/evidence → review → submit; preserve values backwards |
| Participant | Secure receipt; payment detail; confirm receipt; report problem; confirmation/status | Open WhatsApp receipt link → inspect → confirm or complain → receive acknowledgement |
| Verifier | Overview; Projects; project payment map/table; period history; Watchlist; Compare; Alerts; Exports; Proof detail | Project → period/run → point/cluster → permitted payment evidence |
| Operations | Overview; payment exceptions; reconciliation; signals; cases/details | Exception → evidence → recorded action → confirmed outcome |
| Admin | Overview; onboarding approvals; extraction review; registry import/history; ledger integrity; escalations | Review → reasoned decision → auditable result |

These are the target page inventory; some should be tabs or panels rather than separate routes. Presence in this table does not establish implementation.

### End-to-end UI progression
1. Sign in and resume the last incomplete setup step.
2. Identify project; upload points, boundaries or both; preview and save each dataset honestly.
3. Upload document; show processing progress; automatically restore the saved extraction.
4. Review/edit terms with saving feedback and history; approve a supported commitment.
5. Complete funding-account readiness and show the wallet state.
6. Add community members through CSV, field enrolment or permitted manual entry.
7. Review identity/account/location results and resolve payment blockers.
8. Prepare a run: period/revenue → obligation/allocation → recipients/exclusions → funding/charges → final review → authorise.
9. Monitor live payment outcomes in list and map; prevent duplicate submissions; investigate unknown outcomes.
10. Send WhatsApp updates and receipt links; show delivery evidence separately from payment status.
11. Collect confirmations/complaints; reconcile funds and handle exceptions.
12. Publish period results; show signed history and actual Hedera proof status.
13. Verifier selects the same period, inspects coloured map/table outcomes and verifies permitted evidence.
14. Append subsequent corrections and preserve the original history.

Use a persistent desktop sidebar, compact tablet navigation and a mobile menu with a small set of primary destinations. Keep the primary next action visible. Every async step needs loading, error, retry and empty states, and every multi-step flow needs working Back/Continue, validation and saved progress. The current step and blocked/completed steps must be readable without relying on colour.
