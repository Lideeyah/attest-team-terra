# Attest — foundational document

Design system, motion system, information architecture, front-end flow, stack, and the rules that govern every build prompt.

9 November 2026 · Lydia Solomon

**Lineage.** This system is a sibling of the SLATE design system v1.0, not a new invention. SLATE's structure carries over whole: warm paper stock, one ink, hairline rules, three typefaces with fixed roles, status carried by muted editorial stamps rather than saturated alerts, zero radius, mechanical motion on a 24fps cadence, no dark mode. What changes is the anchor tone, which moves from Studio Cordovan to deep bottle green, and the assignment of the status triplets, which changes for one specific reason set out in 1.2.

**How this document relates to the others.** This file is authoritative for everything visual, structural and front-end. `2026-11-09-attest-product-spec.md` is authoritative for domain rules: the objects, the flow, the fraud controls, the record. `2026-11-09-attest-build-prompts.md` is the sequenced instruction set that executes against both. On a domain rule the product spec wins. On anything visual this file wins.

---

## 0. RULES FOR THE BUILDING AGENT

Read this section before writing any code, and again before each commit.

### 0.1 Attribution

**Every commit and every push is authored as Lydia Solomon and nobody else.**

- No `Co-Authored-By` line of any kind.
- No "Generated with Claude Code", no session link, no robot emoji, no trailer of any sort.
- No mention of Claude, an AI assistant or an agent in a commit message, a PR description, a code comment, a README, a changelog or a file header.
- Commit messages describe the change in plain imperative English and stop there.
- The sole contributor on this repository is Lydia Solomon.

### 0.2 Build discipline

- **Finish one phase completely before beginning the next.** Each phase ends with a checklist and every item must pass. Do not scaffold ahead.
- **Never restate a token inside a component.** Tokens live in one stylesheet. A literal hex value, font size, duration or easing anywhere else is a defect.
- **Build every state the phase lists.** A screen without its empty, loading, partial, error and edge states is not delivered.
- **No placeholder copy.** No lorem ipsum, no "TODO: copy". Write the real sentence. Where you cannot know it, write the most plausible real sentence and collect every one of them in a single list at the end of the phase.
- **No sample data that reads as sample data.** No John Doe, no Project Alpha, no example.com. Plausible Nigerian names, real community and local government names, figures consistent with the product spec's evidence.

### 0.3 The anti-slop list

None of the following appears anywhere, on any screen, at any time, for any reason:

Pulsing, breathing or glowing logos. Gradient meshes. Animated blobs or organic shapes. Glassmorphism. Neon or glow effects. Particle fields. Parallax starfields. Springs. Bounces that are not the stamp's own keyframed overshoot. Infinite looping animation anywhere except the single named exception in 2.6. Typewriter effects on headlines. Cards that lift on hover. Drop shadows used for decoration rather than a modal's single elevation. Emoji anywhere in the product surface. Any rounded corner on any element except the radio punch mark. Gradient text. Gradient fills. Full-bleed photography behind text. Blur. Dark mode. Any animation that draws attention to itself rather than to what changed.

If a decision would make the product look impressive in a screenshot, it is probably wrong. This product should look like a document somebody would accept as evidence.

---

## 1. DESIGN SYSTEM

### 1.1 Principles

**An instrument of record, not a dashboard.** Attest is read beside a registry page and a bank statement. The system is built from the materials of that desk: warm paper stock, a single ink, hairline rules, and status carried by muted stamps rather than saturated alerts.

**One ink, one accent.** Bottle green is the only brand colour. Everything else is paper, rule or ink. Status triplets sit outside the brand palette because they encode meaning rather than identity.

**Hierarchy is typographic.** Three faces with fixed roles carry the structure. Weight and spacing do the work that borders and fills would do elsewhere.

**Density is earned.** Information earns space on screen and ornament never does. Evidence collapses behind a disclosure so the record leads. A judge reading twelve periods at once needs to see twelve periods at once.

**Mechanical, not springy.** Motion follows a 24fps shutter cadence and controls have physical travel. Nothing floats or glows.

**Single theme by intent.** Attest commits to the warm paper world and has no dark mode. Every colour is set explicitly rather than inherited.

### 1.2 Colour

Four roles: the paper you print on, the rules you print with, the ink you read, and the single accent. Status triplets are functional and separate.

**Canvas and surfaces**

