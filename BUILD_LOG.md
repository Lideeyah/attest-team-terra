# Attest — front-end build log

## Where it got to

Ten phases, F-0 through F-9's cluster-free portion. Every gate green:

| Phase | | Assertions |
|---|---|---|
| F-0 | Foundation | 35 |
| F-1 | Mock server, typed client, state control | 42 |
| F-2 | Landing page | 45 |
| F-3 | Public surfaces | 49 |
| F-4 | Role selection, auth, onboarding | 86 |
| F-5 | Developer console | 112 |
| F-6 | Field app | 44 |
| F-7 | Verifier portal | 69 |
| F-8 | Bank operations | 54 |
| F-9 | Platform admin and the sweeps | 50 |

Tests 12 of 12, lint clean, and the demo path runs green ten times
consecutively.

## The three things most worth your attention

**1. The disclosure verifier had a hole, and it was the worst one available.**
It accepted the period's own published Merkle root as a leaf with an empty
proof path and answered "match". The root is printed on every public
attestation page, so anybody could assemble that bundle out of public data and
be told a payment belonged to a period — on the one screen whose entire job is
saying whether a proof holds. It is closed: leaves and internal nodes hash in
separate domains, a bundle carries the transfer's own facts and the verifier
recomputes the leaf instead of trusting it, a proof of the wrong length is
refused, and a record that has since been corrected says so. The gate now asks
that question four ways, and F-5's independent verification could not forge a
bundle.

**2. Every phase that has been verified passed its gate and then failed the
verification.** F-3, F-4, F-5, F-6, F-7 and F-8: fourteen findings on F-4,
thirty-one on F-5, fourteen on F-6, and both of the last two failed on their
exit checklists. All are fixed, and the gates that missed them grew — F-4 from
51 assertions to 86, F-5 from 99 to 112, F-6 from 37 to 44, F-7 from 64 to 69,
F-8 from 44 to 54. The pattern is consistent and worth knowing: a gate asserts
what a screen does and almost never what it leaves out, so a figure that
disagreed with another screen, a state that could not be reached, and a claim
the product made about itself all passed. The three worst things found were a
confirmation rate rendered a hundred times too small, a console reporting
actions that never happened, and a 403 rendered as "no case is open".

**3. Nineteen endpoints this lane needs that backend section 4.3 does not
have.** The console's nine, the field app's identity check, the verifier's
export shape, platform admin's five, the auth resend and the roster imports.
Each is named in `lib/api/contract.ts` with the reason it exists, and the
backend lane adopts or amends them. Nothing was patched around in the front
end.

## What is waiting on you

- **The hero sentence.** The placeholder is the one the orchestration named:
  "The money is promised, sometimes paid, and never provable."
- **The 150KB budget on the field app.** First load is 157.0KB, of which
  138.9KB is the framework every route pays and 18.2KB is the field app's own
  code. Under 150 means a different stack for that one surface.
- **The field app at desktop width** renders as a phone-width column rather
  than refusing outright. The phase says "never rendered on desktop".
- **`--ink-dim` at 2.9:1**, the Farm Africa citation, the synthetic Gold
  Standard reference, and the Privacy and Terms text.
- **Deployment, the backend swap and the demo recording**, all three waiting
  on the sandbox.

---

# Attest front-end build log

Written as the build runs. The summary at the top is the last thing written.

---

## F-0 — Foundation

**Built.** Next.js App Router in TypeScript strict mode with Tailwind and Motion.
Route groups `(public)`, `(auth)`, `(app)`, `(field)`, `(verifier)`, `(ops)`,
`(admin)`. Repository hygiene: `.gitignore` covering `.env` and variants, the
team sandbox configuration by pattern, `*.pem` and `*.key`, `/uploads`, and the
standard Node and Next entries, verified with `git check-ignore -v`;
`.env.example` naming every variable with a one-line comment. Token stylesheet
at `app/styles/tokens.css` carrying the colour, type, space, cadence, curve and
travel tokens, wired into the Tailwind theme with Tailwind's own palette, type
scale, radii and shadows removed. All three faces self-hosted, Cabinet Grotesk
at weight 800 from Fontshare. Motion primitives as Motion variants in
`lib/motion.ts` and as keyframes in `app/styles/motion.css`. The component
library from foundation 1.6. The three navigation shells. The route transition
wrapper. Global error boundary, global error, not-found and a loading
convention. `/dev/kitchen-sink`, unlinked, with every component and every
primitive and a replay control.

**Gate.** `npm run gate -- F-0`: 31 assertions, 31 passed.

```
typecheck: tsc --noEmit                                        PASS
typecheck: no any                                              PASS
gitignored: .env, .env.local, team05.yml, secrets/*.pem, /uploads  PASS
no hex colour outside the token stylesheet                     PASS
no millisecond literal outside the token stylesheet            PASS
no cubic-bezier outside the token stylesheet                   PASS
no border-radius outside the token stylesheet and the punch    PASS
no rounded utility class                                       PASS
no spring easing anywhere                                      PASS
no shadow outside the modal scrim                              PASS
Tailwind defaults removed                                      PASS
durations are whole frames at 24fps                            PASS
route renders /dev/kitchen-sink and the three shells           PASS
kitchen sink renders every component (24 markers)              PASS
kitchen sink renders every motion primitive (13 markers)       PASS
rotated stamp keeps centring and rotation while animating      PASS
record cell renders in Courier Prime                           PASS
reduced motion resting on /dev/kitchen-sink                    PASS
accessibility on /dev/kitchen-sink (axe, zero critical)        PASS
keyboard reachability on /dev/kitchen-sink                     PASS
four screenshots written to verification/F-0/                  PASS
```

**Decisions taken on Lydia's behalf.**

1. **The landing page carries Movement 1 only at F-0.** The six-movement
   composition is F-2's work. F-0's page at `/` is the stillness movement so the
   foundation has a real route to render rather than a scaffold page.
2. **Tailwind v4 has no JavaScript config**, so "delete the default palette from
   the config" is done in CSS: `@theme { --color-*: initial; --font-*: initial;
   --text-*: initial; --radius-*: initial; --shadow-*: initial; ... }` in
   `app/globals.css`, which removes the default utilities exactly as a config
   deletion would.
3. **Font faces are read from CSS variables rather than by family name.**
   `next/font` exposes a hashed family name, so each token reads its variable
   with the literal family name and the full fallback stack behind it.
4. **Inter Tight 800 is loaded as the display fallback.** The foundation names
   it in the fallback stack; loading it means a missing display face degrades to
   a real typeface rather than to a system sans.
5. **Developer tooling is excluded at build time, not route-guarded.** The
   routes live in `dev-tools/dev` and are copied to `app/dev` by
   `scripts/sync-dev-tools.mjs`, which runs on `predev` and `prebuild` and
   removes them unless `ATTEST_DEV_TOOLS=1`. A production build has no such
   route. This is backend 6A.1 brought forward from F-1 because the kitchen sink
   already needed it.
6. **The field shell is held to a phone width on a wide screen** rather than
   refusing to render. The foundation says it is never rendered on desktop; a
   blank screen during a demo is worse than a phone-width column, so the shell
   centres itself at 430px on `--surface-sunken`.
7. **The `(public)` group layout adds no chrome.** Movement 1 is one sentence
   and one rule, so a masthead in the group layout would contradict it. The
   register, verify and report surfaces bring the masthead shell with them.
8. **Reduced motion is honoured once**, by `MotionConfig reducedMotion="user"`
   in `components/MotionProvider.tsx` plus the `prefers-reduced-motion` block in
   `app/styles/motion.css`. No component implements it.

**Manual review needed.**

1. **The hero sentence.** `/` carries the placeholder the orchestration prompt
   names: "The money is promised, sometimes paid, and never provable." Lydia
   chooses the final sentence from foundation 5.1. *(Applied in F-2; at F-0 the
   page still carried the product spec one-line, which F-2 replaces.)*
2. **Contrast of `--ink-dim` on `--canvas-paper`.** `#8C887E` on `#F7F4EB` is
   about 2.9:1, below WCAG AA for body text. It is the foundation's own token
   and it carries labels, eyebrows and timestamps, so it has not been changed.
   The gate asserts zero *critical* axe violations, as the orchestration prompt
   specifies; colour contrast is reported by axe as *serious* and is therefore
   not gated. If this matters for judging, darkening `--ink-dim` to about
   `#6F6B61` would reach 4.5:1 without changing the design.
3. **`.record-cell` at 12px in Courier Prime** is below the 14px that reads
   comfortably on a low-density screen. It is the foundation's scale and has not
   been changed.
4. **The naira sign is not in Courier Prime.** `₦` falls back to the system
   monospace, so a currency mark renders in a different face from the figure
   beside it. The alternative is writing amounts as `NGN 23,050.00`, which the
   product spec does not do. Left as the foundation has it.

**Independent verification.** A fresh verifier with no sight of the
implementation checked F-0 against its own checklist and returned 22 findings.
All were taken. The substantive ones:

- Four primitives — `tallyTo`, `hashResolve`, `pressTravel` and `queuePulse` —
  existed only as hand-rolled loops or bare keyframes rather than in the motion
  module, and `Figure.tsx` restated the shutter curve in JavaScript. All four
  are now in `lib/motion.ts`, which also exports `PRIMITIVE_CLASS` so the
  keyframe-driven primitives are named in one place and never written as a
  class string inside a component.
- Reduced motion did not collapse Motion's own animations. `reducedMotion="user"`
  suppresses transform and layout animation only, so opacity still ran at full
  duration. `MotionProvider` now also collapses the transition itself.
- `Figure` rendered `0` and `Hash` rendered an empty string until JavaScript
  ran, so the server-rendered page carried a wrong figure and a blank hash.
  Both now render the real value and animate from it.
- The record face has no glyph for ■ ▲ ✕ ◆, so every status mark fell out of
  Courier Prime. The four marks are now drawn in CSS in the current ink.
