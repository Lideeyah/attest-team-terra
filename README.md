# Attest backend

Implementation of Raheem's backend lane, including the participant bank contract and Spec Patch 02. TypeScript, Fastify, PostgreSQL/PostGIS, Auth.js, a durable database job queue, and independently selectable mock/live providers. Production uses Node 24; local checks also ran with the installed Node 23.11.0. See the [consolidated specification alignment](docs/specification-alignment.md) and [completion handover](docs/backend-completion.md) for the API additions, evidence and release boundaries.

Frontend developers: start with the [frontend integration guide](docs/frontend-integration.md) for local setup, browser authentication, onboarding, enrolment, payments, live updates and report downloads. The companion [endpoint reference](docs/frontend-api-reference.md) maps the remaining screens, roles and request/response shapes.

For the supplied `team05.yml`, use `.\forge.cmd get pods` from PowerShell. The project-local client is installed; see [Kubernetes access](docs/kubernetes-access.md) for setup and the current access status.

The repository started with five specification files and no application. The original files are unchanged. This implementation is suitable for local review and integration work; it has not been deployed or certified against the Forge sandbox. See [assignment status](docs/raheem-status.md) for the remaining work and integration boundaries.

## Review without external services

```powershell
npm ci
npm test
node dist/scripts/demo.js
```

The demonstration generates `output/offline-demo.json` and a visibly labelled `output/offline-attestation.pdf`: 500 synthetic households, three bounded mock bulk submissions, a computed attestation, an Ed25519 signature, a Merkle disclosure, and a chain integrity check. Its anchor is explicitly marked `mock`. No real bank, registry, messaging, or ledger calls are made.

To inspect the bank operations console:

```powershell
npm run build
node dist/scripts/preview-ops.js
```

Open `http://localhost:8080/ops`. Use `ops@example.test` and `Synthetic-preview-2026`. This preview binds only to localhost, uses disposable in-memory synthetic data, and refuses production mode. The normal application always requires PostgreSQL.

## Persistent local environment

Install Docker Desktop with WSL integration, or provide an existing PostgreSQL 16+ database with PostGIS. This machine did not have a usable WSL distribution, Docker, kubectl, or PostgreSQL when the implementation was prepared.

1. Set `POSTGRES_PASSWORD` in the terminal environment, then run `docker compose -f deploy/compose.yaml up -d`.
2. Configure the environment variables described in `.env.example`. These files are not loaded automatically: inject variables through the shell, a secret manager, or Node's `--env-file` option. Never write the gateway key into a file.
3. Set `MIGRATION_DATABASE_URL` to the database owner connection. Run `npm run build`, then `node dist/scripts/migrate.js` from the repository root.
4. Have the database owner create a separate LOGIN role, set its password through your database credential workflow, and grant it membership in `attest_app`. Set `DATABASE_URL` to that restricted login. The application must not use the database owner.
5. Set a stable `IDENTITY_PEPPER` of at least 32 random characters, `AUTH_SECRET` of at least 32 random characters, and a stable Ed25519 signing key. The signing key is PKCS8 DER encoded as base64. Keep all three in secrets.
6. Set all five provider variables to `mock` for local development. Run `node dist/scripts/seed.js` once. It prints a generated developer password once and refuses to overwrite an existing seed.
7. Run `npm start` and, in another terminal, `node dist/src/worker.js`.

The migration creates a NOLOGIN permission role called `attest_app`; it does not generate or print database credentials. Attestations and audit entries reject updates and deletes through database triggers, including when a privileged writer attempts them. The application role has SELECT and INSERT on these records, with mutation permissions revoked. SELECT is needed to publish and verify the records.

Redis is provisioned without persistence to fit the platform's single-PV limit. Jobs currently use PostgreSQL directly so a Redis restart cannot lose payment work. Postgres receives the only persistent volume.

## Authentication and integration