| Token | Hex | Use |
|---|---|---|
| `--canvas-paper` | `#F7F4EB` | The page ground. Warm alabaster. |
| `--surface-elevated` | `#EFECE1` | Raised panels: the left rail, the period indicator, notices, card headers. |
| `--surface-sunken` | `#E7E3D5` | Recessed beds: the account graph, the signals console, the sync queue, inactive tabs. |
| `--surface-reading` | `#FDFCFA` | Reading surfaces: tables, inputs, the attestation sheet, the receipt page. |

**Rules**

| Token | Hex | Use |
|---|---|---|
| `--rule-hairline` | `#D8D4C5` | Default 1px division. The printed grid. |
| `--rule-contrast` | `#BAAEA2` | Input borders, registration brackets, drop targets. |
| `--rule-heavy` | `#181816` | Structural division only: masthead base, table head, tab rail, period seal. |

The heavy rule is full ink, not a mid-tone. A heavier line means a bigger idea, the way it does in a printed report.

**Ink**

| Token | Hex | Use |
|---|---|---|
| `--ink-primary` | `#181816` | Body text, figures, marks. Never pure black. |
| `--ink-muted` | `#5C5A55` | Secondary prose, metadata, descriptions. |
| `--ink-dim` | `#8C887E` | Form labels, timestamps, eyebrows, line numbers. |

**Bottle green, the anchor tone**

| Token | Hex | Use |
|---|---|---|
| `--bottle-deep` | `#1E3A2E` | h1 and h2 display, solid buttons, the mark. The brand colour. |
| `--bottle-mid` | `#2C5342` | Hover states, active tabs, emphasised links. |
| `--bottle-muted` | `#5A7D6B` | Faint category tags, focus rings. |
| `--bottle-wash` | `rgba(30, 58, 46, 0.05)` | Selected row and card fill. Five percent only. |

`--bottle-deep` on `--canvas-paper` is approximately 11:1, so it is safe as display text at any size.

**Where the accent is allowed.** Page title, primary action, the mark, the active tab, the selected row wash. Nothing else. Not a chart series, not an h3, not a background band, not an icon. On a typical screen it appears three times.

**Status stamps, functional colour**

Each state is a triplet: ink for the text, wash for the fill, border for the edge. They are muted on purpose. A record marks a problem with a stamp, not a siren. Tokens follow `--stamp-{state}-ink`, `--stamp-{state}-wash`, `--stamp-{state}-border`.

| State | Ink | Wash | Border | Meaning |
|---|---|---|---|---|
| `sealed` | `#181816` | `#EFECE1` | `#BAAEA2` | SETTLED, CONFIRMED, CLOSED, ANCHORED. The fact happened. |
| `flagged` (clay) | `#7A5038` | `#F2EBE4` | `#CDAE9A` | Attention required. Shortfall, out-of-boundary enrolment, unconfirmed settlement. |
| `blocked` (rust) | `#8C3A2E` | `#F4E7E3` | `#CFA096` | Failed terminal, duplicate identity, substantiated dispute. |
| `review` (slate blue) | `#3D4A5C` | `#EAECF0` | `#B2BAC6` | Under review. Signals, open cases, open disputes. Neither cleared nor condemned. |

**Why `sealed` is ink and not green, which is the one real departure from SLATE.** SLATE's pass state is archival sage, a green that sits outside its cordovan brand palette and therefore reads as meaning rather than identity. In Attest the accent is itself green, so a green confirmation stamp would read as the brand and the accent would stop meaning action. The confirmed state is therefore carried in ink with a stamp and a timestamp, and the product has no success colour at all.

That constraint turns out to be the better design. A page where ninety-four percent of rows are green reads as decoration. A page of plain ink records with four rust marks reads as an audit, and the audit is what Attest sells.

**`review` as a fourth state** is Attest's analogue of SLATE's telemetry violet, and it gives the bank operations console a register of its own. A signal under investigation is not a warning and not a block. It is a thing being looked at, and the product must be able to say so without implying a verdict.

**No colour-only signalling anywhere.** Every `flagged`, `blocked` and `review` state carries a glyph and an uppercase text label, because the deck will be projected and judges may be colour-blind.

### 1.3 Typography

Three faces, three fixed roles. A face never borrows another's job.

| Role | Token | Family | Source |
|---|---|---|---|
| Display | `--font-display` | Cabinet Grotesk 800 | Fontshare |
| Editorial | `--font-editorial` | Newsreader | Google Fonts |
| Record | `--font-record` | Courier Prime | Google Fonts |

