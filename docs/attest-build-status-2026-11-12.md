# Attest implementation and release status — 12 November 2026

Work branch: `mark/production`. Integrated deployment baseline: `deploy/team05-preserve-bound-pvc-20261112` at `198ff38`. Local changes were preserved before the fast-forward integration; the backup stash remains available.

## Implemented

- Additive financial migration and shared contracts for confirmed incoming receipts, versioned automation policies, exact allocations, journal events, location datasets, saved reviews, durable imports and message attempts.
- Project wallet showing actual queried bank balance separately from recognised income, community obligations, operator allocation, paid/processing/held/outstanding amounts and payment charges. Unavailable balances remain unavailable, rather than zero.
- Duplicate business-credit protection; multiple receipts per reporting period; gross/net review; equal and weighted household allocations; separate community-fund destination; exact kobo rounding; deduction reserves; operator-funded charges.
- Explicit activation, pause and backlog approval. Automatic eligible payouts use durable transfer intents and existing query/recovery safeguards. Household holds retain the original entitlement; verified release records the original and corrected destination. Manual runs cannot bypass an automatic project’s reservations.
- Signed funds events and durable Hedera anchoring jobs, with record verification and separate network status. Reporting aggregates automatic distributions and appends linked corrections.
- Six-step project setup with Back/Continue, saved project progress, point-only KML and coordinate CSV support, polygon handling and explicit source-document review.
- Encrypted original PDFs and imports, automatic saving of extracted terms, editable revision-checked review drafts, before/after audit history and explicit approval of structured household/fund/milestone/reporting terms.
- Community import template, column mapping, preview/confirmation, durable per-row processing, duplicate protection and safe correction reports. Bank-account rechecks/correction and explicit WhatsApp permission.
- Organisation merchant-check submission and honest pending/approved/rejected status from the bank integration. Director identity values are not retained in the resulting verification record. Source-account linking requires recorded ownership/debit-authority evidence and protects existing obligations.
- Device replacement requests and administrator approval, revoking previous sessions while retaining original capture evidence.
- OpenStreetMap payment maps with status legend, filters, layers, clusters for identical coordinates, evidence details, unmapped totals and corresponding tables. Verifier data is coarsened and excludes names/account details.
- Incoming-payment attribution queue; verifier watchlist removal; alert changes/removal with scoped permissions and revision checks; original alert evidence remains retained.
- Responsive screens, reusable loading/empty/error feedback, action locks, confirmation dialogs, green-theme controls and reduced-motion support.

## Validation

- Full backend suite: 107 tests passed, including permission, period-correction and alert-management cases. A further rounding regression check follows below.
- Frontend suite: 25 tests passed. Lint and production builds passed during implementation; final release verification follows below.
- 15 end-to-end API journeys passed across authentication, supplied PDF/KML, field capture, bank runs, receipts/disputes, reports, verifier and operations.
- Four extended product journeys passed: point-only setup and original PDF retention, explicit sample-agreement approval, encrypted community import and automatic weighted household/community-fund payments with reserved deductions.
- Seven integrated browser journeys passed for protected access, duplicate receipts, automatic payouts, mobile wallet, saved drafts, payment maps, verifier privacy and money navigation.
- Layout audit: 408 viewport checks across 68 pages at 320, 390, 768, 1024, 1440 and 1920 px; no overflow or navigation errors. Invitation pages require their own valid one-time token and were excluded from that layout inventory.
- OpenStreetMap tiles loaded at their actual 256 px image dimensions in the browser. This was checked separately from marker rendering.
- Private hosted database backup saved locally with explicit user approval; no backup or deployment credentials are committed.

## Confirmed sandbox limitation

A synthetic receiving-account probe successfully created a virtual account and received NGN 50,000. The same account returned `ACCOUNT_NOT_FOUND` from both the balance and bulk-payout endpoints. Receiving accounts therefore cannot be assumed to fund onward payments in this sandbox. The implementation marks these proceeds held until a supported, independently verified funding path exists. No sweep or wallet cash-out endpoint is invented.

## Remaining readiness and product gaps

1. A supported receiving-account-to-payout funding path is still required to demonstrate the complete real sandbox carbon-proceeds-to-community journey. Automatic allocation/payout acceptance above used isolated, explicitly mocked banking data; it does not prove that unsupported funding path.
2. WhatsApp needs the organisation’s Meta credentials, approved templates, sender and signed callback configuration. SMTP and real SMS delivery also need provider configuration. A queued/sent demonstration is never evidence of real phone delivery.
3. Institution self-service approval/provisioning and administrative dispute adjudication remain limited to existing supported/manual processes. Developer responses cannot resolve complaints without appropriate bank/participant evidence.
4. Operator withdrawals, refunds, post-payout incoming reversals and release of reserved business deductions still need provider-supported, reviewed workflows. Held funds are not represented as freely withdrawable earnings.
5. Large-volume GIS performance, offline basemap availability, dataset replacement/version comparisons and broader assistive-technology testing need further acceptance work. The completed viewport audit measures layout, not every possible business-state combination.
6. A live-money rollout remains separate from this sandbox release. Configure external services, reconcile bank history and approve a single controlled pilot before enabling unattended financial automation on real funds.

## Release update

Pending final verification and deployment. This section is updated only after observed results.
