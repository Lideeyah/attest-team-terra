# Attest — spec patch 01

Additions to the existing documents. Hand this to Claude Code alongside them; it does not replace anything, it slots in by section reference.

10 November 2026 · Lydia Solomon

**How these were found.** The specs were checked for internal consistency between phases and never walked as a visitor. Everything below is what a walk found: things a judge, a developer or a household meets in the first minute and the specs did not mention. Items are ordered by when somebody hits them, not by effort.

---

## TIER 1 — VISIBLE TO A JUDGE OR IN A SHARED LINK

### 1. Public masthead `[F-0 component, F-2 and F-3 consume it]`

The fourth navigation shell. Every public route carries it, the landing page included, and it is sticky through the whole scroll.

Mark and wordmark left. Three items right: Register as `.btn-quiet`, Sign in as `.btn-quiet`, Get started as `.btn`. Sixty-four pixels tall, `--surface-elevated`, `--rule-heavy` base.

**It does not drop on mobile.** SLATE drops masthead navigation below 720px and Attest cannot, because the landing page is roughly nine and a half screens of scroll-linked composition and a reader three screens down must still be one tap from the register. At phone width it keeps the mark, collapses Register and Sign in behind a single text link, and keeps Get started as the button.

Navigation lives in the chrome and the argument lives in the composition. Movement 1 stays still and carries no buttons. Size every pinned composition against the viewport minus 64px.

**Gate change, F-2:** the assertion "exactly one accent element besides the h1 and the mark" becomes **two**, the masthead's Get started and Movement 6's call to action. They are the same action in two layers. Left unchanged the gate fails the correct design.

**New F-2 assertions:** the masthead is reachable and usable from every scroll position at 390px and 1280px; Register, Sign in and Get started are all reachable from the first screen without scrolling.

### 2. Sign out `[all three authenticated shells]`

Specified nowhere. A `.btn-quiet` at the foot of the developer left rail, in the masthead on the verifier and ops shells, and on `/field/me` in the field app. Signing out returns to `/` and clears the session.

### 3. Error and not-found routes `[F-3]`

```
/404   route not found
/500   something broke
```

Both on `--canvas-paper` with the public masthead, one declarative line in `h2.display`, one `.btn-quiet` back to the register. No illustration, no apology copy, no exclamation mark. A judge who mistypes a URL currently gets a framework default page.

### 4. Favicon, app icon and social card `[F-0 and F-3]`

The register is a public page people will paste into Slack and email. Right now that produces a blank preview.

- Favicon as the mark drawn in SVG per foundation 1.4, plus a 32px PNG fallback and a 256px apple-touch-icon.
- An Open Graph image at 1200x630: `--canvas-paper` ground, the wordmark, the one-line hero sentence in `h1.display` at a size that survives a thumbnail, a `--rule-heavy` line. Generated as a static asset, not rendered per request.
- `og:title`, `og:description`, `og:image`, `twitter:card` set on every public route, with the project name and its coverage figures on a project page so a shared project link previews with real numbers.

### 5. Page titles and meta per route `[F-3]`

Every public route gets a real `<title>` and description. A project page is `<project name> · Attest`, the register is `Register · Attest`, an attestation is `<project> <period> attestation · Attest`. Not "Create Next App".

### 6. Footer `[F-2 and F-3]`

F-2 says "a footer" and never says what is in it. Ruled, `--surface-elevated`, three columns at desktop and stacked at phone: the mark and one line of what Attest is; links to Register, Verify, Report a problem; links to About, Privacy, Terms and a contact address.

```
/about     what Attest is and who runs it
/privacy   how participant data is handled
/terms     terms of use
```

Write About from the product spec's own language. Leave Privacy and Terms as single-screen pages carrying a heading and a short placeholder paragraph each, and list both in `BUILD_LOG.md` as content Lydia supplies.

### 7. Print stylesheet `[F-3]`

The attestation is a document with crop marks and people will print it or save it as PDF from the browser. Without a print stylesheet it prints with the masthead, the footer and a dark ground.

`@media print` on `/attestation/[id]`, `/register/[projectId]` and `/receipt/[token]`: masthead and footer hidden, `--canvas-paper` dropped to white, ink to black, crop marks retained, the hash and anchor reference printed in full rather than truncated, and a footer line carrying the URL and the date printed.

---

## TIER 2 — BLOCKS A DEVELOPER MID-BUILD

### 8. Pagination component `[F-0, used F-3 and F-5]`