```css
--font-display:   "Cabinet Grotesk", "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-editorial: "Newsreader", Georgia, "Times New Roman", serif;
--font-record:    "Courier Prime", "Courier New", ui-monospace, monospace;
```

Every face declares a real fallback stack, so a blocked font host degrades to a system face rather than to an invisible page.

**Display (Cabinet Grotesk 800).** Wordmark, masthead, headlines, step indicators, button labels. Always weight 800, always tight tracking. Never used for running text.

**Editorial (Newsreader).** Commitment quotations, dispute text, verdict-free rationale, and all running prose. Optical sizing on. Italic reserved for quoted source excerpts from a project design document.

**Record (Courier Prime).** Every amount, figure, timestamp, hash, session ID, coverage percentage, count, table header, form label, stamp and eyebrow. The working typeface of the product, and the reason it reads as a document rather than an app.

Record-face figures are always `font-variant-numeric: tabular-nums`, so a column never jitters during a tally.

**Scale**

| Role | Face | Size | Weight | Tracking | Leading |
|---|---|---|---|---|---|
| `h1.display` | Display | `clamp(2.6rem, 5.2vw, 4.1rem)` | 800 | -0.03em | 1.02 |
| `h2.display` | Display | `clamp(1.7rem, 3vw, 2.4rem)` | 800 | -0.03em | 1.02 |
| `h3.display` | Display | 1.22rem | 800 | -0.02em | 1.02 |
| `.lede` | Editorial | 1.125rem | 400 | normal | 1.62 |
| `body` | Editorial | 16px | 400 | normal | 1.55 |
| `.eyebrow` | Record | 10.5px | 400 | 0.16em | 1.55 |
| `.stamp` | Record | 10.5px | 700 | 0.13em | 1 |
| `.btn` | Display | 13px | 800 | 0.01em | 1 |
| `.console` | Record | 11px | 400 | normal | 1.72 |
| `.figure` | Record | `clamp(1.6rem, 3vw, 2.4rem)` | 400 | normal | 1 |
| `.record-cell` | Record | 12px | 400 | normal | 1.6 |

Uppercase labels always carry letter spacing. Running text stays near 65 characters wide.

**h1 and h2 are set in `--bottle-deep`. Everything from h3 down is ink.** This follows SLATE, where the anchor tone carries the masthead level and establishes identity, and it keeps the accent scarce below that.

### 1.4 The Mark

Drawn by geometry, never by an image file, so it stays sharp at any size. SLATE's mark is a square with the lower right corner struck off, a slate seen flat. Attest's mark is derived from its own central motion, `sealPeriod`: a square bisected by a struck rule, solid below the line and outlined above it. A record sealed below the line.

```css
.mark {
  width: 17px; height: 17px;
  border: 1.5px solid var(--bottle-deep);
  background: linear-gradient(
    to bottom,
    transparent 0, transparent 62%,
    var(--bottle-deep) 62%, var(--bottle-deep) 100%
  );
}
```

As geometry, for a square of side s with the seal at `y = 0.62s`: outline the full square, fill the band from `0.62s` to `s`, and strike a 1.5px rule along `y = 0.62s` edge to edge.

**Lockups**

| Lockup | Composition |
|---|---|
| Horizontal | Mark, then wordmark. Mark height equals cap height. Gap is 0.42 times the mark width. |
| Stacked | Mark above wordmark, centred. Gap is 0.19 times the mark width. |
| Icon only | The mark alone. Favicons, app tiles. |
| Wordmark only | Cabinet Grotesk 800, 0.02em tracking, bottle on paper. |

**Rules of use.** Keep clear space of one mark width on every side. Render in bottle on paper, or paper on bottle. Set the wordmark in Cabinet Grotesk 800 at 0.02em tracking. Let the mark sit on the wordmark's cap height, not its baseline.

Do not rotate, outline or shadow the mark. Do not recolour it to a status ink, because those carry meaning. Do not place it on a photograph or a busy field. Do not move the seal line from 62 percent.

### 1.5 Space and rhythm

One measure, one gutter, vertical rhythm set by the section. Spacing is laid out with grid and flex gaps so margins never collapse or double.

| Token | Value | Applies to |
|---|---|---|
| `--measure` | 1340px | Maximum content width across the application. |
| `--gutter` | 40px, 20px below 720px | Horizontal page padding inside the measure. |
| `.section` | 76px block, 48px below 720px | Major vertical division. |
| `.section-tight` | 46px block | Secondary division inside a workspace view. |
| `.stack` | 14px gap | Default vertical rhythm between siblings. |
| `.stack-lg` | 28px gap | Rhythm between grouped blocks. |
| Grid gap | 1px on a hairline ground | Card grids, so divisions read as printed rules. |

