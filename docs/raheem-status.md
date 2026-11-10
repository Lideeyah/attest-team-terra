# Raheem assignment handoff

The completion work is implemented on `raheem/backend-completion`. It covers the assigned product items and backend phases BE-0 through BE-5: migrations and append-only audit, role and query scoping, shared TypeScript contracts, bank and registry adapters, enrolment evidence, net/gross arithmetic, safe payment retries, receipts and notices, signed attestations, extraction review, webhook recovery, carbon period handling, signals and operations APIs.

Validation completed locally: `npm test` passes 48 tests, including real PostgreSQL/PostGIS behavior through PGlite; `npm run build:production` passes and checks the production bundles contain no developer trigger routes; `npm run validate:schema` and `npm audit --audit-level=high` pass. The persistent local app started successfully and returned HTTP 200. Its three synthetic projects contain 500, 30, and 400 households; the first has three computed historical attestations. All demo data is synthetic.

To start the local demo, run `npm install` then `npm run local`. The local PostgreSQL/PostGIS database, mock bank state, generated keys, and local credentials persist under ignored `.local-state/`. The startup prints synthetic login details. `npm test` runs the verification suite.

The completion branch has not yet been pushed at the time this note was written. Deployment remains prepared only.

Live integration still needs the authoritative bank sandbox API guide and successful sandbox probes for exact wallet, tariff, retry, carbon/MRV, webhook, and account-control shapes. Gold Standard project data, a published PDD, and a real boundary export must be supplied/imported with provenance; the provided public registry does not supply a documented public API. Live cluster access remains blocked by the kubeconfig endpoint's untrusted TLS certificate. No live transfer, webhook registration, or deployment was performed. Local mocks and fixtures do not certify those external integrations.

The bank re-seed utility accepts a private, ignored manifest built from the confirmed sandbox contract; it deliberately does not invent endpoint shapes. Yoruba, Hausa, and Igbo message drafts remain disabled until fluent review; English is enabled by default.
