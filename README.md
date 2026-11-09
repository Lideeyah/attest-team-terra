# Attest

A settlement record for the money carbon projects promise communities.

Attest moves carbon revenue to households through the bank and emits a record
of what was paid, what was not, and against which commitment. Coverage is
computed from transfers that cleared the bank; no field in the product lets
anyone type a coverage figure.

## Running it

```
npm run dev
```

The application runs at `http://localhost:3000`.

| Route | What it is |
|---|---|
| `/` | The landing page. Movement 1 only at this phase. |
| `/dev/kitchen-sink` | Component and motion reference. Unlinked. |

## Layout

```
app/styles/tokens.css       every colour, size, duration, easing and travel
app/styles/base.css         reset, type roles, measure, the mark
app/styles/components.css   buttons, stamps, forms, table, strips, overlays
app/styles/motion.css       keyframes, applied primitives, reduced motion
lib/motion.ts               the motion primitives as Motion variants
lib/record.ts               deterministic formatting and stamp rotation
lib/sample.ts               reference data for the kitchen sink
components/                 one file per component in the design system
```

Tokens live in `app/styles/tokens.css` and nowhere else. A literal hex value,
font size, duration or easing anywhere else in the codebase is a defect.

## Stack

Next.js App Router, TypeScript in strict mode, Tailwind consuming the token
stylesheet, and Motion for the scroll-linked landing page and the motion
primitives.

## Documents

- `2026-11-09-attest-foundation.md` — design system, motion, information
  architecture, stack. Authoritative on anything visual.
- `2026-11-09-attest-product-spec.md` — objects, flow, fraud controls, record.
  Authoritative on any domain rule.
