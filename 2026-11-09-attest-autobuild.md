# Attest — unattended front-end build

One prompt. Paste it once into Claude Code and leave. It builds the whole front-end lane, gates every phase against executable checks rather than its own judgement, and leaves a log and a screenshot contact sheet to review.

9 November 2026 · Lydia Solomon

---

## BEFORE YOU PASTE

Two things, or it will stall ten minutes in while you are out.

1. **Grant permissions up front.** Start Claude Code with permissions pre-accepted for file writes and shell commands in the project directory. An unattended run that stops on an approval prompt has stopped for the night.
2. **Have Node 20 or later and npm available.** The run installs its own dependencies, including Playwright browsers, which takes a few minutes on the first phase.

**What it will and will not finish.** It builds F-0 through F-8 and the parts of F-9 that need no cluster. It does not deploy, does not swap the mock for the real backend, and does not record the demo video, because all three need the sandbox and the probe answers. If the session runs out of context partway it writes its position to `BUILD_STATE.md`, so a fresh session resumes from the next phase rather than starting over. Expect to restart the session at least once on a build this size.

---

## THE PROMPT

```
You are building the Attest front end unattended. Lydia is away and will review the result later,
so there is nobody to ask. Take the most reasonable reading of anything ambiguous, write the
decision into BUILD_LOG.md, and keep going. Never stop to ask a question.

Read these four files in full before writing any code:
- 2026-11-09-attest-foundation.md    design system, motion system, IA, stack, rules
- 2026-11-09-attest-frontend.md      the ten phases F-0 to F-9 you are executing
- 2026-11-09-attest-backend.md       section 4 is the API contract; section 6A is hardening
- 2026-11-09-attest-product-spec.md  domain rules

STANDING RULES. The standing instruction block at the top of the front-end document applies to
every line of code you write. Read it and obey it, in particular: every commit is authored as
Lydia Solomon with no co-author line, no session link and no mention of an AI anywhere in the
repository; no token values outside the token stylesheet; only the motion primitives in foundation
2.5; only the endpoints in backend 4.3; every state built, not just the happy path; real copy, no
placeholders; the platform team key never reaches a browser.

This build is for production scale, not for a demo. Where the phase prompt names a performance
figure, it is a requirement and its gate asserts it. Do not ship a roster that works at 50 rows
and dies at 10,000.

== HOW YOU WORK ==

Step 1. Build the gate harness before any feature code.

Create scripts/gate.ts with a runner invoked as `npm run gate -- <phase>`. It exits 0 on pass and
non-zero on failure, printing each assertion's result. Provide these assertion helpers, which the
per-phase gates compose:

  typecheck()                  tsc --noEmit, zero errors, and zero occurrences of ": any" or "as any"
  grepAbsent(pattern, globs)   fails if the pattern appears; used for hex colours, px durations,
                               cubic-bezier outside the token stylesheet, rounded corners, and the
                               anti-slop list
  durationsAreFrames()         every duration literal in the codebase is a whole multiple of
                               41.667ms, per foundation 2.2
  routeRenders(path)           Playwright: route loads, no console error, no unhandled rejection
  stateRenders(path, code)     Playwright: forces the error code via /dev/states, asserts the
                               screen shows its intended state and not a generic error
  screenshot(path, label)      writes to verification/<phase>/<label>.png
  bundleUnder(path, kb)        asserts the JS shipped on a route is under a budget
  fps(path, action, min)       drives an interaction and asserts no frame exceeds 1000/min ms
  rowsRender(path, n)          renders n rows and asserts no frame drop
  a11y(path)                   axe-core, zero critical violations, and keyboard reachability of
                               every interactive element
  reducedMotion(path)          re-runs with prefers-reduced-motion and asserts elements are at
                               their resting state

Step 2. For each phase F-0 through F-8, in order, do exactly this:

  a. Write that phase's gate first, from its exit checklist, before implementing anything. Every
     checklist line becomes one or more assertions. A checklist line you cannot express as an
     assertion is written into BUILD_LOG.md under "manual review needed" with the reason, and you
     move on; do not silently drop it.
  b. Implement the phase.
  c. Run `npm run gate -- <phase>`. If it fails, fix and re-run. If it still fails after three
     attempts on the same assertion, record the assertion, the error and what you tried in
     BUILD_LOG.md, and continue only if the next phase does not depend on what failed. If it does
     depend on it, stop the run and write STOPPED at the top of BUILD_LOG.md with the reason.
  d. Spawn a fresh verification subagent. Give it only: the phase prompt from the front-end
     document, the phase's exit checklist, and the instruction to verify independently and report
     every failure it finds. Do not give it your implementation notes or your reasoning. It has not
     seen the work being produced, so it has nothing to defend. Fix anything it finds, re-run the
     gate, and repeat until it reports clean or has reported the same finding twice.
  e. Screenshot every route the phase built, in every state its prompt lists, into
     verification/<phase>/.
  f. Commit. One commit per phase, message describing what was built, no trailers.
  g. Append to BUILD_LOG.md: phase, what was built, gate result per assertion, what the verifier
     found, decisions you took on ambiguity, and anything needing Lydia's judgement.
  h. Update BUILD_STATE.md to record the phase as complete and name the next phase. Keep this file
     to a few lines; it is what a fresh session reads to resume.

Step 3. After F-8, do the parts of F-9 that need no cluster: platform admin screens, the motion
audit, the state sweep, the copy sweep and the accessibility pass. Skip deployment, the backend
swap and the demo video, and say in BUILD_LOG.md that they are waiting on the sandbox.

Step 4. Build verification/index.html: a contact sheet of every screenshot, grouped by phase and
labelled by route and state, with the gate result beside each phase. Style it with the project's
own tokens. This is the first thing Lydia opens, so make it genuinely scannable rather than a wall
of images.

Step 5. Write a final summary at the top of BUILD_LOG.md: phases completed, phases stopped and why,
every decision taken on her behalf, every manual-review item, and the three things most worth her
attention.

== PHASE-SPECIFIC GATES THAT MATTER MOST ==

Do not let these pass on a weak assertion.

F-0  Kitchen sink renders every component in every variant. Every primitive replays and collapses
     under reduced motion. grepAbsent for hex, px durations, cubic-bezier outside the token file.
     grepAbsent for border-radius other than the radio punch. durationsAreFrames. A rotated stamp
     animates with its centring and rotation intact, asserted by comparing its bounding box before
     and after.
F-1  Every error code in backend 4.2 is forceable from /dev/states, asserted by iterating the enum
     and checking each one returns that code. The SSE mock emits every event type including
     transfer.reversed. /dev routes are excluded from a production build, asserted by building with
     the production flag and checking they 404.
F-2  fps on the full landing scroll at 60. All six movements resolve forward and backward.
     reducedMotion renders six intelligible stills. Renders at 390, 768, 1280 and 1920 with every
     movement present.
F-3  bundleUnder('/receipt/:token', 50) with no web font requested on that route. No household
     coordinate is obtainable from any public route, asserted against the geography endpoint
     response as well as the rendered map.
F-4  Every rejection and expiry path reachable. Wizard resumes from a saved position. Back
     navigation preserves entered data, asserted by filling, navigating back, and reading the
     fields.
F-5  rowsRender('/app/roster', 10000). fps on the live run screen with 500 concurrent transfers at
     60. SSE reconnects after a forced drop without losing table state. No delete control exists
     for a participant, asserted by grepping the rendered DOM and the client code.
F-6  A full enrolment completes with the network offline, queues, and syncs on reconnection,
     asserted by toggling Playwright's offline mode. The queue survives a context close and reopen.
     bundleUnder('/field', 150).
F-7  grepAbsent for score, grade, badge, rating and risk-label text across the verifier surface.
F-8  The 400-node account graph renders and fps stays at 60 while panning.

== WHAT TO DO ABOUT THE HERO SENTENCE ==

Movement 1 of the landing page holds one sentence. Lydia has not chosen it. Use "The money is
promised, sometimes paid, and never provable." as the placeholder, and list it in BUILD_LOG.md
under manual review as her decision to make. Do not invent a different one.

Begin with Step 1. Do not ask anything. Work until F-9's cluster-free portion is complete or until
a dependency failure stops you.
```

---

## WHEN YOU COME BACK

Open `verification/index.html` first. It is the contact sheet of every screen in every state, with
each phase's gate result beside it.

Then read the summary at the top of `BUILD_LOG.md`, which names the decisions taken on your behalf
and the items flagged for your judgement.

`BUILD_STATE.md` tells you where it got to. If it stopped early, paste the orchestration prompt into
a fresh session and it resumes from the next phase.
