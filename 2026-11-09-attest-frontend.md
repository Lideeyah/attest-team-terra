# Attest — front-end build prompts

Ten phases in dependency order, front end only. Each is a self-contained prompt to paste into Claude Code.

9 November 2026 · Lydia Solomon · front-end lane

**Read with** `2026-11-09-attest-foundation.md` for the design system, motion system and IA; `2026-11-09-attest-backend.md` section 3 for the API contract; `2026-11-09-attest-product-spec.md` for domain rules.

**The whole front end is buildable with no backend.** Phase F-1 stands up a mock server that implements the contract in backend section 4, including every error code, so every screen and every state is reachable before a single real endpoint exists. When the backend lands, integration is pointing the client at a different base URL. Each phase below names the endpoints its screens call, so the wiring is already written down.

Paste the standing block once per session, then one phase at a time. Finish a phase completely before starting the next.

---

## STANDING INSTRUCTION BLOCK

```
Read these three files in full before writing any code:
- 2026-11-09-attest-foundation.md   (design system, motion system, IA, stack, rules)
- 2026-11-09-attest-backend.md      (section 4 is the API contract you build against)
- 2026-11-09-attest-product-spec.md (domain rules, objects, flow, fraud controls, the record)

Rules that apply to every line of code in this project:

ATTRIBUTION. Every commit and push is authored as Lydia Solomon and nobody else. Do not add a
Co-Authored-By line. Do not add "Generated with Claude Code", a session link, or any other
trailer. Do not mention Claude, an AI, or an agent in any commit message, PR description, comment,
README, changelog or file header. Commit messages are plain imperative English describing the
change. The sole contributor on this repository is Lydia Solomon.

SECRETS. No credential is ever written into a tracked file. Everything comes from environment
variables. The kubeconfig is gitignored by pattern before it is ever placed in the working tree.
The platform team key is server-side only: it is never read in a client component, never passed as
a prop, never placed in a NEXT_PUBLIC_ variable and never logged. The browser talks only to
Attest's own API, never to the bank or the model gateway.

TOKENS. Never hard-code a colour, font size, duration, easing or spacing value outside the token
stylesheet. A literal hex, px duration or cubic-bezier anywhere else is a defect.

MOTION. Use only the named primitives in foundation 2.5. Two curves exist, shutter and mechanical;
there is no spring easing. Every duration is a whole number of frames at 24fps. Honour the
anti-slop list in foundation 0.3 absolutely.

CONTRACT. Call only the endpoints in backend section 4.3. Never invent an endpoint, a field or a
response shape. If a screen needs data the contract does not expose, stop and say so rather than
inventing it. Switch on the error codes in backend 4.2; never parse an error message string.
Amounts are NGN decimal strings with two places, matching the bank; never parse one into a float
and never convert units. Lists paginate with page and per_page and return a meta block.

STATES. A screen is not delivered until every state listed for it is built and reachable by making
the mock return the corresponding error code or fixture.

COPY. No lorem ipsum, no placeholder strings, no "TODO: copy". Write the real sentence. Follow the
voice rules in foundation 1.7: declarative, no exclamation marks, no apology copy, no
congratulation, no verdict about any project anywhere. Labels are uppercase nouns in record face.

DATA. No sample data that reads as sample data. No John Doe, no Project Alpha, no example.com.
Plausible Nigerian names, real community and local government names, figures consistent with the
product spec's evidence.

SCOPE. Build exactly the phase you were given. Do not begin the next phase. Do not stub screens
belonging to a later phase. If you finish early, improve the states and the copy of what you built.

Confirm you have read all three documents and state which phase you are building, then begin.
```

---

## F-0 — FOUNDATION