- `sealPeriod` ran its contrast step alongside the rule draw rather than after
  it. The transition now carries `var(--t-draw)` as its delay.
- The West Africa Time offset was computed as `getUTCHours() + 1` with no wrap,
  so any timestamp from 23:00 UTC rendered an impossible hour. It now shifts
  the instant.
- `--mark-border` was being used as a structural rule weight in six places; a
  change to the mark would have changed every heavy rule. `--rule-weight-heavy`
  and `--stroke-tick` now carry those jobs.
- `@theme inline` defined `--ease-shutter: var(--ease-shutter)`, which resolved
  only by declaration order. Removed.
- Two px literals (`430px`, `56px`) outside the token stylesheet, the frame
  duration restated in two components, and the toast dwell as a bare `4000`.
  All are tokens now: `--field-width-max`, `--tap-target`, `--t-dwell`.
- Nested `<main>` in the field shell; `role="tab"` on masthead navigation
  links; a table with no overflow container; missing disabled and invalid
  states in the reference; a dead class. All fixed.

**On the verifier's finding about phase discipline.** It is correct: F-1 files
were being written while F-0 was under independent verification, which the
foundation's build discipline forbids. The F-0 fixes above were applied before
F-0 was committed and the F-1 work is committed separately, but the overlap
should not have happened and did not happen again.

**On the verifier's open question about button variants.** The foundation's
1.6 lists `.btn`, `.btn-outline`, `.btn-quiet` and `.btn-sm`, which is three
variants plus small; the phase prompt says four plus small. The foundation is
authoritative on anything visual, so three variants plus small is what is
built.


---

## F-1 — Mock server, typed client and state control

**Built.** A mock server implementing every endpoint in backend 4.3 at the
contract's own paths, with the same request and response shapes, the same
`page`/`per_page`/`meta` pagination and the same success and error envelopes.
One dispatcher in `lib/mock/router.ts` serves both the running application
(`app/api/[[...path]]/route.ts`) and component and test work (`lib/mock/msw.ts`),
so a fixture cannot drift between them. Fixture data in `lib/mock/seed.ts`:
three Gold Standard projects, one with three closed periods and an open one,
one clean, one carrying a 400-wallet onward-flow concentration; participants
generated deterministically from their index so the roster can be any size;
named agents with differing flag rates including one above threshold;
participants whose resolved account name deliberately does not match the
enrolled name; transfers carrying fee, VAT, stamp duty and total debit read
from the tariff rather than computed in a screen. A typed client in
`lib/api/client.ts` returning a discriminated result, retrying idempotent reads
only and sending `Idempotency-Key` on every mutation. A mock Server-Sent Events
stream emitting all six event types with configurable rate, failure share and
reversal share. A state control panel at `/dev/states` that forces any of the
47 contract codes, optionally scoped to a path fragment and optionally once.

**Gate.** `npm run gate -- F-1`: 15 assertions, 15 passed. 37 endpoints probed
for envelope shape, all 47 error codes forced and observed, all six stream
events seen, and `/dev/states`, `/dev/kitchen-sink` and `/api/dev/force` each
404 on a production build.

**Decisions taken on Lydia's behalf.**

1. **One dispatcher behind two transports.** The contract has roughly seventy
   endpoints; writing seventy route files would guarantee drift. The dispatcher
   holds a route table and both the app's catch-all route handler and the MSW
   handlers call it.
2. **Amounts are decimal strings end to end.** No screen or fixture converts to
   minor units; the arithmetic helpers in `lib/mock/seed.ts` add and subtract in
   minor units internally and return strings, so no float ever touches an amount.
3. **The registry record is synthetic.** The seed uses Gold Standard identifiers
   in the registry's own format with a plausible issuance history, because the
   real registry record cannot be pulled without network access to the registry.
   Flagged below.
4. **`Idempotency-Key` returns the first result** rather than an error, which is
   what the header means. `DUPLICATE_REQUEST` remains forceable from
   `/dev/states`.
5. **Developer tooling has one fetch module of its own.** `/dev/states` talks to
   endpoints that are not in the contract, so they are not in the typed client;
   `dev-tools/dev/states/devControl.ts` is the only file in the tree with a
   fetch outside the client.

**Manual review needed.**

1. **The Gold Standard project reference is synthetic**, including the registry
   ID, the boundary name and the issuance history. Before the demo it should be
   replaced with a real registry record pulled from Gold Standard's public
   registry.
2. **The stream's reversal share defaults to 3 percent.** The sandbox reverses
   on amounts ending `.04`; the share is a stand-in until the live rail decides it.

**Independent verification.** A fresh verifier checked F-1 against the contract
endpoint by endpoint and returned 29 findings. It was right about all of the
substantive ones, including the gate itself, which probed 37 endpoints and
accepted any status below 500 — three of its probes were passing on a 404 for
identifiers that do not exist in the seed. What changed:

- **Four endpoints were missing.** `POST /hooks/forge` and the three
  `/api/webhooks/*` callbacks now exist. The hook verifies before it acts:
  constant-time HMAC over `{timestamp}.{raw_body}`, a five-minute window and
  de-duplication on `event_id`, per backend 6A.3.
- **The mock server shipped in production builds.** It now lives in
  `dev-tools/api-mock` and is copied in only when `ATTEST_API_MODE` is not
  `live`. A live build's whole route tree is `/`, `/_not-found` and `/healthz`,
  asserted by the gate.
- **Nine error codes carried the wrong HTTP status** against the bank's table in
  backend 3, `per_page` was capped at 500 rather than 100, and ten list
  endpoints returned no `meta` against the 4.4 guarantee. All corrected and
  each is now an assertion.
- **Idempotency did neither half of what the conventions require.** The same
  key and body now replays with `Idempotent-Replayed: true`; the same key with
  a different body returns 409. The client's generated key was a timestamp,
  which guaranteed two clicks were two keys; it is a UUID now, and every
  mutation that moves money or creates a record takes its key explicitly.
- **The client claimed "nothing was submitted" on a transport failure**, which
  is the opposite of backend 2.4. It now says the outcome is unknown and to
  requery, and carries a `transport` flag.
- **MSW was dead code.** `lib/api/client.test.ts` now runs the client against
  it under vitest, which also gave the client its first callers and caught two
  return types that contradicted the mock.
- **Charge fields were camelCase** where the bank names them `stamp_duty` and
  `total_debit`, and the interbank charge was always read from band two.
  `chargeFor()` matches the amount to its band.
- **The stream's failure share was `index % 100`**, so a short run failed at a
  different rate from a long one and failures all arrived first. It draws from
  a seeded generator now, the reversal share is configurable and on the panel,
  and a forced code fails the stream itself so the disconnected state is
  reachable.
- **Every dispute fixture named a transfer that could not exist**, and one
  named a run that did not exist. `transferIdFor()` is the one place a transfer
  id is computed, and `run_2026q1` and `run_2026q2` were added.
- **Identifiers ignored the sandbox's synthetic pattern.** BVNs follow
  `222000000NN` and NINs `700000000NN`, and only the last four are carried, per
  6A.6. Seeded households also carry the 2.5 trigger accounts and amounts
  ending `.01` to `.05`, so a failure is reachable against the sandbox itself.
- Three non-contract query parameters and an invented endpoint inside
  `/api/runs/:id/` are gone; the stream's controls are at `/api/dev/stream-config`.

**Decision taken against one finding.** Participants are still generated from
their index rather than held as a 500-row fixture. The roster has to virtualise
10,000 rows in F-5 and a fixed fixture cannot supply them, so the generator
stands and the project's `enrolled` figure is what sizes a roster.

**Gate.** `npm run gate -- F-1`: 27 assertions, 27 passed. 80 endpoints probed
with their own verbs and seeded identifiers, all 47 codes forced with their
status checked against backend 3, both idempotency behaviours asserted, the
hook's refusal asserted, and a live build asserted to carry no mock and no
developer tooling.

**Second verification pass.** The same verifier re-checked F-1 against its own
list. It confirmed twenty-three findings fixed by probe rather than by reading,
and returned six that did not hold. All six are now fixed:

- **`.gitignore` did not ignore the mock server.** `/app/api/[[...path]]` is a
  glob character class, so it matched nothing and the generated copy was
  committed in the F-1 commit. Escaped, untracked, and the gate now runs
  `git check-ignore` over all four generated trees rather than two.
- **The idempotency fingerprint erased everything below the top level.** The
  second argument to `JSON.stringify` is a replacer applied at every depth, so
  a batch of enrolments fingerprinted as `{"items":[{}]}` and a second batch
  carrying different households replayed the first instead of being refused.
  The body is canonically ordered and hashed whole, and the gate now asserts a
  batch that differs below the top level.
- **`?rows=` was still honoured by the mock**, so an F-5 screen could have been
  built on a parameter the contract does not list. It is gone; the roster size
  for profiling is set from `/api/dev/roster-size`, which no production build
  carries, and the gate asserts both that the unlisted parameter is ignored and
  that the developer control works.
- **`/arithmetic` still hard-coded the tariff band** while `chargeFor()` sat
  beside it unused. It reads the schedule now.
- **The inbound hook returned 500 on two attacker-reachable inputs**: a
  right-length non-hex signature, which `Buffer.from` truncated into a
  different-length buffer and threw inside `timingSafeEqual`, and a signed body
  that was not JSON. Both are refusals now, which matters because a crash turns
  one malformed delivery into five retries.
- **The gate recorded a pass for an assertion it did not make.** With no
  webhook secret set it green-lit the hook's accepting path. The gate's server
  now carries a secret of its own and the accepting, de-duplicating, malformed-
  signature and malformed-body paths are each asserted.

**One further change the verifier raised.** The stream was emitting a seventh
event type, `stream.error`, and carrying `failureClass`, `sessionId` and
`reason` on its events. The contract enumerates six events, each carrying the
transfer id and the new state and nothing else. The stream now honours that
literally: a forced code drops the connection rather than inventing an event,
and the live run screen will read the failure class from
`GET /api/runs/:id/transfers` rather than from the stream. The gate asserts no
event outside the six appears.