The 1px grid gap on a hairline ground is the detail that makes a grid of cards read as a ruled table rather than a set of tiles. Use it.

**Landing page rhythm is looser.** Movements are separated by 152px block, twice `.section`, because that page has to breathe in a way a workspace does not.

**Breakpoints.** 1180px and 1080px collapse two-column layouts to one. 900px collapses the left rail to a top bar. 720px tightens the gutter and stacks figures.

**Radius. Zero, everywhere.** No element in Attest has a rounded corner except the radio punch mark, which is a circle by function.

**Elevation.** There is no shadow scale. Separation is a hairline rule and a surface change. A modal receives a scrim of `rgba(24, 24, 22, 0.32)` and nothing else.

### 1.6 Components

Build these once in Phase 0 and use them everywhere.

**Buttons.** Square corners, no radius. Press travel is 1.5px downward on `:active`, the throw of a physical key. Disabled drops to 34 percent opacity and loses the travel. Padding 13px 24px, or 8px 15px small. Hover moves fill to `--bottle-mid`.

| Variant | Fill | Border | Use |
|---|---|---|---|
| `.btn` | `--bottle-deep` | `--bottle-deep` | Primary action, one per view. |
| `.btn-outline` | transparent | `--rule-contrast` | Secondary action. |
| `.btn-quiet` | transparent | none | Tertiary, navigation, sign out. |
| `.btn-sm` | inherits | inherits | Dense contexts: table rows, context bars. |

**Status stamps.** Always uppercase, always record face at 10.5px and 0.13em tracking, 5px 11px padding, 1px border. A stamp states the fact and nothing else; the detail lives in the prose beneath it. Rotation between -2 and 2 degrees, derived deterministically from the record ID so a stamp never changes angle between renders.

Classes: `.stamp-sealed`, `.stamp-flagged`, `.stamp-blocked`, `.stamp-review`.

**Forms**

| Component | Behaviour |
|---|---|
| `.input` | `--surface-reading` fill, `--rule-contrast` border. Focus swaps the border to bottle and adds an inset 1px ring. Record face at 14px. |
| `.punch` | A square punch box, 16px, 1px carbon border. Checked fills bottle with a paper tick. |
| `.radio` | The one circle in the system. |
| `.pick` | Tactile selector card with a radio punch. Selected takes a bottle border and the five percent wash. Used for role selection. |

Labels are always record face, 10.5px, 0.13em tracking, uppercase, `--ink-dim`.

**Table.** Ruled, never striped. Header row in record face, `--ink-dim`, bottom border `--rule-heavy`. Body rows separated by `--rule-hairline`. Figures right-aligned and tabular. Row hover takes `--bottle-wash`. Active row takes `--bottle-wash` and a 2px `--bottle-deep` left edge. Sortable headers carry a small caret.

**Figure.** A large number in record face with an eyebrow label above. The unit sits inside at 0.6em. Carries every count, amount and percentage on every dashboard. Always paired with its denominator: 1,284 of 2,090, never 61 percent alone.

**Strip.** A row with a 3px left edge carrying its state, keeping its paper fill so a table of thirty rows still scans as a table rather than a stack of alerts. Classes `.strip-flagged`, `.strip-blocked`, `.strip-review`, or no modifier for neutral. This is how the roster and the run detail table carry exceptions.

**Rule.** A horizontal line with `hairline`, `contrast` and `heavy` variants and an `animated` prop that triggers `ruleDraw`.

**Hash.** A truncated hash in record face with a copy affordance and a `resolve` prop that triggers `hashResolve`.

**Registered.** Printer's crop marks at opposite corners, 9px, `--rule-contrast`. Goes on document surfaces and downloadable artifacts: the attestation sheet, the disclosure bundle, the receipt. Never on an interactive control.

**Notice.** A 3px left edge in bottle, or in a status ink with its matching wash.

**Index-card tabs.** The active tab joins the panel below it by breaking the rule line, the way a physical divider sits proud of the cards behind it. Inactive tabs sit on `--surface-sunken`. Used for period tabs and dashboard sections.

**Console.** A sunken bed, record face at 11px with 1.72 leading. Used for the account graph's event log, the sync queue and the signals stream. Latency and record counts always shown.