```
Build the front-end foundation. No feature screens.

1. Scaffold Next.js App Router in TypeScript strict mode with Tailwind and Motion. Route groups:
   (public), (auth), (app), (field), (verifier), (ops), (admin).

2. Repository hygiene. .gitignore covering .env and variants, the team sandbox configuration file
   by its exact filename, any *.pem or *.key, /uploads, and the standard Node and Next.js entries.
   .env.example naming every variable with an empty value and a one-line comment. Verify with
   `git check-ignore -v` and print the result.

3. Token stylesheet as CSS custom properties, exactly the values in foundation 1.2 (canvas,
   surfaces, rules, ink, the bottle ramp, the four status triplets), 1.3 (type families and
   scale), 1.5 (space and rhythm), 2.2 (cadence), 2.3 (curves), 2.4 (travel). Wire into the
   Tailwind theme. Delete Tailwind's default colour palette, font sizes, border radii and shadow
   utilities from the config so they cannot be used by accident.

   Radius is zero across the system, one exception only: the radio punch mark, a circle by
   function. Any other rounded corner is a defect.

   There is no shadow scale. Separation is a hairline rule and a surface change. The only shadow
   in the product is a modal scrim at rgba(24, 24, 22, 0.32).

4. Self-host Cabinet Grotesk from Fontshare at weight 800; load Newsreader and Courier Prime, each
   with the full fallback stack from foundation 1.3. Apply tabular-nums to the record face.

5. Motion primitives from foundation 2.5 as reusable Motion variants in one module: recordArrive,
   stampLand, ruleDraw, sealPeriod, tallyTo, hashResolve, routeForward, routeBack, disclose,
   sheetIn, pressTravel, tick, queuePulse.

   Overshoot lives in keyframes, never in a curve: stampLand scales 1.28 through 0.97 to rest.

   Reduced motion collapses every animation to 0.001ms with elements at their resting state, per
   foundation 2.7. Implement it here so no component has to think about it.

6. Component library from foundation 1.6: Button (four variants plus small), Input, Select,
   Textarea, Punch, Radio, Pick, Table, Figure, Strip, Stamp (four states), Mark, Rule (three
   variants), Hash, Registered, Notice, index-card Tabs, Console, EmptyState, Toast, Sheet, Modal,
   Chart.

   The Stamp carries deterministic rotation derived from the record ID so it never changes angle
   between renders. Its keyframes must write the full transform at every step:
   translate(-50%, -50%) rotate(Xdeg) scale(Y). A keyframe that sets scale alone silently clobbers
   the centring and rotation and the stamp renders off position. This is a known trap.

   The Mark is drawn by geometry per foundation 1.4, never loaded as an image file.

7. The three navigation shells from foundation 3.5: the developer left rail with its persistent
   period indicator, the field app bottom tab bar with offline and pending-sync indicators, and
   the masthead shell shared by the verifier portal and bank ops.

8. Route transition wrapper so routeForward and routeBack fire on navigation, with depth tracked
   so going deeper moves forward and going back reverses.

9. Global error boundary and a global loading convention. Every screen after this uses them rather
   than inventing its own.

10. /dev/kitchen-sink, unlinked, rendering every component in every variant and state and every
    motion primitive with a replay button. This is how the design system gets reviewed, so lay it
    out properly rather than stacking components in a column.
```

**Exit checklist**
- [ ] `git check-ignore -v` confirms the sandbox config and `.env` are ignored
- [ ] `/dev/kitchen-sink` renders every component in every variant and state
- [ ] Every motion primitive replays and collapses correctly under reduced motion
- [ ] `grep` for hex colours, px durations and `cubic-bezier` outside the token stylesheet returns nothing
- [ ] Tailwind's default palette, type scale, radii and shadow utilities gone from the config
- [ ] No rounded corner anywhere except the radio punch mark
- [ ] Every duration is a whole number of frames at 24fps
- [ ] A rotated stamp animates without losing its centring or rotation
- [ ] A dense table renders correctly at `.record-cell` in Courier Prime
- [ ] TypeScript builds with zero errors and zero `any`

---

## F-1 — MOCK SERVER AND THE TYPED CLIENT

This is what makes the front end independent of the backend. Build it properly; everything after it depends on it.