**Gate.** `npm run gate -- F-1`: 39 assertions, 39 passed.

**Third verification pass.** A–F all held under probing, with no regressions.
Two things came back, and both were right:

- **The stricter stream reading had broken the thing it was meant to fix.**
  With `failureClass` removed from the event, the screen was told to look the
  class up in `GET /api/runs/:id/transfers` — but two independent generators
  were deciding which transfers failed, so a transfer the stream reported as
  failed was settled in the table, at a different rate, and the run's own
  `counts` were a third hand-written figure. One generator decides now:
  `transferStateAt()` draws each outcome from the configured shares, the
  stream reads each transfer's own state rather than rolling its own, and a
  run's counts and failure breakdown are tallied from the same source. The
  gate asserts that a transfer the stream reports as failed is failed in the
  transfer list and carries a class.
- **Widening the try/catch grep covered nothing**, because the exclusions
  removed every file in `lib` that contains a `catch`. The pattern now ignores
  a `.catch()` method call, which is the discipline rather than a breach of it,
  and nothing is excluded but the test file.

**What that exposed, and what followed.** Once the counts were computed, the
projects' typed figures disagreed with them. The product's first principle is
that coverage is computed and never typed, so the fixture now obeys it too: a
period declares only which period it is, whether it is open, when it closed and
whether it was corrected, and every figure in it — households paid, the amount
households received, the charges borne, the commitment required, the shortfall
and the confirmation rate — is tallied from the run behind it. A project's
totals are its periods'. The record that comes out of it reads as a record
rather than as a set of figures somebody chose:

```
Ekuri    2026-Q1  closed       980 of 1,140   short ₦11.4m   confirmed 0.72
         2026-Q2  closed late  1,382 of 1,612 short ₦9.1m    confirmed 0.71
         2026-Q3  closed       1,611 of 1,904 short ₦6.8m    confirmed 0.72
         2026-Q4  open         1,738 of 2,090 short ₦8.1m    confirmed 0.72
Hadejia  2026-Q3  closed       714 of 846     commitment met confirmed 0.82
Akassa   2026-Q3  closed       1,205 of 1,402 short ₦3.4m    confirmed 0.30
```

Akassa's confirmation rate is the fixture's point: the money cleared and the
households did not acknowledge it, which is what the onward-flow signal and
case 0231 are about.

**One source of figures.** `lib/sample.ts` held a second set of numbers for the
component reference. It now derives from the mock's seed, so a figure on
`/dev/kitchen-sink` is a figure the product serves. Amounts are NGN decimal
strings everywhere; `lib/record.ts` formats the string's own parts and nothing
in the front end converts a unit.

**Two smaller items from the same pass.** The three developer endpoints refuse
a malformed body rather than failing on it. And the forced stream drop logs
`failed to pipe response` in the development server: that is the connection
being dropped deliberately, which is the mechanism rather than a defect, and
it is what makes the live run screen's reconnecting state reachable.

**Gate.** `npm run gate -- F-1`: 40 assertions, 40 passed. `F-0`: 31 of 31.

**Fourth verification pass.** The computation itself held: every period figure
reconciled with its transfers to the kobo, across all three projects, verified
by paging 9,714 rows rather than by reading. Nine things around it did not, and
all nine are fixed:

1. **Moving the shares from the panel left every computed figure stale**, which
   was the previous finding reappearing through the control the phase requires.
   The fixture now recomputes when the shares move: `setStreamConfig` notifies a
   listener the seed registers, and the runs, the periods and the reconciliation
   are all re-tallied. The gate asserts it at a changed share rather than only
   at the default.
2. **An attestation carried the project's confirmation rate rather than the
   period's**, so a closed period reported a figure computed from different
   transfers. It reads `period.confirmationRate` now.
3. **The one substantiated dispute pointed at another project's run.** It was
   the dispute the whole bank-operations narrative rests on. It names a
   transfer in its own project's run.
4. **The dispute and signal counters were still typed**, and three of six were
   wrong — the public register published eleven open disputes for a project
   whose disputes endpoint returns one. They are counted from the data.
5. **Reconciliation was still typed**, and every one of its nine figures
   contradicted the run it reconciled, including a row asserting agreement.
   It is produced by arithmetic: inbound funding against what households
   received against the charges borne, and a mismatch is what the arithmetic
   finds rather than a state somebody chose.
6. **The funding screen had silently started reporting the first quarter's
   figure**, because adding the earlier runs changed what `RUNS.find` returned.
   It selects the open period's run and derives the balance.
7. **Every project paid ₦23,050 a household** while two of them had their
   commitments priced from different amounts, so one of them reported no
   shortfall while 132 households went unpaid. Each project pays its own
   amount, and a period now states a surplus as well as a shortfall, so a zero
   shortfall is never confused with an over-payment.
8. **There was no clean project left in the register.** Hadejia-Nguru runs at
   zero failure and zero reversal: 846 of 846 households paid, the commitment
   met, reconciled. It is the comparator the register and the compare view
   exist to provide.
9. **Every closed period's attestation claimed a close date months before its
   transfers settled**, and session identifiers collided across runs because
   every transfer was stamped on 9 November. A transfer is queued when its own
   run executed, and the session identifier is thirty digits carrying the
   settlement date and time, as the bank returns it.

Two smaller items from the same pass: the open run now carries 412 queued and
36 in-flight rows, so the live screen's queue is exercisable from the fixture
and not only from the stream; and `formatNaira` groups the digit string
directly rather than through `Number`, which is what its comment claimed.

**The record the fixture now publishes.**

```
Ekuri    2026-Q1  closed         980 of 1,140   short ₦11.4m   reconciled
         2026-Q2  closed late  1,382 of 1,612   short  ₦9.1m   reconciled
         2026-Q3  closed       1,611 of 1,904   short  ₦6.8m   reconciled
         2026-Q4  open         1,369 of 2,090   mid-run, 448 still queued
Hadejia  2026-Q2  closed         720 of 720     commitment met, reconciled
         2026-Q3  closed         846 of 846     commitment met, reconciled
Akassa   2026-Q3  closed       1,205 of 1,402   short ₦5.4m    mismatch ₦90,010.86
                                                confirmation 0.30, 3 signals
```

**Gate.** `npm run gate -- F-1`: 42 assertions, 42 passed, including that a
run's counts follow the shares when the panel moves them and that a period's
paid count is the transfers that cleared.

---

## F-2 — The landing page

**Built.** The six-movement scroll-linked composition at `/`. Movement 1 is one
sentence in `h1.display` on paper with a single heavy rule beneath it, which
rises in once on load and then does nothing: no scroll indicator, no animated
arrow, nothing autoplaying. Movement 2 tallies three figures — households
enrolled, households recorded as paid, coverage — with the source attributed in
an eyebrow beneath. Movement 3 builds the ledger, scroll position driving the
row count so scrolling up removes rows and scrolling down adds them. Movement 4
lands the stamps, impact then ink, staggered. Movement 5 seals the period: the
heavy rule draws across and the block above steps back one contrast level
without moving. Movement 6 resolves the attestation hash and the sealed block
takes its place on a register beside two other projects, carrying crop marks,
with the page's one button beneath it. Below the composition: a section for
developers, a section for institutions, and a footer. Everything is transform
and opacity; nothing animates a property that triggers layout.

**Gate.** `npm run gate -- F-2`: 27 assertions, 27 passed. Every movement
present and resolving in both directions at 390, 768, 1280 and 1920; 60fps
through the full scroll in both directions; six intelligible stills under
reduced motion; the accent on exactly the mark, the h1 and the call to action;
nothing from the anti-slop list; and the hero sentence asserted to be the named
placeholder and to be flagged here.

**What the gate found about the gate.** The browser assertions had been running
against a development server, and a development server does not hydrate under
the headless browser the gate drives — its hot-reload socket fails, and no
client code runs. Every assertion about anything the client does was therefore
passing against a dead page, including F-0's reduced-motion check. The gate now
builds and serves two production configurations side by side, one carrying the
developer tooling and the mock and one carrying neither, in separate output
directories. F-0 and F-1 were re-run against them: F-0 is 31 of 31 and F-1 is
42 of 42, and three real console errors surfaced on the way, where the
navigation shells were prefetching routes that later phases will build.

**Decisions taken on Lydia's behalf.**

1. **The movement headings are set in ink rather than in bottle.** The type
   system puts h2 in the anchor tone, but this page carries five of them and
   the exit checklist asks for exactly one accent element besides the h1 and
   the mark. The accent appears three times on the page: the mark, the h1 and
   the button. `.h2-display-ink` is the landing page's own rule and is used
   nowhere else.
2. **Each movement is 160vh of scroll** with its content pinned, which makes
   the page about 860vh rather than the 600vh the document suggests. At 600vh
   the stamps and the seal resolved faster than they could be read.
3. **A movement reports its own state.** Each section carries `data-movement`
   and `data-resolved`, so the sequence is readable from the page rather than
   inferred from a scroll position. It is how the gate asserts the composition
   and it costs nothing at run time.
4. **The figures are written straight into the DOM** from the motion value
   rather than through React state, so a scroll does not re-render the page.

**Manual review needed.**

1. **The hero sentence** is "The money is promised, sometimes paid, and never
   provable.", the first of the four proposals in foundation 5.1, carried as
   the placeholder the build instructions name. It is Lydia's to settle.
2. **The source attribution in Movement 2** reads "Farm Africa benefit-sharing
   disclosure, 2024. Households enrolled in the programme against households
   recorded as paid." The figures are the ones the build instructions give
   (21,658 enrolled, 7,375 paid, 34 percent); the citation's exact title and
   year should be confirmed against the publication before the deck is shown.