`/auth/signin` uses [Auth.js credentials and encrypted JWT sessions](https://authjs.dev/reference/core). The session cookie is HTTP-only and secure in production. Each API request also checks the current database user and agent status. Password resets invalidate both cookie and bearer sessions.

Direct HCS testnet submission uses the official Hedera SDK, persists the signed transaction before submission, reuses its transaction ID after uncertainty, and supports mirror-node message verification. Configure `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY` (DER), and an existing `HEDERA_TOPIC_ID`. See the [Hedera submit-message reference](https://docs.hedera.com/native/consensus/submit-message). An optional configured HCS bridge can also be used. No transaction was submitted during local verification.

The section 5 JSON auth endpoints also support opaque bearer tokens for API clients. Every JSON mutation requires `Idempotency-Key` with 8â€“200 characters, except authenticated inbound callbacks. A replay with the same principal, key, URL, method, and body returns the stored result; a changed request returns 409.

Public signup creates an unverified developer administrator in a new organisation. It cannot grant verifier, bank ops, agent, or platform admin privileges. Verification and reset messages are durable SMTP jobs. Configure `MAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `MAIL_FROM` for TLS-protected delivery. An operator can also issue a token through the approved credential workflow using:

```powershell
node dist/scripts/auth-token.js developer@example.test verify
node dist/scripts/auth-token.js developer@example.test reset
```

Deliver the resulting token through the user's approved channel. The JSON API accepts it at `/api/auth/verify-email` or `/api/auth/reset/confirm`. No debug endpoint exposes these tokens. Operational roles must be provisioned by an authorised database operator; agent identities come from single-use, expiring project invites.

The browser-safe shared wire types are in `packages/contracts` (`@attest/contracts`), re-exported by `src/contracts.ts`. JSON responses use the specification's success/error envelope. Amounts are NGN decimal strings. Lists accept `page` and `per_page` (maximum 100). Run deadlines are computed from the reporting cadence and period; production payments require a platform-linked source account. Staged commitments require a separate reporting cadence. Public readers use a strict allowlist and never receive household names, phones, identity numbers, or coordinates. H3 geography suppresses buckets containing fewer than five households.

Verifier rules evaluate coverage, disputes, late closes and corrections, retaining deduplicated alert events and queueing SMTP delivery. CSV exports escape spreadsheet formula prefixes. PDF downloads embed the signed JSON record; uploaded verification checks the exact cached file hash as well as the record signature.

The bank operations console is `/ops`; the participant receipt page is `/receipt/:token`. The run stream is `/api/runs/:id/stream`, using Auth.js cookies or bearer authentication. It polls durable transfer state, so it works with an API and worker in separate processes. It sends a full current-state snapshot on connection, stable state-event IDs, and a run completion event. Public JSON reads are cached for 15 seconds; authenticated responses and receipt pages are not cached.

## Payment and record behavior

- A run snapshots every enrolled household, including removed households, to preserve the denominator. Preflight exclusions require reasons and remain recorded.
- Consent, identity deduplication, device signatures for field agents, server-side boundary containment, name checks, and enrolment notices precede payment. Raw BVN/NIN values, including echoed bank response fields, are discarded before persistence.
- Preflight reads balances and tariff data, checks daily/single-payment tier limits and duplicate accounts, and records exclusions. Underfunding remains visible; insufficient account balance and uncovered fees require action.
- The executor commits its claim and unique transfer intents before contacting the bank. Unknown outcomes remain claimed and are only requeried. A repeated execute command cannot create another transfer for that run/participant.
- Bank settlement amounts and charges are validated and reconciled before a transfer is marked settled. Receipt confirmation remains a separate record.
- The worker closes due periods automatically. Counts and amounts come from roster snapshots, bank-settled transfers, confirmations, disputes, and signals. Callers cannot supply coverage values.
- Corrections append a new signed record. Late reversals and substantiated cases enqueue corrections; anchoring is separate and retryable. Signature, hash, chain, and disclosure checks work independently of an available anchor.
- Model work runs in queued jobs, pauses during active disbursements, uses an input hash cache and a shared gateway budget, and retains source quotations for human review. Name/dispute model outputs are stored as proposals.

## Tests and release checks

`npm test` compiles the application and runs authorization, Auth.js, concurrency, timeout/requery, 500-household bulk, identity minimization, signed-device enrolment, webhook replay, receipt, Merkle/signature/chain, correction, and extraction tests. Run `npm audit --audit-level=high` before deployment. The current audit has no high/critical findings and eight low-severity transitive advisories in the Hedera SDK elliptic dependency chain. Scoped overrides update gRPC, protobuf and Nodemailer; their offline signing and authentication paths are tested.

Set `TEST_DATABASE_URL` to an isolated migrated PostGIS database to enable the database integration test. It checks actual rejection of attestation updates and duplicate transfer pairs, rolling back its fixture. Without that URL this test is explicitly skipped. The CI workflow provisions PostGIS, runs migrations, and enables it; that workflow has not yet been run remotely.

The production image uses a non-root user, listens on `0.0.0.0:8080`, and exposes `/healthz`. Kubernetes manifests have four pods, three Services, one 5Gi PVC, total requests of 300m CPU and 704Mi RAM, and total limits of 2 CPU and 1888Mi RAM. Service `app` publishes port 80. Replace the registry image placeholders with a versioned image. Provision `postgres-credentials` and `attest-runtime` secrets through your credential workflow; `huawei-gateway` is injected directly from the namespace.

Apply migrations through `004_batches_and_boundaries.sql` before starting this version. Public release also requires database ownership, runtime secrets, image/pull credentials and frontend integration. The supplied `team05.yml` remains private and is used by the project-local wrapper. Cluster access and a small mixed-bank synthetic batch were verified; the temporary diagnostic pod was deleted. No public app was deployed or image pushed. See the [completion handover](docs/backend-completion.md).
