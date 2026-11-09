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