**Independent verification of F-2.** The verifier confirmed the measurable
half — 60fps under 4x CPU throttling with no dropped frames, six intelligible
stills under reduced motion, exactly one accent element besides the h1 and the
mark, nothing from the anti-slop list, no verdict about any project in the copy
— and then found that the movements were not playing the system's primitives
at all. Eight failures, all taken:

1. **Movement 4 was not `stampLand`.** It was a scroll-linked scale that fell
   from 1.28 to 1 and never overshot, with no second beat: a linear
   shrink-and-fade in place of the signature animation. The stamp now plays the
   primitive through `Stamp`'s own `animate` prop, triggered when the movement
   is reached rather than driven by scroll position, and the gate samples its
   scale while it lands: 1.280 to 0.970 to 1, impact then ink.
2. **Movement 5's contrast step did not reach the headline**, because the
   heading set its own colour and the sealed rule could not override it. The
   step now reaches the heading, the eyebrows, the figures and the stamps, and
   the opacity change the primitive does not specify is gone: it is a contrast
   change, not a fade.
3. **The attestation hash was visible from the top of the page** and then
   scrambled, so the one effect that is earned because a hash genuinely
   computes was resolving to a value the reader had already seen. The hash is
   now part of the movement's own reveal and resolves as it arrives, and it
   replays on a second pass.
4. **The call to action was prefetching a route that does not exist yet**,
   which put a 404 in the console on every load. `/register` is F-3's work; the
   link now carries `prefetch={false}` until it exists.
5. **The page was about 960vh**, with most of each pin spent frozen. It is now
   7.6 screens, and the gate holds it under eight.
6. **At 390px the ledger was taller than the phone**, clipped top and bottom.
   The compositions show the rows that fit at phone width, and the gate
   measures every movement at the middle of its own pin against the screen.
7. **The hero sentence.** The verifier is right that foundation 5.1 says none
   of the four proposals is applied and the F-2 prompt says to carry the
   product spec's one-line. The orchestration prompt for this unattended run
   says the opposite, by name: use "The money is promised, sometimes paid, and
   never provable." The later and more specific instruction is the one that was
   followed, and the conflict is recorded here so Lydia can settle both.
8. **The primitives were bypassed and token values restated.** `tallyTo`,
   `recordArrive`, `stampLand` and `ruleDraw` all existed and none was used;
   `[12, 0]`, `[1.28, 1]`, `transformOrigin: "left"` and the literal class
   string `"anim-record-arrive"` were written into the page. Every movement now
   plays its primitive from `lib/motion.ts` or its class from `PRIMITIVE_CLASS`,
   and no token value is restated in the component.

**Two of the verifier's observations changed the composition rather than fixing
a defect.** It is one continuous object, not six scenes: Movements 3, 4 and 5
now follow the same four rows, so the period that seals is the one the reader
watched being built, and the rows are above the rule when it draws. And what is
recorded is not taken back: the figures and the stamps play once and stay,
while the ledger's row count still follows the scroll in both directions, which
is the only reversal the document asks for.

**Gate.** `npm run gate -- F-2`: 31 assertions, 31 passed, including that the
stamp overshoots and settles, that the hash is not shown before it resolves,
that the composition is under eight screens and that every movement fits a
390px screen at the middle of its own pin.

**Second verification of F-2.** Six of the eight fixes held under probing and
four of the five questions came back clean. Six further failures, all taken,
and one of them was mine twice over:

1. **A bad paste had corrupted the phone stylesheet.** `.seal-layout` had been
   pasted into the `max-width: 720px` block in place of `.register-row`, so
   every ledger row at phone width became two equal columns: the household name
   wrapped, the timestamp fell to a second line and a stamp landed two lines
   away from the row it belonged to. It parsed, so neither lint nor the gate
   saw it. The stylesheet is rewritten, and the gate now asserts a ledger row's
   grid shape at 390px.
2. **The figures had acquired the defect the hash had just lost**: each was
   rendered at its final value and then snapped backwards to count up to it.
   The figure row is now revealed as the count begins, so the reader never sees
   the number before watching it arrive, and the markup still carries the real
   figures for a reader without JavaScript.
3. **`ruleDraw` played entirely below the fold.** The rule reached full width
   while it was 78 pixels below the screen, so the first beat of `sealPeriod` —
   the one the movement is named for — was never seen. It also snapped from
   full width to nothing before drawing, because an undrawn rule was being
   rendered drawn.
4. **The seal showed the rows with their stamps taken off.** Four rows took
   four stamps in Movement 4 and arrived at Movement 5 with the stamp column
   empty, directly beside copy reading "Nothing above the rule is removed."
   The rows keep their stamps, set rather than landing again.
5. **The three later stamps were simultaneous**, all with the same animation
   delay, because `Stamp` had no way to carry the stagger the stylesheet was
   already prepared for. It takes one now.
6. **The followed rows were 4, then 3, then 2 at phone width**, so rows the
   reader watched arrive and be stamped were missing by the time the period
   closed. They are the same four throughout.

**What that exposed about the geometry.** Every threshold in the composition
was firing before its section reached the screen. With progress measured
across a section's whole travel, a movement is already 57 percent played by
the time its top touches the top of the screen, so a pin of a few hundred
pixels had nothing left to play. Progress is now measured across the pin
itself: zero when the composition reaches the top of the screen, one when it
releases. Everything a movement does happens while the reader is looking at it.

That costs height. Six scroll-linked movements that each play while on screen
cannot fit in the 600vh the design document suggests — a scroll-linked
composition needs scroll to happen in, and the arithmetic is unforgiving: a pin
long enough to read is a pin long enough to scroll through. The page is about
nine and a half screens, and every screen of it is a composition playing rather
than a composition waiting. The gate holds it under ten.

**Gate.** `npm run gate -- F-2`: 42 assertions, 42 passed, now including that
no figure is shown before it is counted, that the seal rule is undrawn before
it draws and draws where it can be seen, that the rows which arrive are the
rows that are stamped and sealed, that the stamps land one after another, and
that a ledger row keeps its shape at 390px. Each is measured on its own page,
because a threshold that has been crossed stays crossed.

**Third verification of F-2, and Lydia's own reading of the page.** The
verifier confirmed all six previous fixes by measurement and returned two
failures. Lydia, looking at the running page, independently reported the same
thing in different words: it read as cluttered and hard to follow.

1. **The second and third figures were still shown at full opacity before they
   counted.** One opacity reveal covered all three cells while the tallies
   started 250ms and 500ms apart, so two of the three were legible at their
   final value and then snapped back to zero. Each figure now has its own
   reveal keyed to its own count, and the gate checks all three cells rather
   than the row.
2. **The geometry left a near-blank screen between every pair of movements.**
   Measured at 1280x800: 634 pixels of empty paper between the figures and the
   ledger, 401 between the ledger and the stamps, 523 between the stamps and
   the seal — about 4,000 pixels of the page. Each composition was centred in
   its own full-screen sticky block, so their centres sat a full screen apart
   and the transit between them showed neither.

**The movements tile the page now.** One screen each, each composition centred
in its own screen, progress running across the middle of its travel. There is
no gap between two of them because the next composition is directly behind the
one leaving. The page is 6.6 screens, which is close to the 600vh the design
document asks for, and nothing fires off screen. The pin is gone; what replaces
it is a composition that is always in front of the reader.

**Two execution defects visible in the captures, both fixed.**

- **The naira sign was falling out of the record face on every figure.**
  Courier Prime has no glyph for it, and `next/font`'s own metric-adjusted
  fallback is a proportional face, so every amount in the product broke
  typeface at its first character. The record face now falls back to a
  monospace that carries the glyph, and the adjusted fallback is off.
- **The compositions were stretched across the full 1,340px measure**, so a
  household and its amount sat at opposite ends of the screen. A movement's
  composition reads at a 980px measure.

**Lydia's direction, given the captures:** the design system stands as the
foundation document specifies and the work is to fix execution. The build
continues through F-3, F-4 and F-5.

**Gate.** `npm run gate -- F-2`: 42 assertions, 42 passed.

**Fourth verification of F-2.** Two failures, and the first was the same
defect Lydia had already reported in her own words:

1. **The movements still did not tile.** A sticky block exactly as tall as its
   section has no travel, so nothing pinned at all: each composition simply
   crossed its own screen. Measured at 1280x800, the band between one
   composition and the next ran 457, 212, 237, 371 and 355 pixels — 1,890
   pixels of scroll, about a quarter of the page, with nothing covering the
   middle of the screen. Smaller than before, same defect.
2. **The tally did not finish before its movement left**, at anything above a
   slow scroll: 21,021 against 21,658 at 1,400 pixels a second. A direct
   consequence of the first, because nothing held the reader.

**The page is one stage now.** Six screens of scroll drive a single pinned
stage, and each movement takes that stage in turn: it arrives while the one
before it is still leaving and leaves while the next is already arriving, in
the same place. There is no paper between two movements because there is no
between — there is one stage. Measured across the whole 4,800-pixel track, at
1280 and at 390: zero pixels with nothing covering the middle of the screen.

**A figure is its real value by the time its movement hands over.** The count
plays if there is time for it, and if the reader scrolls faster than the
primitive, the count is stopped and the figure is written at its real value. A
running count is an animation; a figure left part-counted is a wrong number,
and this is an instrument of record.

**One trap worth recording.** Giving the first and last movements the same
four-point fade as the ones in between put a negative offset in the first
movement's input range, and Motion handed that to the browser as a keyframe
offset: `Offsets must be monotonically non-decreasing`, thrown during
hydration, which took down the whole page into the error boundary. The first
movement is already on the stage and the last one stays on it, so each has one
fewer point than the movements between them.

**Gate.** `npm run gate -- F-2`: 45 assertions, 45 passed, now including that
a composition covers the middle of the screen at every point on the track at
both widths, and that a figure is its real value by the time its movement
hands over at 900 and 2,200 pixels a second.

---

## F-3 — The public surfaces