```
1. Implement a mock server for every endpoint in backend section 4.3. Same paths, same request
   shapes, same response shapes, same cursor pagination envelope, same error envelope from backend
   4.1 and 4.2. Use MSW for component and test work and a standalone route handler set for the running app,
   selected by environment variable.

2. Fixture data matching the backend seed described in backend BE-1: one real Gold Standard
   project with its real boundary and real declared commitment, 500 participants with plausible
   Nigerian names, real community and local government names and synthetic identifiers in the
   sandbox fixture style, named agents with differing flag rates, three closed historical periods,
   one open period, a second clean project, and a third with a 400-wallet onward-flow concentration
   pattern. Include participants whose resolved account holder name deliberately does not match the
   enrolled name, so the NAME_MISMATCH state has something real behind it.

   Transfers in the fixtures carry fee, vat, stamp_duty and total_debit, because the run builder and
   the attestation both display charges separately from the amount households received.

3. Every error code in backend 4.2 must be forceable. Build a dev control panel at /dev/states
   that lets any endpoint be made to return any code on the next call, so every error state in
   every later phase is reachable by clicking rather than by editing fixtures.

   This panel and /dev/kitchen-sink are excluded at build time behind an environment flag, per
   backend 6A.1. They must not exist in the production bundle, not merely be route-guarded: the
   deployed URL is public to anyone with the link, and a panel that can force transfer states is
   not something to leave one misconfiguration away from a stranger. The deploy checklist in F-9
   verifies both return 404 on the live URL.

4. Typed API client. One module. Generated or hand-written types matching the contract exactly.
   Every method returns a discriminated result carrying either data or a typed error code, so a
   caller switches rather than catches. Retry on idempotent reads only. Idempotency-Key header on
   every mutation.

   When the backend lands, this module's base URL changes and nothing else does. When BE-0 ships
   its shared types package, import those and delete the local duplicates.

5. A mock SSE stream for GET /api/runs/:id/stream emitting transfer.queued, transfer.in_flight,
   transfer.settled, transfer.failed, transfer.reversed and run.complete with realistic timing, so
   the live run screen can be built and profiled under load before any real transfer exists. Make
   the emission rate and the failure share configurable from /dev/states.

   transfer.reversed matters: the sandbox has a trigger that settles a transfer and then reverses it
   about a minute later, so a row that has already been stamped can be undone. The live run screen
   has to handle that without rewriting history, and it can only be built if the mock emits it.
```

**Exit checklist**
- [ ] Every contract endpoint has a mock returning the correct shape
- [ ] Every error code in backend 4.2 is forceable from `/dev/states`
- [ ] The typed client returns discriminated results and no caller uses try/catch for expected errors
- [ ] The mock SSE stream emits every event type at a configurable rate with a configurable failure share
- [ ] Switching the client's base URL is the only change needed to point at a real backend

---

## F-2 — LANDING PAGE

No API calls at all, which is why it comes now: you get something finished to look at before anything else exists.

```
Build the landing page at / as the six-movement scroll-linked composition in foundation 2.8. Read
that section before starting and follow it movement by movement.

Movement 1, Stillness. One sentence in h1.display set in --bottle-deep on --canvas-paper, a single
--rule-heavy line beneath it, nothing else. It rises in once over --t-base on load and then does
nothing. No scroll indicator, no animated arrow, no autoplay anything. Use the product spec's
one-line summary as a placeholder and flag it as the one string Lydia must replace.

Movement 2, The problem as a figure. Scroll-linked. Three figures tally in sequence with tallyTo:
enrolled, paid, coverage. Figures large in record face, prose small beside them, source attributed
in an eyebrow beneath. Use the Farm Africa figures from the product spec evidence: 21,658 enrolled,
7,375 paid, 34 percent.

Movement 3, The ledger builds. Scroll-linked recordArrive on successive rows, each a household, an
amount and a timestamp. Scroll position drives the row count, so scrolling up removes rows and
scrolling down adds them. Stagger one frame when several arrive together.

Movement 4, The stamp lands. stampLand on one row, then three more, staggered. The ink sets. Get
the two beats right, impact then ink. This is the frame worth screenshotting.

Movement 5, The period seals. sealPeriod. The heavy rule draws across and everything above steps
back one contrast level without moving and without disappearing. Copy beside it states what just
became impossible.

Movement 6, The record goes public. hashResolve on the attestation hash, then the sealed block
appears as one row on a register beside other projects, carrying Registered crop marks. The call to
action sits beneath it and is the only button on the page.

Implementation requirements:
- Motion's useScroll with per-movement offsets. Each movement pins briefly, resolves, releases.
  Total height around 600vh.
- Transform and opacity only. No layout-triggering property in any scroll handler.
- 60fps on a mid-range laptop. Profile and fix anything that drops frames.
- prefers-reduced-motion renders six static compositions that still read as a sequence.
- The same six movements work at 390px with figures stacked and rows narrowed. Do not drop a
  movement on mobile.
- Below Movement 6: a short section for developers, a short section for institutions, a footer.
  Plain, ruled, generously spaced, no hover lifts.
```

**Exit checklist**
- [ ] All six movements resolve on scroll, forward and backward, without jumping
- [ ] 60fps sustained through the full scroll
- [ ] Reduced-motion version reads as six intelligible stills
- [ ] Works at 390px, 768px, 1280px and 1920px with all six movements intact
- [ ] Besides the h1 and the mark, exactly one accent element: the call to action
- [ ] Nothing on the anti-slop list appears
- [ ] Hero sentence flagged as Lydia's to replace

---

## F-3 — PUBLIC REGISTER AND VERIFICATION