**EmptyState.** A hairline-bordered container, one line stating what is not here yet in editorial face and `--ink-muted`, and one action if there is a real one. No illustration, no emoji, no exclamation mark.

**Toast.** Bottom left, `--surface-reading`, hairline border, editorial at 14px, four second dwell, dismissible. Never used for anything the user must read.

**Sheet and Modal.** A sheet enters from the right at 480px for detail views. A modal centres at 520px for decisions. Both close on escape and on scrim click unless they hold unsaved input.

**Chart.** Rules and ink only. A coverage series is a bar chart in `--ink-primary` with `--rule-hairline` gridlines and a `--rule-heavy` baseline. Nothing accented, nothing gradient-filled. Axis labels in record face.

### 1.7 Voice

Attest addresses somebody doing due diligence, not a consumer. It states facts in the vocabulary of the registry and the settlement system, and it never offers a verdict.

**Write this way.** Name the constraint and the arithmetic: "Commitment requires ₦48.2m. You are funding ₦31.4m. Shortfall ₦16.8m, recorded in this period's attestation." Use the sector's terms: vintage, issuance, methodology, enrolled, settled, coverage, period, attestation. State what the user must do, with the deadline attached. Cite the source and show the excerpt.

**Never write this way.** No apologies, no "oops", no exclamation marks anywhere. No vague severity: say the shortfall figure, not "a potential issue". No congratulation, because paying people is the job and not an achievement. No verdict about any project, ever, in any copy on any surface: not good, not compliant, not strong, not trustworthy, not high-risk. Attest publishes facts and the reader forms the judgment. No emoji anywhere in the product surface.

---

## 2. MOTION SYSTEM

### 2.1 The one idea

**Motion expresses irreversibility.** Records arrive and stack. Stamps land and the ink sets. Rules draw across and seal what sits above them. Nothing fades away, springs or loops, because nothing in this product can be taken back.

If an animation does not say "this just became permanent", it should not exist.

### 2.2 Cadence

The system is cut on a 24fps film cadence. One frame is 41.667ms, and every duration is a whole number of frames. This is why the motion feels mechanical rather than digital, and it is worth saying out loud in a pitch.

| Token | Frames | Value | Use |
|---|---|---|---|
| `--t-press` | 3 | 125ms | Button travel, punch fill, hover. |
| `--t-base` | 5 | 208ms | Component entrance, disclosure, contrast step. |
| `--t-screen` | 7 | 292ms | Route transition, sheet entrance. |
| `--t-stamp` | 8 | 333ms | Stamp impact. |
| `--t-draw` | 8 | 333ms | Rule drawing. |
| `--t-ink` | 8 | 333ms | Ink setting after impact. |
| `--t-resolve` | 14 | 583ms | Hash resolving. |
| `--t-tally` | 22 | 917ms | Figure counting. |
| `--t-pulse` | 34 | 1417ms | The one permitted loop. |

### 2.3 Curves

Two curves, both mechanical. The system models a shutter and a key press, so transitions decelerate hard and settle without a tail. Nothing uses a spring easing.

```css
--ease-shutter:    cubic-bezier(0.05, 0.7, 0.1, 1.0);
--ease-mechanical: cubic-bezier(0.2, 0.0, 0.0, 1.0);
```

`--ease-shutter` for content arriving: rows, stamps, panels, figures, route entrances. Fast out of the gate, long settle.

`--ease-mechanical` for direct manipulation and for drawing: button travel, punch fill, rule draw, hash resolve, route exits. Immediate, decisive, no tail.

**Overshoot lives in keyframes, never in a curve.** This is how SLATE achieves a stamp that lands with weight while keeping only two mechanical curves in the system, and it is why there is no spring easing token to reach for.

### 2.4 Travel

```css
--d-nudge: 8px;    /* micro feedback */
--d-row:   12px;   /* row arrival */
--d-step:  24px;   /* route transition */
--d-press: 1.5px;  /* button travel on :active */
```

Travel distances are deliberately short. Long travel reads as a phone app. Short travel with a long settle reads as weight.

### 2.5 Named primitives

Build each once in Phase 0 as a reusable variant. Never hand-roll an animation a primitive covers.

**`recordArrive`** — a row entering a list. `y: +12px → 0`, `opacity: 0 → 1`, shutter, `--t-base`. Stagger children by one frame, 42ms. This is how a disbursement run feels like money accruing rather than a table loading.