The contract paginates with `page`, `per_page` and a `meta` block and no component exists for it. Ruled, record face, `← Previous · Page 3 of altogether 18 · Next →` with the per-page selector at 20, 50 and 100. Disabled states lose their press travel and drop to 34 percent, per the button rules.

### 9. Roster import file format `[F-5 and BE-3]`

F-5 says an import can partially fail and the failed rows are downloadable, and nothing says what a row is. Both lanes would guess differently.

CSV, UTF-8, header row required, columns in any order, extra columns ignored:

```
first_name, last_name, date_of_birth, phone, identity_type, identity_number,
account_number, bank_code, community, enrolled_by
```

`date_of_birth` as `YYYY-MM-DD`. `identity_type` as `BVN` or `NIN`. `bank_code` as the NIP code. `enrolled_by` as an agent email, which must already exist on the project.

The failure download is the same file plus two appended columns, `error_code` and `error_message`, carrying only the rows that failed, so the operator fixes and re-uploads the same shape.

### 10. Display formatting conventions `[F-0, applies everywhere]`

None of these were specified and every screen needs them.

**Money.** `₦48,200.00` with thousands separators and two decimals, record face, tabular, right-aligned. Never abbreviated to `₦48.2k` anywhere a figure is being audited. The one exception is a chart axis label.

**Dates.** `09 Nov 2026` in record face. With a time, `09 Nov 2026 · 19:45` and nothing finer than the minute except on a transfer record, where the settlement timestamp carries seconds because it is evidence.

**Periods.** `Q3 2026`, or `Jul–Sep 2026` where the quarter is ambiguous.

**Coverage.** Always the two figures with the percentage secondary and smaller: `1,284 of 2,090` then `61%`. Percentages to the nearest whole number everywhere; a figure that needs a decimal to be interesting is not a coverage figure.

**Phone.** Masked as `080****4567` in every list. Full only on a participant record.

**Hashes.** First eight and last six with an ellipsis between, record face, with a copy affordance. Full value on the attestation page and in print.

**Empty and zero.** A real zero renders as `0`. An unknown renders as an em-width dash in `--ink-dim`. They are different facts and must look different.

### 11. Account and organisation indicator `[F-0 shells]`

No shell says who you are signed in as. At the foot of the developer left rail, above sign out: the organisation name in `.eyebrow` and the user's email in `record-s`/`--ink-dim`. Same in the verifier and ops mastheads, right-aligned before the sign-out control.

### 12. Back affordance in detail views `[F-5, F-7, F-8]`

`routeBack` exists as motion and nothing says what triggers it. Every detail route and every sheet carries a `.btn-quiet` back control top-left of the content column, labelled with the destination rather than "Back": `← Roster`, `← Runs`, `← Signals`.

### 13. Loading convention `[F-0]`

F-0 asks for "a global loading convention" without defining it. Define it: a table loads as ruled skeleton rows at the real row height, never a spinner. A figure loads as its label with the value suppressed, never a zero. A whole screen loads as its shell with the content column skeletoned. There is no spinner anywhere in the product except the in-flight `queuePulse`, which is not a spinner.

---

## TIER 3 — DECISIONS FOR LYDIA, NOT DEFECTS

### 14. Language on the participant surfaces

The USSD menu is specified as language-selectable and the web receipt page is English-only, which was never a stated decision. Households are the least literate audience the product has and the receipt page is the one screen they see.

Options: English only for the build, with the language switch specified but unimplemented; or English plus Hausa, Yoruba and Igbo on `/receipt/[token]` and the SMS templates only, which is where it matters and is a bounded amount of copy.

This is a product call and it is worth making deliberately rather than by default, because "we pay households and send them a receipt they cannot read" is a question a judge might ask.

### 15. Notification surface in the developer console

Disputes and flags appear as figures on `/app` home and there is no inbox. For a quarterly-cadence product that is probably correct and the home action list is enough. Recorded so the absence is a choice.

---

## WHAT THIS MEANS FOR THE RUN IN PROGRESS

Items 1, 2, 8, 10, 11 and 13 are F-0 components, and F-0 is closed. They are back-edits to a finished phase rather than new work in a later one, so F-0's gate re-runs after they land.

Items 3, 4, 5, 6 and 7 belong to F-3, which is next.

Item 9 is needed by both lanes before the roster import is built, in F-5 and BE-3.

Items 14 and 15 go in `BUILD_LOG.md` under manual review and block nothing.
