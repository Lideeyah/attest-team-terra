# Phase 0 — foundation

What was built, and what each item has to satisfy before the phase is finished.

## Tokens

- [x] Canvas, surfaces, rules, ink and the bottle tone, in one stylesheet.
- [x] Four status triplets: sealed, flagged, blocked, review.
- [x] Type scale, space scale, cadence, curves and travel, all as tokens.
- [x] No literal hex value, font size, duration or easing outside
      `app/styles/tokens.css`.
- [x] Zero radius everywhere except the radio punch mark.
- [x] No dark mode. `color-scheme: light` is set explicitly.

## Typefaces

- [x] Cabinet Grotesk 800 for display, served by Fontshare.
- [x] Newsreader for editorial, self-hosted by `next/font`.
- [x] Courier Prime for the record face, self-hosted by `next/font`.
- [x] Inter Tight 800 loaded as the display fallback, so a blocked font host
      degrades to a real typeface rather than to a system default.
- [x] Record-face figures are `tabular-nums` everywhere.

## Components

- [x] Button: solid, outline, quiet, small, disabled, 1.5px press travel.
- [x] Stamp: four states, each with a glyph and an uppercase label, rotation
      derived deterministically from the record ID.
- [x] Forms: input, textarea, label, note, error, punch, radio, pick.
- [x] Table: ruled, never striped, right-aligned tabular figures, hover wash,
      active row with a left edge, sortable headers with a caret.
- [x] Figure: eyebrow, value, unit at 0.6em, denominator always present.
- [x] Strip: four variants, paper fill kept, 3px left edge.
- [x] Rule: hairline, contrast, heavy, with an animated draw.
- [x] Hash: truncation, copy affordance, resolve.
- [x] Registered: crop marks for document surfaces.
- [x] Notice: bottle edge by default, three status tones.
- [x] Index-card tabs: the active tab breaks the rule line.
- [x] Console: sunken bed, latency and record counts.
- [x] EmptyState: one line, one action, no illustration.
- [x] Toast: bottom left, four second dwell, dismissible.
- [x] Sheet at 480px and modal at 520px, both closing on escape and scrim
      click unless they hold unsaved input.
- [x] Chart: rules and ink only, hairline gridlines, heavy baseline.
- [x] The mark and its four lockups, drawn by geometry.

## Motion

- [x] Every duration is a whole number of frames at 24fps.
- [x] Two curves only. No spring easing token exists.
- [x] `recordArrive`, `stampLand` (two beats), `ruleDraw`, `sealPeriod`,
      `tallyTo`, `hashResolve`, `routeForward` / `routeBack`, `disclose`,
      `sheetIn`, `pressTravel`, `tick`.
- [x] `queuePulse` is the only loop, and it runs only while a transfer is in
      flight.
- [x] Every stamp keyframe carries the full transform, rotation included.
- [x] Under `prefers-reduced-motion`, animations collapse to 0.001ms and
      elements render at their resting state; `queuePulse` becomes a static
      underline at 0.7 opacity.

## Reference

- [x] `/dev/kitchen-sink` shows every component and every motion primitive at
      its real size with its real states, and is linked from nowhere.
- [x] Sample data is plausible: Nigerian names, a Cross River community, a
      Plan Vivo registry ID, and figures that agree with one another.

## Verification

- [x] `npx tsc --noEmit` clean, strict mode, no `any`.
- [x] `npx eslint .` clean.
- [x] `npx next build` succeeds.

## Not in this phase

Landing page Movements 2 through 6, every application surface, the data model,
auth, and the integrations. The landing page carries Movement 1 only.