**Built.** The register index, searchable, sortable, filterable and paginated.
The project page: the commitment quoted from the project design document with
its page number and, where a field was corrected, what it originally read and
why; coverage by period as a ruled chart whose bars carry their own figures;
the period table; dispute and signal counts; enrolment as coarse buckets. The
operator page with every project under one operator and its closed periods as
a table as well as a trend. The attestation as a document with crop marks, its
hash, the period it chains to, its Merkle root, its chain position, its anchor
and a signed download. Verification in both modes. The public report. The
participant receipt.

**Independent verification found that F-3 did not pass**, and it was right
about all of it. Seven failures and a set of unreachable states:

1. **The 50KB receipt budget was blown roughly threefold, and the gate that
   certified it was reading zeros.** `bundleUnder` summed `content-length`,
   which a compressed chunked response does not carry, so it measured nothing
   and reported 0.6KB — the figure the commit message quoted. Measured
   properly through Resource Timing, the route was shipping 141.9KB over the
   wire and 464.9KB decoded, because the App Router ships React and the
   framework runtime to every page whatever the page contains.

   The receipt is a route handler now, returning hand-written HTML with its
   styles inlined. Measured: **0 scripts, 0 stylesheet requests, 0 fonts.**
   Everything on it works with JavaScript switched off, because confirming a
   payment is a form post. A confirmed payment carries a stamp as well as a
   timestamp, which it did not before.

2. **Single-transfer verification did not verify anything.** The handler
   compared one leaf against one fixture and never read the proof path, so a
   bundle with a wrong proof, or with no proof at all, came back as a match
   and the page then said "the bundle proves that and nothing else".
   `PROOF_INVALID` and `LEAF_NOT_IN_ROOT` were reachable only by forcing them.
   There is one Merkle implementation now: the fixture issues bundles with it
   and verification folds them with it, so a valid bundle matches, a wrong
   path is `PROOF_INVALID`, and a leaf from another period is
   `LEAF_NOT_IN_ROOT`. The gate tests those from input rather than from a
   forced code.

3. **`/dev/states` reached almost none of the listed states.** It now carries
   an index of every state each screen lists, each line arranging what it needs
   and opening the screen, plus controls for register size, roster size and a
   project's status.

4. **Nine states were unreachable because the fixture had nothing behind
   them.** It now carries a withdrawn project, a suspended one, a second
   project under one operator, an attestation whose anchor has not landed, and
   a corrected period that publishes two records — the one first published and
   the correction that supersedes it, neither rewritten.

5. **A missing record answered 200 behind a skeleton.** The static shell
   flushed before anything was looked up, so `notFound()` could not set a
   status, and without JavaScript the page was a skeleton for ever. Partial
   prerendering is off: a public register that answers 200 for a record that
   does not exist is wrong for a crawler, a monitor and anyone scripting
   against it. `/register/nope`, `/developers/nope` and `/attestation/nope`
   answer 404.

6. **Four states said something untrue.** A country filter that matched
   nothing said no project had ever closed a period; a project with nothing
   enrolled drew a map of 2,208 households; an open period was stamped
   `SEALED` on the operator page; and an attestation whose anchor was pending
   said "the figures are final" while showing none of them. Each is fixed:
   the empty copy distinguishes a filter from an empty register, the map is
   drawn from the project's own enrolment, a period is stamped for what it is,
   and an anchor state is stated above the record rather than instead of it.

7. **A raw contract code was being used as a heading** on the public surfaces
   — `RATE_LIMITED`, `ANCHOR_PENDING`, `CHAIN_DISCONTINUITY`. Every code is
   named for the reader now, in one module.

Also: the voice note on the report was collected and silently discarded while
the page said "it has been recorded", and every report was filed against one
hard-coded project. Both fixed. The signed attestation download did not exist.
The geography endpoint invented enrolment for any identifier, including ones
that do not exist, and published centroids to eleven metres for cells
kilometres wide.

**One thing the verifier found that was not F-3's at all:** `.next-verify`, a
build directory, was committed — 716 files — because `.gitignore` named the
two directories the gate uses and not the pattern. It is `/.next-*/` now and
the files are untracked.

**Gate.** `npm run gate -- F-3`: 45 assertions, 45 passed.

---

## Spec patch 01

Lydia's patch landed mid-F-4. Everything in it is applied.

**Tier 1.** The public masthead is the fourth shell: sticky, 64px, on every
public route including the landing page, and it does not drop on a phone — the
mark stays, Register and Sign in collapse behind one link, Get started stays a
button. Every pinned composition is sized against the screen below it. Sign out
is in all three authenticated shells. `/404` and `/500` are real pages on
paper. The mark is the favicon and the app icon, drawn in SVG, and a static
Open Graph card carries the wordmark and the hero sentence; a shared project
link previews with that project's own coverage figures. Every public route has
its own title and description. The footer is three columns with About, Privacy
and Terms behind it. A print stylesheet drops the chrome, the paper tone and
the ink, keeps the crop marks and prints the hash in full.

**Tier 2.** A pagination component reads every list the contract paginates.
The display conventions are in `lib/record.ts`: money in full with separators
and never abbreviated except on a chart axis, dates as `09 Nov 2026`, times to
the minute except a settlement timestamp which carries seconds because it is
evidence, periods as `Q3 2026`, coverage as two figures with the percentage
secondary, phones masked as `080****4567`, hashes as eight and six, and a real
zero rendered as `0` against an unknown rendered as a dash. Every shell says
who is signed in. The loading convention is skeleton rows at the real row
height and a figure whose value is suppressed rather than zeroed; there is no
spinner in the product.

**Tier 3, as decided.** English only, with every participant-facing string —
the receipt, the SMS templates and the USSD menu — in `lib/copy/participant.ts`
so a second language is a second file. The USSD language step stays in the menu
with one option. There is no language switcher. No inbox: the developer rail
carries outstanding counts in record face and `--ink-dim`, never the accent,
with the mark on a section whose work is blocking the next payment.

**Carried forward.** The roster import format (item 9) is recorded for F-5 and
BE-3: CSV, UTF-8, header row required, columns in any order, extra columns
ignored — `first_name, last_name, date_of_birth, phone, identity_type,
identity_number, account_number, bank_code, community, enrolled_by`, with
`date_of_birth` as `YYYY-MM-DD`, `identity_type` as `BVN` or `NIN`, `bank_code`
as the NIP code, and `enrolled_by` an agent email that already exists on the
project. The failure download is the same file with `error_code` and
`error_message` appended, carrying only the rows that failed. The notification
preferences on `/app/settings` (item 15) are out-of-app email delivery for five
events — a dispute raised, a run finished with terminal failures, funding
received, a period closing in seven days, a reconciliation mismatch — each on
or off, defaulting to on, per user rather than per organisation.

**Manual review needed.** Privacy and Terms carry a heading and one paragraph
each and are waiting on Lydia's text.

---

## F-4 — Role selection, auth and onboarding

**Built.** Role selection as three full-screen paths with no way into bank
operations or platform admin and copy saying plainly that households do not
sign up. Sign-up, sign-in and reset, deliberately clean, never stating which
of the email and the password is wrong. Invitation redemption with identity
verification and device binding, and separate screens for an invitation that
expired, was redeemed or was revoked. The developer's five steps and the
institution's two, with the wizard's state in a cookie so going back keeps what
was entered and somebody who closes the tab lands where they left off. The
commitment step shows the extracted figure beside the sentence and page it came
from, and a correction is logged with its reason while the original stays
readable. Step five renders the project's real public register page at zero.

**Gate.** `npm run gate -- F-4`: 51 assertions, 51 passed.

---

## F-5 — The developer console

**Built.** Every screen the phase lists, inside the left-rail shell, with the
open period and the days to close in record face at the top of the rail on all
of them. Home carries coverage, open shortfall, enrolled, open reports and
flagged enrolments, each with its denominator, and an action list ordered by
what blocks the next payment; a run in flight carries the queue pulse, which is
the only loop. The roster virtualises its rows: the window holds what the
viewport can see and fetches the pages it reaches, so ten thousand households
render without a frame drop, and no screen or code path offers a deletion —
removal is a status change with a reason. Participant, agent, run, funding,
report and attestation screens each state their own states rather than a
generic failure. The run builder shows the commitment arithmetic in full, term
by term, and a shortfall proceeds with the consequence stated in the copy. Run
detail is driven by the stream: events land in a buffer, one animation frame
merges them, and the table patches its own rows, so a dropped connection says
it is reconnecting and loses nothing. Settings carries users and roles, the
five notification preferences, API keys shown once, and webhook endpoints.

**Gate.** `npm run gate -- F-5`: 99 assertions, 99 passed. It includes the
roster at ten thousand rows, the live run at five hundred transfers with the
frame budget measured over the arrival, the stream dropped and resumed with the
table's rows counted either side, the arithmetic read back and checked as
arithmetic rather than as seven labels, and a grep for any code path that
reaches the participant delete endpoint.

**Decisions taken.**

1. **Backend section 4.3 enumerates no endpoint for the console's own
   administration.** F-5 requires users and roles, API keys, webhook endpoints
   and notification preferences, and nothing in the contract carries them, nor
   the state of a roster import that F-5 requires to be partially downloadable.
   Five shapes are named in `lib/api/contract.ts` under "Console settings and
   roster imports" and served at `/api/projects/:id/users`, `/api/users/:id`,
   `/api/projects/:id/api-keys`, `/api/api-keys/:id`,
   `/api/projects/:id/webhook-endpoints`, `/api/webhook-endpoints/:id`,
   `/api/notifications/preferences`, `/api/projects/:id/imports` and
   `/api/imports/:id`. **The backend lane adopts or amends these**; they are the
   only endpoints in the front end that section 4.3 does not already have.
