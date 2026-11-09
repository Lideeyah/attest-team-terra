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