Endpoints: `GET /api/public/register`, `/api/public/projects/:id`, `/api/public/developers/:id`, `/api/public/attestations/:id`, `/api/public/projects/:id/geography`, `POST /api/verify/attestation`, `POST /api/verify/disclosure`, `POST /api/disputes`, `GET /api/receipt/:token`, `POST /api/receipt/:token/confirm`, `POST /api/receipt/:token/dispute`.

```
Build every public surface. Reach each state from /dev/states.

/register — register index.
Searchable, sortable table: project, country, registry ID, commitment, enrolled, paid, coverage,
last closed period, open disputes. Coverage shown as "1,284 of 2,090" with the percentage
secondary, never the percentage alone.
States: loading skeleton; populated; search returns nothing; filter returns nothing; sort applied;
paginated; register empty; RATE_LIMITED.

/register/[projectId] — project page.
Commitment with its quoted source sentence in editorial italic and its PDD page reference. Coverage
by period as a ruled bar chart in ink. Period table. Confirmation rate. Open and substantiated
dispute counts. Signal count. Enrolment distribution map from the geography endpoint, H3 buckets
only. Download signed attestation.
States: onboarded with no period closed, showing the commitment and explicit zeros; one period;
many periods; a period closed late, marked; project suspended; project withdrawn with the record
intact and marked withdrawn; a prior period carrying a correction with both records shown;
NOT_FOUND.

/developers/[developerId] — developer page.
Every project under one operator, aggregate coverage, trend across periods.
States: single project; several; one withdrawn; no closed periods anywhere.

/attestation/[attestationId] — the single immutable record.
Figures, hash, chain position, Merkle root, anchor reference, verify action. A document surface, so
--surface-reading with Registered crop marks. The downloadable PDF and the disclosure bundle carry
them too.
States: valid; superseded by a correction with both shown; ANCHOR_PENDING; CHAIN_DISCONTINUITY.

/verify — two modes.
Period verification: paste a hash or upload an attestation PDF. Single-transfer verification: paste
a disclosure bundle of leaf, proof path and root reference, confirm the transfer belongs to the
stated period, disclose nothing else.
States: match; no match; VALIDATION_FAILED on malformed input; PROOF_INVALID; LEAF_NOT_IN_ROOT;
ANCHOR_UNREACHABLE with the hash and proof still verifiable locally.

/report — public dispute intake, no account.
Three plain-language categories from product spec phase 4, optional free text, optional voice note.
States: form; submitting; submitted with what happens next and when; RATE_LIMITED; NOT_FOUND.

/receipt/[token] — participant receipt, no login.
Built for a cheap Android phone on an intermittent connection: under 50KB of JavaScript, no web
fonts on this route, system font stack only. Payment history for that project. Confirm and dispute
actions.
States: valid token; TOKEN_EXPIRED; ALREADY_CONFIRMED; DISPUTE_ALREADY_OPEN; no payments yet;
network failure with the last known state cached.

Across all of these: stamps carry status, never colour. A confirmed payment is a stamp and a
timestamp. Household coordinates are never rendered at any zoom on any public route.
```

**Exit checklist**
- [ ] Every listed state reachable from `/dev/states`
- [ ] A project with zero closed periods shows its commitment and explicit zeros, not an empty state
- [ ] Single-transfer verification handles a valid bundle, an invalid proof path and a foreign leaf distinctly
- [ ] `/receipt/[token]` ships under 50KB of JS with no web fonts, measured
- [ ] No household coordinate is rendered at any zoom
- [ ] No success colour anywhere; status is stamps throughout
- [ ] Register index renders 500 rows without a frame drop

---

## F-4 — AUTH SCREENS, ROLE SELECTION AND ONBOARDING

Endpoints: `POST /api/auth/signup`, `/signin`, `/verify-email`, `/reset/request`, `/reset/confirm`, `GET /api/auth/session`, `GET|POST /api/invites/:code`, `POST /api/projects/lookup`, `POST /api/projects`, `POST /api/projects/:id/pdd`, `GET /api/projects/:id/extraction`, `PATCH /api/projects/:id/commitment`, `POST|GET /api/projects/:id/kyb`, `POST /api/verifier/watchlist`.