2. **The prompt's `TRANSFER_INVALID_ACCOUNT`, `TRANSFER_DORMANT`,
   `TRANSFER_LIMIT_EXCEEDED`, `TRANSFER_NETWORK_TIMEOUT` and
   `TRANSFER_INSUFFICIENT_FUNDS` are an earlier draft of five codes the
   contract already has.** They are built as `ACCOUNT_NOT_FOUND`,
   `ACCOUNT_DORMANT`, `LIMIT_EXCEEDED`, `TIMEOUT` and `INSUFFICIENT_FUNDS`, each
   with its own heading and remediation, and `TIMEOUT` offers a requery rather
   than a retry because a requery never resends.
3. **The last administrator is refused with `FORBIDDEN` rather than a new
   code.** The contract's forty-seven codes are not added to; the message and
   remediation say what the constraint is.
4. **A code forced from `/dev/states` without a path fragment no longer applies
   to `GET /api/auth/session`.** It knocked out the session every console
   screen is read with, so every forced state rendered as "this account is not
   on a project". A session failure has its own screen at `/signin`; forcing a
   code at the session itself still works by naming it as the fragment.
5. **The console is scoped to the session's project and has no project
   switcher.** `dev_ekuri` runs two projects and nothing in the phase asks for
   switching between them.
6. **Coverage's denominator is read from the roster** rather than from the
   figure on the project, so the roster and the home screen cannot disagree,
   and emptying the roster from `/dev/states` reaches the pre-enrolment state.
7. **The notification events are the five recorded under spec patch 01 item
   15**: a report raised, a run finished with transfers outstanding, funding
   received, a period closing within seven days, and a period that does not
   reconcile. The webhook endpoints offer the same five, so the product has one
   list of events rather than two.

**Found by the verification pass on F-3, fixed here.** The disclosure verifier
accepted the period's own published Merkle root as a leaf with an empty proof
path and answered "match": `foldProof` reduces an empty path to the leaf, and
the root is printed on the public attestation page, so anybody could assemble a
bundle from public data and be told a payment was in the period. An internal
node of the tree could also be presented as a leaf one level up. Both are
closed: leaves and internal nodes are now hashed in separate domains, a
disclosure bundle carries the transfer's own facts and the verifier recomputes
the leaf from them rather than trusting the hash it was handed, a proof whose
length is not the tree's depth is refused, and a bundle naming a root that does
not exist answers `NOT_FOUND` rather than `LEAF_NOT_IN_ROOT`, because nothing
was checked against anything.

**Manual review needed.** The commitment percentage, the declared gross and the
funding amount are entered by an operator in the real product; in the mock they
come from the fixture's run, so the builder reads rather than writes them. The
screens are built for the write; the endpoint that takes it is
`POST /api/projects/:id/runs`, which the contract has.

### F-5 — what the verification found, and what was done about it

Thirty-one findings, all addressed. The gate goes from 99 assertions to 112.
The verifier could not forge a disclosure bundle, which was the first thing it
was asked to attack; the console's own endpoints did not hold, which was the
second.

**Money and identity, the findings that misreported something to a reader.**
The home screen summed every unfinished run's failures, so it read "477
transfers failed" beside a run card reading 233 — a closed, published period
folded into the open one. Failures are now the open period's. An unknown run
identifier fell back to another run's arithmetic and rendered a confident,
fully-worked panel about the wrong money; it answers `NOT_FOUND`. A dispute and
a run belonging to another project rendered inside this console; detail routes
are scoped to the session's project. A household's payment history printed
`REVERSED` and a wallet printed `dormant`; every contract enum a reader sees is
prose now, and the gate asserts no enum reaches a screen. The builder and the
funding screen disagreed about the same period because one figure was per-run
and labelled per-period; the label says what the figure is.

**The console's own endpoints.** Every created API key carried one hardcoded
secret, so "shown once" was a guarantee around a constant. An invited user was
never held, so the duplicate refusal caught only the three seeded addresses and
every created user collided on one identifier. Three list endpoints ignored the
project in their own path and answered for an unknown project with this
project's users. The last-administrator refusal returned `FORBIDDEN`'s generic
copy — "ask an administrator to grant access" — told to the only administrator.
The https check was case-sensitive. The deletes returned success and removed
nothing. Idempotency keys were minted inside the client, so the header was
present and the protection was not; each mutation takes the key its caller
chose.

**The exit-checklist items that failed.** The stream sent a transfer's queued,
in-flight and settled events in one tick, so nothing was ever concurrently in
flight and `queuePulse` — the screen's whole point under load — could never
render. A transfer is in flight for several ticks now and resolves after them,
and the gate asserts both the concurrency and the pulse. `stampLand` was
applied to every settled row for the life of the page and replayed whenever the
virtualised window recycled a row; a stamp lands once. Pre-flight returned
`passed: false` always and the step had no exclusion control, while the next
step offered to execute anyway: each exclusion is now recorded with a reason,
pre-flight passes when none is outstanding, and the confirm step refuses while
any is. The typed client no longer carries a participant delete call at all.

**States that could not be reached, or rendered wrongly.** The "closing within
72 hours" and "period closed" states needed the quarter to end, so a period
carries its own close date and `/api/dev/period` moves it. A report waiting on
the participant was unreachable because responding set "responded" and nothing
else; responding now puts the report with the household, which is who closes
it. A substantiated report existed only on a project this session cannot read,
so there is one here. A reconciliation mismatch collapsed the screen it was
about; it is a fact about the period and is answered with the period. The
correction attestation carried figures identical to the record it superseded
under copy saying it states what changed; it restates coverage and the amount,
says what it changed and why, and its disclosure bundles resolve. A bundle
verifying against a record that has since been corrected says so.

**Display conventions.** The rail printed `2026-Q4`; percentages carried a
decimal; coverage was printed twice in one figure; counts were shown without
denominators; a real zero and an unknown both read as an em dash; plurals were
unguarded ("1 agents", "1 flags", "closes in 1 days"); the pre-flight list
printed each reason twice. All corrected. The roster heading kept the filter's
count as though it were the roster's size, and now states both.

**Still open, recorded rather than fixed.** `formatNairaCompact` has three call
sites, none of them a chart axis label, all in the developer reference screens
under `/dev`. They are excluded from a production build, so no reader reaches
them, but the component reference is where the console was built from and the
abbreviation should not be the example it sets.

---

## F-4 — what the verification found, and what was done about it

**All fourteen are fixed.** The gate grew from 51 assertions to 86, and each
fix is asserted rather than asserted to be done:

1. **The commitment step takes the document now.** A file input, a PDF check,
   `POST /api/projects/:id/pdd`, and the uploaded document named with its
   extraction job on the step afterwards.
2. **Every extracted field is correctable** — share, basis, cadence and
   beneficiary — each through the same `PATCH …/commitment` the contract has.
3. **A correction and its original live in the wizard, not the URL.** Every
   correction keeps the figure it replaced, its reason and when it was made,
   and they are all still on the step after a reload or a week away.
4. **Going back no longer rewinds.** The wizard carries `reached` as well as
   `step`, `reached` never moves backwards, the indicator links every step
   already reached, and resuming lands on the furthest one with a notice
   saying so. The account step keeps both fields through its own refusal.
5. **The missing states are built**: KYB rejected, with the bank's reason and
   the path forward; identity verification pending; an invitation expired,
   already redeemed or revoked, each a fact about the code; verification
   complete and the verification link expired, at `/verify-email`, with a
   resend; the unverified-email resend on sign-in; and "validating" on every
   submit that makes a round trip. `IDENTITY_MISMATCH` is the prompt's name
   for the contract's `BVN_MISMATCH` and now reaches the same screen.
6. **Step five frames the project the wizard created.** Confirming the
   registry record is what creates the project, and its id is what the live
   step reads.
7. **`REGISTRY_UNREACHABLE` has the manual entry it promised**, queued for
   review, with what is queued stated back.
8. **`(auth)` carries `RouteTransition`**, so wizard progress has
   `routeForward` and `routeBack`.
9. **The brand is appended once**, by the root template.
10. **Register, sign in and get started are each their own link at 390px.**
    One link cannot go to two places.
11. **One footer per page.**
12. **All 47 contract codes have words for a reader**, the map is total rather
    than partial so a new code fails the typecheck until it has some, and the
    gate asserts no code reaches a reader on any F-4 surface.
13. **Coverage is a whole number**; periods print through `formatPeriod` on the
    attestation, register, verify and receipt surfaces; a period with none
    closed reads as an unknown rather than as prose; `maskPhone` is used where
    a corrected number was being handed back in full.
14. **`/dev/states` indexes every F-4 and F-5 state**, each reachable by
    clicking.

### What it found, in full

F-4's independent verification ran after F-5 was built, against the production
build. The gate passed 51 of 51 and the verifier still failed the phase, which
is the same shape of result F-3 produced: the gate asserted what the screens
do and not what the screens leave out. Recorded here in full, **outstanding**,
to be fixed in an F-4 remediation pass before F-6.

1. **The commitment step has no PDD upload.** The step starts from an existing
   extraction and there is no file input on it, so `PDD_UNREADABLE` and
   `PDD_NO_COMMITMENT` are notices for an action a reader cannot take.
2. **Only the percentage is editable** on that step. Basis, cadence and
   beneficiary are read-only rows, and the prompt asks for each field editable
   with the correction logged alongside the original.
3. **A correction and its original survive only in a query parameter.**
   Reloading the step loses both the notice and the reason; the corrected
   figure is in the cookie and the original is nowhere on the page.
4. **Back navigation rewinds the saved position.** Re-submitting step one
   writes `step: "verify"` unconditionally, and `Steps` computes "done" from
   position rather than from the saved step, so every later step stops being a
   link. The account step also drops its fields on a validation bounce.
