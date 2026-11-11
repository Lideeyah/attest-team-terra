# Responsive layout and workspace access

Reviewed 11 November 2026 on `mark/production`.

## Layout

The product route inventory contains 63 page templates. The final combined browser
checks cover each at 320, 390, 768, 1024, 1440 and 1920 pixels: 378 passing viewport
checks, with no document-level horizontal overflow. Large records and comparison
tables retain their own labelled horizontal scroll regions. The first development
pass timed out on disputes; that page passed the production-build recheck.

- Developer navigation remains a sidebar on desktop and becomes an expandable,
  two-column menu on phones/tablets. Verifier, operations and admin tabs use the
  same compact menu below 900 pixels. Escape closes it and restores button focus;
  following a link closes it. The current section remains in the menu label.
- Project selection wraps into separate select/action rows, long account labels and
  hashes wrap, status badges cannot shrink into adjacent text, and dialogs scroll
  within the viewport. Public phone navigation has an automatically sized header.
- Form controls fit their columns and use readable phone input sizing. Field capture
  expands into two columns on larger screens and retains bottom navigation and
  safe-area space on phones. Brand colours are unchanged.
- Operator profiles without published periods, reconciliation mismatches, and
  read-only field records render their actual available data without crashing.
  Legacy demo-only operations/admin children do not run behind the live workspace.

## Access

Public register, project records, verification, marketing, signup/reset and valid
invitation pages remain public. Private developer, verifier, operations, admin,
field and onboarding pages require a validated session and the appropriate role.
Missing sessions redirect before rendering and preserve the requested destination.
Invalid sessions are rejected by server checks; client API refusals also return an
expired workspace session to login. The API remains independently authorised.

Field records use backend ownership checks and mask account/phone details. Signing
out removes cached field screens and the cached profile, while preserving unsent
encrypted captures. An online session refusal also invalidates the offline shell.
Previously authenticated offline capture remains supported; reconnecting is required
to validate or renew a server session.

## Validation and repeatability

- `node scripts/audit-responsive.mjs`: isolated local browser layout inventory.
  Use activated role fixtures and valid local record examples. The runner refuses
  missing role sessions and explicitly skips examples that have not been prepared.
- `node scripts/check-responsive-navigation.mjs`: phone menu, keyboard/focus,
  desktop navigation, landscape and 320-pixel register checks.
- `node scripts/check-workspace-access.mjs`: signed-out redirects, invalid cookies,
  public access, role isolation and locally prepared field-record ownership checks.
- Frontend unit suite: 22 tests, including expired-session destinations and refusing
  to retry an uncertain mutation. Type checks and changed-code lint passed.

These are viewport/browser checks, not a claim that every physical device or every
future data state has been tested. Local test records are synthetic and separate
from hosted records. Provider and deployment limitations remain in
`integration-status.md` and `vercel-deployment.md`.