```
/get-started — role selection. Full screen, three paths as .pick cards, nothing else, per
foundation 3.2: "I run a carbon project", "I assess or buy from carbon projects", "I was invited".
One line of explanation each. Bank ops and platform admin do not appear. The copy makes clear that
households do not sign up.
States: default; a path focused by keyboard.

/signup/developer and /signup/institution — deliberately clean. Email, password, organisation name,
nothing else. No marketing copy, no feature list, no social proof.
States: empty; validating; email already registered (CONFLICT); weak password with the specific
requirement named (VALIDATION_FAILED with field); submitted; verification email sent; verification
link expired (TOKEN_EXPIRED); verification complete.

/signin, /signin/reset.
States: empty; invalid credentials; account locked; unverified email with resend; reset requested;
reset link expired; reset complete; session expired mid-task returning the user to where they were.

/invite/[code] — agent invite redemption. Code validation, identity verification, device binding.
States: valid; expired; already redeemed; revoked; identity verification pending;
IDENTITY_MISMATCH; DEVICE_UNBOUND then bound.

/onboarding/developer — the five steps in foundation 3.3.
Step 1 Project: registry ID only.
Step 2 Verify: the pulled registry record shown back for confirmation.
Step 3 Commitment: PDD upload, extraction, and the extracted percentage, basis, cadence and
beneficiary definition shown with the source sentence in editorial italic and the page number, each
field editable with the correction logged alongside the original.
Step 4 Account: KYB and disbursement account creation.
Step 5 Live: the project's real public register page as it now looks to the public, at zero
enrolled and zero paid. Not a confirmation screen. Render the real route.
States per step: empty; in progress; REGISTRY_NOT_FOUND; REGISTRY_UNREACHABLE with manual entry
queued for admin review; PDD_UNREADABLE; PDD_NO_COMMITMENT; EXTRACTION_LOW_CONFIDENCE with the
field pre-filled and marked; extraction corrected by the user; KYB_PENDING; KYB_REJECTED with the
reason and the path forward; step complete; wizard resumed from a saved position days later.

/onboarding/institution — the two steps in foundation 3.4. Organisation, then watchlist with the
register searchable inline.
States: empty; populated; watchlist empty; skipped.

Wizard progress uses routeForward and routeBack. Going back never loses entered data.
```

**Exit checklist**
- [ ] Every listed state reachable, including every rejection and expiry path
- [ ] Developer wizard resumes from a saved position after a session gap
- [ ] Step 5 renders the real public register route, not a mock of it
- [ ] A commitment correction is submitted with its reason and the original remains visible
- [ ] Back navigation never loses entered data at any step
- [ ] Role selection offers no path to bank ops or platform admin

---

## F-5 — DEVELOPER CONSOLE

The densest surface and the one somebody uses daily. Endpoints: everything under `/api/projects/:id/*`, `/api/participants/:id`, `/api/agents/*`, `/api/runs/*` including `/stream`, `/api/disputes/*`, `/api/attestations/*`.