**`stampLand`** — the signature animation, and the most important one in the product. Two beats.

Beat one, impact: `scale: 1.28 → 0.97 → 1`, `opacity: 0 → 1`, shutter, `--t-stamp`. The overshoot is in the keyframes.

Beat two, ink setting: immediately after, `opacity: 0.82 → 1`, mechanical, `--t-ink`.

The second beat is what makes it read as ink drying rather than a UI element appearing, and it is Attest's one addition to SLATE's motion vocabulary. SLATE's stamp delivers a verdict and is finished. Attest's stamp records something permanent, so it has to settle.

**Carry the full transform in the keyframes.** The stamp is rotated and centred, so a keyframe that sets `transform: scale()` alone will silently clobber the rotation and the element will render off position. Every stamp keyframe writes `transform: translate(-50%, -50%) rotate(Xdeg) scale(Y)` in full, at every step.

**`ruleDraw`** — `scaleX: 0 → 1`, `transform-origin: left`, mechanical, `--t-draw`.

**`sealPeriod`** — the composite that closes a period. `ruleDraw` the heavy seal line, then step the contrast of everything above it down one level over `--t-base` on shutter: `--ink-primary` becomes `--ink-muted`, hairline rules lighten, the block recedes without moving and without disappearing. Nothing is ever removed and the motion says so.

**`tallyTo`** — a figure counting to its value, shutter, `--t-tally`, tabular figures so the width never shifts. Runs once on first entry into view, never on re-render.

**`hashResolve`** — a hash resolving from scramble to final value, character by character, left to right, mechanical, `--t-resolve`, record face. The one mildly technical effect in the system, and it is earned because a hash genuinely is a thing that computes. Used when an attestation anchors, and on the landing page. Nowhere else.

**`routeForward` / `routeBack`** — shared-axis screen transition. Outgoing: `x: 0 → -24px`, `opacity: 1 → 0.6`, mechanical, `--t-screen`. Incoming: `x: +24px → 0`, `opacity: 0 → 1`, shutter, `--t-screen`, starting at frame 2 of the outgoing. `routeBack` mirrors the axis. Deeper moves forward, back reverses.

This is the answer to the transition brief. A crossfade is too soft and reads as cheap. A full-width slide reads as a phone app. Short-travel shared axis with a long settle reads as premium, and the two-frame overlap is what stops it feeling like a cut.

**`disclose`** — accordion, detail panel, expanding row. Height auto, shutter, `--t-base`, content fading in over the final two frames. This is how evidence collapses behind the record.

**`sheetIn`** — `x: +100% → 0`, shutter, `--t-screen`, scrim fading over `--t-base`.

**`pressTravel`** — `y: 0 → 1.5px` on `:active`, mechanical, `--t-press`.

**`tick`** — console lines entering the sunken bed, `opacity: 0 → 1`, mechanical, `--t-press`, staggered one frame. Used in the signals stream and the sync queue.

### 2.6 The one permitted loop

**`queuePulse`** — a 2px `--bottle-deep` underline on a row whose transfer is in flight. `opacity: 0.3 → 1 → 0.3`, shutter, `--t-pulse`, looping. It exists only while the transfer is genuinely in flight and it stops the instant the row settles, at which point `stampLand` fires.

This is the only loop in the product. It is permitted because in-flight state must be visible and a spinner would be a lie about what is happening. Every other loop is banned.

### 2.7 Reduced motion

Under `prefers-reduced-motion: reduce`, every animation collapses to `0.001ms` and every element renders at its resting state. Stamps appear already set. The period renders already sealed. `queuePulse` becomes a static `--bottle-deep` underline at 0.7 opacity.

The landing page is the one exception that needs design rather than collapse: it renders as six static compositions that still read as a sequence.

### 2.8 The motion graphic: the landing page

This is the motion graphic execution the organisers asked for, and it is not an ornament. The page builds a record while the viewer scrolls, so by the time a judge reaches the call to action they have watched the mechanism happen.

It is one continuous object through six movements, **scroll-linked and never autoplay**, because a viewer controlling it reads as confident while a looping hero reads as a screensaver.

**Movement 1, Stillness.** One sentence in `h1.display`, bottle on paper, with a single `--rule-heavy` line beneath it and nothing else on screen. It rises in once over `--t-base` and then does nothing at all. No scroll indicator, no animated arrow, no video. Confidence is stillness.

