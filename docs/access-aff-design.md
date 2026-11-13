# Access Bank / AFF showcase design

Reference sites reviewed on 13 November 2026:

- https://www.accessbankplc.com/ — orange actions, blue wordmark/navigation, white surfaces and lime accents.
- https://africafintechfoundry.ng/ — Parkinsans interface typography, orange calls to action and warm background accents.

Attest retains its name and identifies the interface as a hackathon showcase. The design does not represent an official Access Bank application or claim endorsement.

## Shared implementation

- Brand orange `#EE7E01`; blue `#173F7A`; deep blue `#102D59`; restrained lime `#A4C519`.
- Dark text on orange actions preserves readability. Payment outcomes retain independent green, amber and red meanings.
- Parkinsans 400–700 is self-hosted. Its SIL Open Font License is included in `public/fonts/Parkinsans-OFL.txt`. Access Bank's proprietary Effra font is not redistributed.
- Shared theme applies to public pages, account/onboarding forms, operator, verifier, bank operations, administration and field surfaces. Record hashes retain a monospace stack.
- Rounded cards, restrained shadows, responsive navigation, clear active states, consistent buttons, inputs, tabs, notices and dialogs.
- Existing route, wizard, modal and drawer transitions are reused; lighter screens use CSS entrance and hover transitions. Reduced-motion preferences are respected, including a hydration-safe preference subscription on the landing page.

## Wallet

The new bank-style wallet card shows the existing bank-confirmed available balance, account number and explicit demo/sandbox label. A Show/Hide control masks the main balance. Quick actions navigate to income, payment rules and funds history. Financial logic and APIs are unchanged; income, obligations, held and processing funds remain separate from the bank balance. Large summary amounts use compact notation with the full amount in their title.

## Verification

- Frontend suite: 25 tests.
- Lint and production TypeScript/build checks.
- Read-only browser audit: 17 pages across public, operator, verifier, operations and administrator surfaces at 320, 390, 768 and 1440 pixels; 68 checks, no horizontal overflow or non-200 page responses.
- Additional map and project onboarding checks at the same four widths.
- Wallet Show/Hide controls checked against the isolated local demo.
- Landing page checked with reduced motion enabled and disabled.

No hosted financial transactions or database changes are required for this design update.