```
Build the developer console inside the left-rail shell. The period indicator at the top of the rail
shows the current period and days to close, in record face, on every screen.

/app — home.
Figures: coverage this period, open shortfall, enrolled against target, open disputes, flagged
enrolments. Next close date. An action list ordered by what blocks the next payment.
States: pre-first-enrolment; enrolling; run in flight with queuePulse on the live run; period
closing in under 72 hours, marked; period closed; shortfall outstanding; disputes outstanding;
account suspended.

/app/roster — roster index.
Strip rows: name, masked phone, wallet state, verification tier, enrolment date, agent, flags.
Filter on every column.
There is no bulk delete and no single delete control, because the obvious attack on a coverage
denominator is to delete the households you did not pay. Removal is a status change requiring a
reason. If any code path reaches DELETE /api/participants/:id it will return
PARTICIPANT_DELETE_NOT_PERMITTED; build so it never gets called.
States: empty; populated; filtered; filtered-empty; import in progress; import partially failed
with the failed rows downloadable; rows carrying flags; 10,000 rows virtualised without a frame
drop.

/app/roster/[participantId] — participant detail.
Enrolment record, capture location and time, sync delay, enrolling agent, verification result,
payment history with stamps, confirmations, disputes. Evidence collapses behind disclose so the
record leads.
Phone correctable with a logged reason. Identity not editable, and the field is absent rather than
disabled. Status changeable with a reason.
States: active; flagged with the specific flag named; excluded from the current run with the reason
shown; disputed; duplicate-blocked; removed with the reason and date.

/app/agents and /app/agents/[agentId].
Agent list with enrolments, flag rate, average sync delay, status. An agent above the flag-rate
threshold is surfaced rather than hidden.
States: active; suspended; flag rate above threshold, marked; no enrolments yet.

/app/runs — runs index.
States: no runs; draft; awaiting funding; funded; preflight running; preflight failed; executing;
partially complete; complete; cancelled; failed.

/app/runs/new — the multi-step run builder.
Period selector, roster selection, declared gross, funding amount, and the commitment arithmetic
panel from GET /api/runs/:id/arithmetic showing its working in full: commitment percentage,
declared gross, required amount, funding amount, shortfall. Then pre-flight results, then
confirmation.
A shortfall does not block the run. It is recorded and appears in the attestation. Make the
consequence explicit in the copy at the confirmation step, in the voice of foundation 1.7: name the
constraint and the arithmetic.
States: draft; shortfall warning with the figure; PREFLIGHT_EXCLUSIONS_REQUIRED;
FUNDING_NOT_RECEIVED; FUNDING_INSUFFICIENT; ROSTER_EMPTY; PERIOD_CLOSED; pre-flight passed; ready
to execute.

/app/runs/[runId] — run detail, live, driven by the SSE stream.
Per-transfer table with state, progress totals, failure breakdown by class, retry control per
class. queuePulse on in-flight rows, stampLand the moment each settles. This screen is the live
demo, so it has to be beautiful under load.
States: queued; in flight; settling; settled; failed-retryable; failed-terminal; retry in progress;
run paused; run complete with failures outstanding; run complete clean; stream disconnected and
reconnecting without losing table state.
Each failure class rendered distinctly with its own remediation copy: TRANSFER_INVALID_ACCOUNT,
TRANSFER_DORMANT, TRANSFER_LIMIT_EXCEEDED, TRANSFER_NETWORK_TIMEOUT,
TRANSFER_INSUFFICIENT_FUNDS.

/app/funding — account details, inbound payments, balance, reconciliation against outbound
transfers.
States: no funding received; funded; over-funded with the balance carrying forward;
RECONCILIATION_MISMATCH flagged to both the developer and bank ops.

/app/disputes and /app/disputes/[disputeId].
Queue with the underlying transfer evidence attached. The developer responds and the response is
logged. A dispute closes on a participant confirmation or a reversal, never on the developer's
assertion; the console offers no control that would attempt otherwise.
States: open; developer responded; awaiting participant; substantiated; unsubstantiated; escalated
to platform.

/app/attestations — closed periods, figures, downloads, chain position, Merkle root, anchor
reference, and generation of a single-transfer disclosure bundle for an auditor.
States: none yet; published; correction issued with both records; ANCHOR_PENDING.

/app/settings — users and roles, notification preferences, API keys, webhook endpoints.
States: standard CRUD; the last admin cannot remove themselves; an API key shown once then masked
forever.
```

**Exit checklist**
- [ ] Every listed state reachable and correct
- [ ] No delete control for a participant exists in the UI, and no code path calls the delete endpoint
- [ ] The console offers no control that would close a dispute without a resolution basis
- [ ] Roster virtualises 10,000 rows with no frame drop
- [ ] Run detail renders 500 concurrent transfers with queuePulse and stampLand at 60fps
- [ ] The SSE stream reconnects after a drop without losing table state
- [ ] Commitment arithmetic shows its full working, and a shortfall proceeds while being recorded

---

## F-6 — FIELD APP

Mobile-first PWA at 390px. Offline is the normal case. Endpoints: `POST /api/field/device/bind`, `POST /api/field/enrolments`, `GET /api/field/enrolments/:id`, `GET /api/field/me`.

```
Build the field app as an installable PWA with a service worker and IndexedDB. Never rendered on
desktop. Assume a cheap Android phone on an intermittent 3G connection.

/field — login and device binding.
States: DEVICE_UNBOUND with a binding request to the developer admin; bound; credential expired;
offline with a cached session and a visible expiry.

/field (authenticated) — Today.
Enrolments captured today, queue pending sync, target remaining. Persistent offline indicator and
pending-sync count in the tab bar.
States: online with empty queue; online with queue; offline; syncing; sync failed.

/field/enrol — the seven-step capture flow: consent, identity, details, photograph, location,
review, submit.
Boundary check at capture. Outside the boundary flags and still allows, with a reason required.
Duplicate identity is the one hard block in the product, and the block screen carries an
explanation the agent can read aloud to the household.
States: GPS acquiring; GPS_UNAVAILABLE with submit allowed and flagged; BOUNDARY_OUTSIDE with a
warning and a required reason; IDENTITY_UNREACHABLE with the enrolment queued; IDENTITY_MISMATCH
allowed and queued for review; IDENTITY_DUPLICATE blocked with the readable explanation; photograph
capture failed; CONSENT_MISSING so the flow cannot proceed; offline and queued; submitted.

/field/queue — sync queue, on --surface-sunken using the Console component.
The queue drains into POST /api/field/enrolments as a batch, idempotent on client UUID, and the
per-item result means a partial failure reports which items failed and why rather than failing the
batch.
States: empty; pending with count; syncing with progress; partial failure with per-item reason;
conflict requiring resolution.

/field/enrolment/[id] — read-only after submission. An agent cannot edit a submitted enrolment;
corrections go through the console with a reason. Make the read-only state obvious rather than
disabled-looking.

/field/me — the agent's own record: flag rate, average sync delay, enrolment count. Visible to them
before anyone else raises it.
States: no enrolments yet; normal; flag rate above threshold with what it means stated plainly and
without accusation.

Implementation requirements:
- Every enrolment created client-side with a UUID, a capture timestamp and a capture location
  signed by the device key.
- The queue survives force-quit and device restart.
- Photograph compressed client-side before queueing.
- Under 150KB of JavaScript on first load.
- Large tap targets and high contrast, because this is used outdoors in sunlight.
```