**Movement 2, The problem as a figure.** Scroll-linked. Three figures tally with `tallyTo`: enrolled, paid, coverage. Figures large in record face, prose small beside them, source attributed in an eyebrow beneath. The number does the talking.

**Movement 3, The ledger builds.** Scroll-linked `recordArrive` on successive rows, each a household, an amount and a timestamp. Scroll position drives the row count, so scrolling up removes rows and scrolling down adds them. The viewer is scrolling money into existence.

**Movement 4, The stamp lands.** `stampLand` on one row, then three more, staggered. The ink sets. This is the frame worth screenshotting.

**Movement 5, The period seals.** `sealPeriod`. The heavy rule draws across and everything above steps back one contrast level without moving and without disappearing. Copy beside it states what just became impossible.

**Movement 6, The record goes public.** `hashResolve` on the attestation hash, then the sealed block appears as one row on a register beside other projects, carrying `Registered` crop marks. The call to action sits beneath it, the only button on the page.

Scroll-linked progress uses Motion's `useScroll` with per-movement offsets. Each movement pins briefly, resolves and releases. Total page height is roughly 600vh. Transform and opacity only, no layout-triggering properties in any scroll handler.

---

## 3. INFORMATION ARCHITECTURE

### 3.1 Route map

```
/                                  landing
/register                          public register index
/register/[projectId]              public project page
/developers/[developerId]          public developer page
/attestation/[attestationId]       single immutable record
/verify                            period + single-transfer verification
/report                            public dispute intake
/receipt/[token]                   participant receipt (no auth)

/get-started                       role selection
/signup/developer                  developer sign-up
/signup/institution                institution sign-up
/invite/[code]                     agent invite redemption
/signin                            sign in
/signin/reset                      password reset

/onboarding/developer/*            5-step developer wizard
/onboarding/institution/*          2-step institution wizard

/app                               developer console home
/app/roster                        roster index
/app/roster/[participantId]        participant detail
/app/agents                        agent index
/app/agents/[agentId]              agent detail
/app/runs                          runs index
/app/runs/new                      new run (multi-step)
/app/runs/[runId]                  run detail, live
/app/funding                       funding + reconciliation
/app/disputes                      dispute queue
/app/disputes/[disputeId]          dispute detail
/app/attestations                  closed periods
/app/settings/*                    users, notifications, API keys

/field                             field app home (PWA)
/field/enrol                       enrolment capture flow
/field/queue                       sync queue
/field/enrolment/[id]              enrolment detail (read-only)
/field/me                          agent's own record

/verifier                          verifier portal home
/verifier/projects                 project list + watchlist
/verifier/projects/[projectId]     project detail (deep)
/verifier/compare                  developer comparison
/verifier/export                   export
/verifier/alerts                   alert configuration

/ops                               bank operations home
/ops/signals                       signals queue
/ops/signals/[signalId]            signal detail + account graph
/ops/cases                         case management
/ops/exceptions                    verification exceptions
/ops/reconciliation                settlement reconciliation

/admin/*                           platform admin
/dev/kitchen-sink                  component and motion reference, unlinked
```

### 3.2 Role selection, and who can self-serve

`/get-started` presents three paths and nothing else, as `.pick` cards. The choice is consequential so it gets a full screen rather than a dropdown.

| Path | Who | Leads to |
|---|---|---|
| I run a carbon project | Project developers | `/signup/developer` then the five-step wizard |
| I assess or buy from carbon projects | Buyers, auditors, registries, lenders, investors | `/signup/institution` then the two-step wizard |
| I was invited | Field agents | `/invite/[code]` |

Bank operations and platform admin are provisioned, never self-served, and do not appear here. Households never sign up at all; they are enrolled by an agent and reach the product only through SMS, USSD and `/receipt/[token]`.

### 3.3 Developer onboarding, five steps

1. **Project.** Registry ID. The first field is the project, not the company, because a project that does not exist in a registry has nothing to attest.
2. **Verify.** The pulled registry record shown back for confirmation: name, country, methodology, boundary, issuance history.
3. **Commitment.** PDD upload, extraction, and the extracted commitment shown with its source sentence in editorial italic and its page number, each field editable with the correction logged.
4. **Account.** KYB and disbursement account creation.
5. **Live.** The project's public register page as it now looks to the public, at zero enrolled and zero paid.

Step 5 is not a confirmation screen. It is the real public page, shown to them, at zero. Starting there sets the terms of the whole relationship.

### 3.4 Institution onboarding, two steps

1. **Organisation.** Name, type, what they assess.
2. **Watchlist.** Projects to follow, with the register searchable inline.