5. **States not built or not reachable:** `KYB_REJECTED`; `IDENTITY_MISMATCH`
   (which is not a contract code — the behaviour is built under `BVN_MISMATCH`
   and the prompt's name should be read as that); an invitation that expired,
   was redeemed or was revoked, because `GET /api/invites/:code` answers
   `valid` for every code; identity verification pending; the verification link
   expired and verification complete, which have no route; validating; and the
   unverified-email resend, which asserts a link was sent and offers no
   control.
6. **Step five frames the wrong project.** Nothing writes the wizard's project
   id, so the live step always falls back to `proj_oban` — the screen whose
   argument is "this is your page" shows somebody else's.
7. **`REGISTRY_UNREACHABLE` promises manual entry that does not exist.**
8. **`(auth)` has no `RouteTransition`,** so the wizards carry neither
   `routeForward` nor `routeBack`, which the phase prompt asks for.
9. **Titles double the brand** on eight `(auth)` pages: "— Attest" against the
   root template's "· Attest".
10. **`/signin` is unreachable from the public masthead at 390px.** One link
    labelled "Register and sign in" goes to `/register` only, which fails the
    patch's own F-2 assertion that all three are reachable from the first
    screen.
11. **Duplicate `<PublicFooter />`** on `/attestation/[id]` and
    `/developers/[developerId]`.
12. **`lib/copy/codes.ts` names 16 of 47 codes, and no F-4 surface calls
    `headingFor`,** so four notices put a raw contract code where the heading
    goes.
13. **`coveragePercent` carries a decimal**; periods print raw on four
    surfaces; `orUnknown`, `maskPhone`, `formatDateTime`, `formatPeriod`'s
    spelled form and both print helpers are defined and never called.
14. **`/dev/states` indexes no F-4 state at all.**

---

## F-6 — The field app

**Built.** An installable PWA at 390px with a service worker and IndexedDB,
where offline is the normal case rather than a degraded one. Today, the
seven-step capture flow, the queue and the agent's own record, each rendering
from a session held on the device: the agent signs in once with a connection
and every screen afterwards opens without one. A submitted enrolment is a
record with no control that would edit it, and it says where a correction
goes instead of looking disabled.

The capture flow enforces three rules and no others. Consent cannot be
bypassed, and a later step opened directly says so and goes back to it. A
duplicate verification number is the one hard block, and the block screen
carries a paragraph written to be read aloud to the household. Everything else
— no location, no photograph, outside the boundary, an identity service that
will not answer — flags the enrolment and lets it proceed, because an agent
standing in front of a household must never be stopped by something they
cannot fix from there. Outside the boundary additionally requires a reason.

Every enrolment is minted on the device with a client UUID, a capture
timestamp and a location, signed with a device key generated once and never
sent anywhere, and written to IndexedDB before anything is attempted over the
network. The queue drains as a batch, idempotent on that UUID, and the server
answers per item, so a batch where one account number is wrong sends the other
forty-nine and names the one to look at. The photograph is compressed on the
device to about sixty kilobytes before it is queued.

**Gate.** `npm run gate -- F-6`: 37 assertions, 37 passed. A full enrolment
captured with the connection switched off, queued and drained on reconnection;
the queue read back after every page of the app is closed and reopened, with
the capture timestamps compared byte for byte; a partial batch failure with
each item's own reason; the duplicate block, the boundary flag and the consent
gate each exercised by typing rather than by forcing a code; every tap target
measured at 390px; and a sweep for the dim ink, which is unreadable on a phone
in sunlight and which this surface therefore does not use at all.

**Decisions taken.**

1. **The field app does not use `Surface`.** It carries the three faces and
   nothing else: no motion provider, no toast stack. The animation library is
   about a hundred kilobytes and this surface is held to a budget on a phone
   on 3G. The motion it does have is the same primitives declared in CSS.
2. **It does not use the typed client either.** `lib/field/api.ts` carries the
   four calls the field app makes. Importing the client would put ninety
   endpoints in the bundle a phone downloads before an agent can enrol
   anybody.
3. **`POST /api/field/identity-check` is not in backend 4.3.** The one hard
   block in the product has to happen while the agent is still in front of the
   household, which means a check at capture rather than at sync. Offline it
   does not answer, and the enrolment is queued with the check outstanding.
   **The backend lane adopts or amends it.**
4. **`GET /api/field/me` carries the project's boundary and the flag
   threshold.** The boundary check happens on the device with no connection,
   so the boundary has to be on the device.
5. **The two colours the platform wants as JavaScript** — the browser chrome's
   theme colour and the installed app's background — are read from
   `app/styles/tokens.css` at build time by `lib/tokens.ts` rather than
   restated as hex literals.
6. **Device storage and the camera are the one place a throw becomes a
   value**, in `lib/field/storage.ts`. A private window, blocked site data or
   a camera that will not decode are the platform refusing rather than an API
   answering, and there is no typed result to switch on. The gate's rule
   against `try`/`catch` excludes that file and nothing else in the field app.

**Manual review needed — the 150KB budget is not met, and cannot be on this
stack.** First load is **172.9KB** transferred on a cold load at 390px. Of
that, **138.9KB is the framework every route in the product pays** — React,
React DOM and the App Router client runtime — and **34.0KB is the field app's
own code**, which is what the gate asserts a budget against. The only way
under 150KB is a different stack for this one surface: the receipt is already
hand-written HTML with no JavaScript at all, and the capture flow could be
built the same way at the cost of writing its state machine by hand. That is
a decision about what this surface is worth, not one to take while Lydia is
away. The figure is measured on every gate run and printed.

---

## F-7 — The verifier portal

**Built.** Six screens in the masthead shell: the watchlist, the project list
with watchlist management, a project in more detail than the public page, a
comparison of two or three projects, an export, and alerts.

The copy rule for this surface is the phase's own and it is a product decision
rather than a styling one: it presents facts and never a verdict. There is no
score, no grade, no badge, no rating, no risk label and no traffic light
anywhere on it, and no colour that means good or bad — the stamps carry record
states only. Where a figure invites a judgement, the screen puts the figure it
should be read against beside it and stops: this period's confirmation rate
sits next to the project's own earlier periods, both stated, neither
interpreted. A signal count is given with what a signal is — a pattern the
bank's monitoring raised about accounts, not a finding about the project.
Agent flag rates are aggregated and never shown against a named person here.

**Gate.** `npm run gate -- F-7`: 64 assertions, 64 passed. Among them: a sweep
for twenty-six verdict words across every screen and every listed state, the
same sweep over the surface's own source, an assertion that no element is a
score or a badge, a check that a refusal carries no verdict either, and a
round trip that exports a disclosure bundle from this surface and posts it to
the public verifier — which recomputes the leaf from the transfer's own facts
and folds it to the period's published root. An export nobody can check is a
file, so the gate checks it.

Also asserted: no household is identifiable at any granularity — participant
identifiers, masked phones, account numbers and coordinates finer than the
published resolution are all searched for on every screen.

**Decisions taken.**

1. **`POST /api/verifier/export` returns the bundle itself for the disclosure
   format**, rather than a link to one. The contract says the endpoint returns
   an export; what makes that export worth anything is that an auditor can
   paste it straight into the public verifier, and a URL behind an
   authenticated session cannot be pasted anywhere.
2. **Comparison is only ever on periods both projects closed.** A figure from
   one period beside a figure from another is a comparison of calendars.
   Projects with no period in common say so and show nothing.
3. **Two or three projects, never more.** One is not a comparison and four is
   a table nobody reads.
4. **An alert's threshold is the reader's own figure.** The screen says so:
   Attest does not have a number it thinks is right, because having one would
   be a rating with extra steps.

### F-6 — what the verification found, and what was done about it

Fourteen findings, three of them severe, all addressed. The gate goes from 37
assertions to 44.

**The offline claim was false in the place it mattered.** The service worker
returned early for anything not under `/field`, and the app's JavaScript lives
at `/_next/static` — so it cached four documents and no application. The app
worked offline exactly as long as the browser's own HTTP cache happened to
hold the chunks, which on the cheap phone this is built for is not long: clear
that cache and the screen reads "Opening" for ever. The worker now caches the
build assets the shell's own documents name, serves a hashed asset from the
cache first, and the gate clears the browser cache, goes offline and asserts
that the app is still alive.

**An install that dropped one request activated anyway**, holding half a
shell, and nothing retried or said so. `addAll` is all-or-nothing now and the
install fails rather than succeeding partially: the old worker stays in charge
and the browser tries again.

**An enrolment stranded mid-sync was stranded for ever.** A force-quit during
a drain left the item marked "syncing", every later drain skipped it, and the
pending count went on promising it would go — worse than losing it. The queue
recovers anything stranded when the app opens, and the gate strands one
deliberately and asserts it sends.

**The identity step told the agent something untrue.** It said only the last
four digits are kept on the phone, and the queue held the full eleven-digit
verification number until the item synced — which, offline, is the whole point
of the queue. The device now writes a hash of the number and its last four,
the copy says exactly that, and the gate reads IndexedDB and asserts the
number is not in it.

**The batch's idempotency was asserted and nowhere implemented.** The mock
accepted the same client UUID twice and issued two enrolment identifiers. It
remembers what it accepted now, and the gate posts the same UUID twice.

Also fixed: every timestamp in the queue's log read `NaN:NaN:NaN`, because the
time was formatted once by the panel and again by the Console; the "syncing
with progress" and "conflict requiring resolution" states did not exist; the
submitted step rendered for anybody who typed its URL; an unopened enrolment
read offline showed the Today screen under its own address, and now says what
it is; `/field/me` stated that a flag rate was above the threshold without
naming the threshold or the arithmetic; "captured today" under-reported by the
size of the queue, so an agent out of signal all morning was told they had
done nothing; the boundary reason's minimum was invisible behind a dead
button; and the step counter read "of 6" for seven steps.

**On the 150KB measurement, the verification was right twice.** First load was
being measured at `networkidle`, which included the tab bar's prefetch of the
other three screens — 17.7KB that arrive after the screen is up. Measured at
`load`, first load is **157.0KB**, of which 138.9KB is the framework and
**18.2KB is the field app's own code**. Still over the budget, and the overage
is the framework. Second, the byte comparison that computes "own code" does
not bind: the moment this surface imports something another route also
imports, the import becomes free. The two decisions that budget exists to
protect — no animation library, no typed client — are structural, so they are
now asserted structurally, by searching the surface's own source.

**Recorded rather than fixed:** the field app is rendered at desktop width as
a phone-width column rather than refused outright. The phase says "never
rendered on desktop"; a hard refusal would make the app unreviewable by the
people who have to review it, and the column is the compromise. **Lydia's
call.**

---

## F-8 — The bank operations console

**Built.** Home, the signals queue, a signal with its account graph, case
management, verification exceptions and reconciliation, in the masthead shell.

The account graph is what the phase is for. Four hundred household wallets
sweeping into three accounts inside forty-eight hours is the signature of a
developer paying itself through households that do not exist, and it cannot be
seen from outside a bank. It is drawn in ink and rules on the sunken surface
with exactly one colour in it — the accounts the money concentrated into —
because that is the thing the drawing is about. The layout is computed once
and deterministically rather than simulated every frame, so the picture holds
still while it is read, and panning writes a transform straight to the group,
so a drag costs one style change and no React render.

Each of the five signal classes says what was seen in its own words: five rows
sharing one sentence would be one row five times, and an operator triaging a
queue needs to tell them apart at a glance. Severity is worded as what it is —
the bank's own order of work — rather than as a label about a project. A case
action states its consequence before the control, carries a note for the case
record, and can be refused by the desk that holds the authority: freezing an
account stops money for real people.

**Gate.** `npm run gate -- F-8`: 44 assertions, 44 passed. The graph drawn and
counted, its spread measured so it is not a single blot, its frames measured
while it is dragged, and the sampled state asserted against what the endpoint
actually did. Every listed state, every class distinct and none of them shown
as a contract name, and a sweep for words about people rather than accounts.

**Decisions taken.**

1. **The graph is a computed layout, not a live simulation.** A force
   simulation over two hundred nodes spends the frame budget on jitter, and an
   operator panning a graph needs it to hold still.
2. **The endpoint samples 400 accounts to 220 and the screen says so**, with
   both figures. The gate asserts the statement matches what the endpoint
   reported rather than asserting a number.
3. **Freeze and escalate are recorded as asked for, not as done.** The
   authorisation is the financial crime desk's, and a console that says
   "frozen" when it has only asked is a console that lies about money.

---

## F-9 — Platform admin, and the sweeps

**Built.** The platform's own surface: what is waiting on it, project
onboarding review, registry sync with its failure log, the extraction review
queue for commitments the model read without confidence, the reports a project
and a household could not settle between them, and a monitor on the
attestation chain.

Two decisions in that last one. The chain monitor reports a break and repairs
nothing: a repaired chain and a rewritten one look the same from outside, and
not being able to rewrite a record is the whole product. And the extraction
queue shows the document's own sentence beside what was read from it, because
a reviewer deciding whether 45% is right needs the sentence, not the figure.

**Five endpoints are not in backend 4.3** — `/api/admin/onboarding`,
`/api/admin/registry`, `/api/admin/extraction`, `/api/admin/chain` and
`/api/admin/escalations`. Named in `lib/api/contract.ts` for the backend lane
to adopt or amend, like the console's and the field app's.

**The sweeps.** F-9's middle five items are sweeps across the whole product
rather than assertions about one screen, and each is executable:

- **Motion.** Every duration a whole frame at 24fps; no animation declared
  outside the primitives; and a walk of all forty-five screens asserting the
  queue pulse is the only infinite loop in the product.
- **States.** The state panel covers every surface and lists 165 states, each
  reachable by clicking rather than by editing a fixture.
- **Copy.** All forty-five screens read for an exclamation mark, an apology, a
  congratulation, or a verdict about a project. The verdict sweep reads the
  sentence rather than the word, so the about page saying the product never
  calls a project compliant is not itself a breach.
- **Accessibility.** axe on seven surfaces, keyboard reachability, focus
  visible on every interactive element, and a check that no state is signalled
  by colour alone — every stamp carries its words.
- **Hardening.** The developer tooling absent from a production build, no
  `NEXT_PUBLIC_` variable carrying a secret, the platform key never read in
  client code, `npm audit`, and the history: every commit Lydia's, no agent
  trailer in any message, nothing the build produced naming one.

**The demo path runs ten times consecutively** in the gate: the register shows
the project, the run's transfers settle live, the period's record is
published, the record states its anchor, and a disclosure bundle exported from
it verifies on the public verifier. It is the one test that must never be
flaky, so it is the one test that runs ten times.

**Waiting on the sandbox**, and recorded rather than quietly skipped:

1. **Deployment to production and staging**, and the check that the deployed
   URL loads on a phone over mobile data rather than on a laptop.
2. **The backend swap**: pointing the typed client at the real base URL,
   importing the shared types package and deleting the local duplicates, then
   walking every screen against the real endpoints. The contract mismatches
   this would find are the reason the rule exists: fix the backend or amend
   section 3 on both sides, never patch around it in the front end.
3. **The demo recording**, driven by Playwright at 1920×1080 with video
   capture so it is reproducible by re-running the script.
4. **`/dev/states` and `/dev/kitchen-sink` returning 404 on the deployed
   host.** The gate asserts it against a production build here; the deployed
   check needs the deployment.

**The nineteen endpoints this lane added that backend 4.3 does not have** are
listed in one place for the backend lane: the console's nine, the field app's
one, the verifier's export shape, the platform admin's five, and the auth
resend. Each is named in `lib/api/contract.ts` with the reason it exists.

---

## F-7 and F-8 — what their verifications found

Both phases went green and both were failed by fresh eyes, which is now the
pattern on every phase that has been verified. The gates grew: F-7 from 64
assertions to 69, F-8 from 44 to 54.

### F-7, the verifier portal

**The copy rule held and the arithmetic did not.** A verdict sweep across
every screen, every state, titles and metadata found nothing; the prose is
doing what the phase asked. Three figures were wrong.

1. **The confirmation rate was rendered a hundred times too small on three
   screens.** The contract returns a fraction, the public page multiplies, and
   the verifier surface did not: 0.72 printed as "1%". Worse than a typo,
   because the comparison then showed one project at "0% confirmed" beside two
   at "1%" — exactly the verdict-by-implication the phase exists to prevent —
   and the "materially below its own history" state could never fire. There is
   one helper for the unit now and every screen uses it.
2. **The watchlist printed the open period's figures under the closed
   period's label.** Ekuri read "Q3 2026 · 1,369 of 2,090 households paid";
   Q3 closed at 1,611 of 1,904. The register row carries the figures for the
   period it names now.
3. **The aggregate agent flag rate was an unweighted mean given a denominator
   it was never computed against** — an agent who enrolled nobody counted the
   same as one who enrolled seven hundred. It is weighted, and stated as
   flagged enrolments of enrolments.

**And four places let a verdict in by colour**: an edge on any project with an
open report, a clay notice for projects that share no period, the strongest
adverse colour for an administrative status, and a flagged stamp on a
correction. A correction is the record working as designed. All four are
neutral now, and the gate walks the surface looking for an adverse colour
rather than only for adverse words.

Also fixed: API keys, which the phase lists and which did not exist; saved
searches, the same; the CSV format, which returned the attestation record
under a `.csv` name and 404ed for three of four projects; an export failure
that discarded the server's reason; loading skeletons at the real height; a
project detail that measured a shortfall against a commitment it never stated;
a dispute basis that published one household's settlement session and exact
amount on a surface whose rule is no household at any granularity; `?ids=`
accepting a project twice and dropping unknown ones silently; a 200 answer for
a project that does not exist; and the `noPii` copy, which claimed a property
of the contract the contract does not have.

### F-8, the bank operations console

**The console asserted things that were not true**, which on a console about
suspected fraud is the whole problem.

1. **A case action claimed an outcome that never happened.** Clicking "Clear"
   showed "Recorded — the case closes as unsubstantiated" while the card above
   it still read "Being investigated": the mock never mutated the case and the
   screen never re-read it. Actions now change the case, the screen re-reads
   it, and the server validates the action and requires the note.
2. **The note the dialog insisted on was discarded.** It is on the case record
   now, and an action without one is refused.
3. **A refused read was rendered as a zero.** With `/api/ops/cases` forbidden,
   the home screen read "Cases open 0 of 0" and "No case is open". It says the
   read was refused and that it does not know what is open.
4. **The reconciliation screen printed a balance it contradicted on the same
   line** — ₦90,010.86 unaccounted for beside a balance of ₦0.00, because the
   subtraction clamped at zero. A balance keeps its sign now and an overspent
   period says so.

**The graph.** It held 60fps while panned, and the colour rule held. But its
money total belonged to neither the sample drawn nor the population named; its
legend called 220 drawn wallets "220 of 400 **paid**"; the timing and amounts
the phase asks for were in the payload and on no screen; tapping an account
did nothing, because the surface captured the pointer; the households were
labelled with participants' names, on a console whose own copy says it does
not describe people; and the same concentration graph was served for every
signal, including a shared-device one whose account count the page printed
beside it. All fixed, and there is a movement log beside the drawing now —
each hop, what it carried, how long after settlement — which is what the
foundation asked for and what makes the drawing evidence rather than a shape.

**Dead states:** "nothing open", a substantiated case, a closed case and a
period awaiting settlement data were all unreachable, and four more were
reached by falsifying the fixture — `?state=attached` rewrote every signal's
case id, putting a Delta case on an Ekuri signal. The fixture carries the
states now, there is a dev control for an empty console, and nothing is
arranged by making the data say something untrue.

**Also:** the ops and admin shells said you were signed in as the carbon
developer; every detail route in the product now carries the back control spec
patch item 12 asks for; raw record identifiers and action codes are no longer
reader-facing text; an unresolved exception reads as unresolved rather than as
unknown; and the plurals hold.