**Exit checklist**
- [ ] A full enrolment completes offline, queues, and syncs on reconnection
- [ ] The queue survives force-quit and device restart with capture timestamps intact
- [ ] A partial batch failure reports per-item reasons rather than failing wholesale
- [ ] Duplicate identity blocks; out-of-boundary flags and proceeds; consent cannot be bypassed
- [ ] A submitted enrolment is not editable in the field app
- [ ] Under 150KB JS first load, measured
- [ ] Usable one-handed at 390px in bright conditions

---

## F-7 — VERIFIER PORTAL

Endpoints: `GET|POST /api/verifier/watchlist`, `GET /api/verifier/projects/:id`, `GET /api/verifier/compare`, `POST /api/verifier/export`, `GET|POST /api/verifier/alerts`.

```
Build the verifier portal in the masthead shell.

/verifier — home. Watchlist summary, recent period closes across watched projects, recent disputes
raised, alerts fired.
States: no watchlist; populated; nothing changed since last visit.

/verifier/projects — project list with saved searches and watchlist management.
States: loading; populated; filtered; filtered-empty; search empty.

/verifier/projects/[projectId] — project detail, deeper than the public page.
Period-level transfer counts, confirmation rates, dispute detail with the basis of each resolution,
signal counts by class, enrolment distribution, agent flag rates in aggregate. No participant PII
at any granularity; the contract does not return it, so there is nothing to hide in the UI.
States: all the public project states, plus signals present; agent flag rate elevated; a period
whose confirmation rate is materially below the project's own history, surfaced with the two
figures side by side and no verdict attached.

/verifier/compare — developer comparison on coverage, confirmation rate, dispute rate, shortfall
history.
States: nothing selected; two selected; three selected; incomparable periods, stated plainly.

/verifier/export — signed attestation bundle, CSV, API keys.
States: nothing selected; generating; ready; generation failed; key issued once then masked.

/verifier/alerts — notify me when coverage drops below a threshold, when a dispute is raised, when
a period closes late, when a correction is issued.
States: none configured; configured; alert fired with the triggering record linked.

Copy rule for this entire surface: it presents facts and never a verdict. No scores, no grades, no
badges, no risk labels, no traffic lights. This is a product decision, not a styling one, and it is
what keeps Attest out of the ratings business.
```

**Exit checklist**
- [ ] No score, grade, badge, rating or risk label anywhere on this surface
- [ ] A generated attestation bundle validates on `/verify`
- [ ] Comparison handles non-overlapping periods and says so
- [ ] Every listed state reachable

---

## F-8 — BANK OPERATIONS CONSOLE

Endpoints: `GET /api/ops/signals`, `/api/ops/signals/:id`, `/api/ops/signals/:id/graph`, `GET /api/ops/cases`, `POST /api/ops/cases/:id/action`, `GET /api/ops/exceptions`, `GET /api/ops/reconciliation`.