### 3.5 Navigation shells

**Developer console.** Left rail at 240px on `--surface-elevated` with a `--rule-hairline` right border. Sections: Home, Roster, Agents, Runs, Funding, Disputes, Attestations, Settings. A persistent period indicator at the top of the rail showing the current period and days to close, in record face. The rail does not collapse above 900px; this is a desktop product for the people who use it daily.

**Field app.** Bottom tab bar, four items: Today, Enrol, Queue, Me. Persistent offline indicator and pending-sync count. Built mobile-first at 390px and never rendered on desktop.

**Verifier portal and bank ops.** Masthead with a `--rule-heavy` base and a horizontal section nav on index-card tabs, because these are read-oriented and want full width for tables.

---

## 4. STACK

TypeScript throughout. Where a choice was open it is made here so the agent does not re-litigate it.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js, App Router | Server components give the public register fast first paint, and that page is the shop window |
| Language | TypeScript, strict | `any` is a defect |
| Styling | One stylesheet of tokens, consumed through Tailwind | Tokens in one place, enforced rather than remembered |
| Motion | Motion (formerly Framer Motion) | The scroll-linked landing page needs `useScroll`; variants give the primitives a home |
| Data | PostgreSQL with PostGIS | Boundary containment is a query, not hand-rolled geometry |
| ORM | Prisma, raw SQL for PostGIS predicates | |
| Queue | BullMQ on Redis | Disbursement batches need durable retry |
| Maps | MapLibre GL | No access token to manage during a live demo |
| Charts | Hand-built SVG | The chart spec is rules and ink; a library fights that |
| Auth | Auth.js, role-based session | |
| Banking | Access Bank Wallet-as-a-Service | Accounts, verification, tiering, NIP transfers |
| Extraction | Huawei LLM access | PDD to structured commitment with source spans |
| Anchoring | Hedera Consensus Service | One message per period close carrying the attestation hash |
| Tests | Vitest, Playwright for the demo path | The demo path runs on stage, so it gets an end-to-end test |

One Next.js application with route groups per surface, one API layer, one worker process. A monorepo is unnecessary.

---

## 5. OPEN ITEMS FOR LYDIA

Settled by the SLATE design system: the record face is Courier Prime, the serif is Newsreader, display is Cabinet Grotesk 800, radius is zero, and the surface, rule and status-triplet structures are inherited whole.

Four things still to decide. Nothing in the build is blocked on any of them before Phase 1.

### 5.1 The hero sentence

The landing page holds one sentence in Movement 1. It is the most important string in the product. Four proposals, none applied; the build carries the product spec's one-liner as a placeholder until one is chosen.

**One.** The money is promised, sometimes paid, and never provable.

Rhythmic, and every clause is defensible: promised by Plan Vivo's sixty percent, Acorn's eighty and Kenya's twenty-five; sometimes paid, from the Farm Africa figures; never provable, from the cash finding. Opening on the problem works structurally, because Movement 2 lands the figures two seconds later and Movement 6 reveals the product.

**Two.** Carbon revenue reaches households in cash, which is why nobody can prove it arrived.

States the mechanism rather than the condition. Defensible on the CGAP finding.

**Three.** A settlement record for every naira a carbon project promised a community.

Product-first and the most confident, though it trades away the tension. The naira localises it for a bank room and narrows it for a global market.

**Four, recorded and not recommended.** Carbon markets run on claims about money nobody can trace.

The sharpest of the four, and the reason to leave it out: a buyer sitting in the room reads it as an accusation. It makes the audience the problem instead of establishing that the problem exists.

### 5.2 The mark

Section 1.4 proposes a square bisected by a struck seal line, solid below and outlined above, derived from `sealPeriod` and drawn by geometry rather than an image file. Approve it, change the proportion, or replace it.

### 5.3 The `review` state

Section 1.2 adds a fourth status triplet in muted slate blue, Attest's analogue of SLATE's telemetry violet, for signals and open cases. A signal under investigation is neither a warning nor a block, and the bank operations console has no register for that without it. Confirm before Phase 0 builds it.

### 5.4 Domain

`attest.ng` is assumed throughout. Confirm or replace.

---

## 6. HOW THIS DOCUMENT CHANGES

Corrections and additions are made in place, in this document. There is no change log, no revision appendix and no second file. If a decision here turns out to be wrong, the wrong version is replaced rather than recorded, so there is only ever one answer to any question in it.