```
Build the bank operations console in the masthead shell.

/ops — home. Open cases by severity, signals this period, verification exceptions, reconciliation
status across projects.
States: nothing open; signals present; cases open; RECONCILIATION_MISMATCH.

/ops/signals — signals queue. Each of the five classes rendered distinctly with severity, accounts,
project and period.
States: empty; populated; filtered by class; filtered by severity; a signal already attached to an
open case.

/ops/signals/[signalId] — signal detail with the account graph from the graph endpoint.
The graph shows where money went after it landed, hop by hop, with amounts and timing. Four hundred
household wallets sweeping into three accounts within forty-eight hours is the signature of a
developer paying themselves through dummy households, and it is invisible from outside a bank.
Build it as a force-directed graph in ink and rules on --surface-sunken, with
--stamp-blocked-ink on the concentrating nodes and nothing else coloured.
States: graph loading; rendered; sampled with the sampling stated when the endpoint returns
sampled: true; no onward movement yet; onward movement entirely normal.

/ops/cases — case management: open, investigating, substantiated, unsubstantiated, closed. Actions:
freeze, request documentation, escalate, clear.
States: each case state; an action pending authorisation; an action rejected (FORBIDDEN).

/ops/exceptions — verification exceptions: failed checks, name mismatches, tier limits reached.
States: empty; populated; resolved items shown with their resolution.

/ops/reconciliation — inbound developer funding against outbound transfers against balances, per
project per period.
States: reconciled; mismatch with the delta and the candidate causes; period not yet closed;
awaiting settlement data.

Raw signal evidence never appears on a public or verifier surface. The published form is a count,
and this console is the only place the evidence is rendered.
```

**Exit checklist**
- [ ] Account graph renders the 400-node sweep legibly and performantly
- [ ] All five signal classes render distinctly
- [ ] The sampled state is stated on screen when the endpoint samples
- [ ] Every listed state reachable

---

## F-9 — PLATFORM ADMIN, INTEGRATION, HARDENING AND DEMO

```
1. Platform admin. Project onboarding review. Registry sync status and failure log. Extraction
   review queue for low-confidence commitment parses. Dispute escalation. Attestation chain
   integrity monitor with alerting on discontinuity.

2. Integration. Point the typed client at the real backend by changing its base URL. Import the
   shared types package from BE-0 and delete the local duplicates. Walk every screen and confirm
   each one works against the real endpoints. Where a provider is still mocked on the backend, the
   screen still works and the demo records which.

   If the real response differs from the contract anywhere, fix the backend or amend backend
   section 3 and both sides together. Do not patch around a mismatch in the front end.

3. Deploy. Production and staging. All credentials from environment variables. Confirm the deployed
   URL loads the landing page and the register on a phone over mobile data, not just on a laptop,
   because that is how a judge will open it.

4. Motion audit. Walk every screen. Remove any animation not in foundation 2.5, any loop other than
   queuePulse, anything on the anti-slop list, any reduced-motion gap, any duration that is not a
   whole frame at 24fps. Profile the landing page and the live run screen and fix anything under
   60fps.

5. State sweep. Walk every screen and confirm every state in its phase prompt is reachable from
   /dev/states, not merely implemented.

6. Copy sweep. No exclamation marks. No apology copy. No congratulation. No verdict about any
   project anywhere. Every figure carries its denominator. Every label is an uppercase noun in
   record face.

7. Accessibility pass. Keyboard navigable throughout. Every flagged, blocked and review state
   carries a glyph and a text label. Focus visible on every interactive element. Contrast verified
   against foundation 1.2.

8. The demo path as a Playwright test that runs green: the register shows the project, a run
   executes and transfers settle live, the period closes, the hash anchors, and the attestation
   appears on the public register. This runs on stage, so it is the one test that must never be
   flaky. Run it ten times consecutively and fix any flake.

9. The demo recording. Drive it with Playwright at 1920x1080 with video capture, so it is
   deterministic and reproducible rather than a screen capture that must be redone after every
   change. One continuous take of the demo path above, no narration baked in, so a voice track can
   be laid over it. Re-record by re-running the script.
```

**Exit checklist**
- [ ] Every screen works against the real backend, with any still-mocked provider recorded
- [ ] No contract mismatch patched around in the front end
- [ ] Deployed and loading on a phone over mobile data
- [ ] `/dev/states` and `/dev/kitchen-sink` return 404 on `https://team05.xtradot.co`
- [ ] No `NEXT_PUBLIC_` variable carries a key, secret or token, enforced by a build check
- [ ] `npm audit` clean, or every remaining finding written down with a reason
- [ ] Demo path Playwright test runs green ten times consecutively
- [ ] Demo video recorded by script and reproducible by re-running it
- [ ] Every state reachable from `/dev/states`
- [ ] Motion audit clean; 60fps on the landing page and the live run screen
- [ ] Copy sweep clean
- [ ] Keyboard navigable throughout, no colour-only signalling anywhere
- [ ] Commit history shows Lydia Solomon as sole author with no agent trailers anywhere
