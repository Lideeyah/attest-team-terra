# Hosted demonstration

The `mc-johnsons-projects` Vercel team hosts two projects:

- Frontend: https://attest-mc-johnsons-projects.vercel.app
- API: https://attest-api-mc-johnsons-projects.vercel.app
- Database: Neon `attest-db`, Frankfurt, free plan, PostgreSQL with PostGIS.

This is a synthetic walkthrough environment. Bank, messaging, registry adapter,
extraction and anchoring providers are mocked. Email delivery requires SMTP and is
unavailable here. The developer login is `local@example.test`; the hosted password
is generated separately from the local password and kept out of Git. Other role
emails are listed in `run-integrated.md`.

The hosted seed contains three projects: 60 demonstration households and three signed
historical records, 30 clean households with a draft run, and 60 households with
concentration investigation signals. Each has three agents and synthetic geometry.
The larger local fixtures remain separate. Seeding is an explicit administrative
script, never a public HTTP endpoint.

## Runtime

The frontend proxies API/authentication/receipt traffic to the API, and server renders
through the API origin while forwarding the user's cookie. Browser cookies remain
same-origin and HttpOnly. Database, authentication, identity, signing, evidence and
worker secrets are configured as encrypted Vercel environment variables. The API
database role inherits `attest_app`; migration-owner credentials are not deployed.

The API exports a cached Fastify instance through a Node 24 Vercel Function. Encrypted
evidence is stored in PostgreSQL. Simulated bank state is persisted under a PostgreSQL
transaction lock, including accepted requests that return a simulated timeout.
Streaming connections end after 25 seconds and the browser reconnects.

Authenticated API activity schedules durable worker processing with Vercel
`waitUntil`. A transaction lock and 15-second debounce coordinate concurrent instances.
A secret-protected daily cron also processes jobs. This free-tier demonstration
does not provide continuous five-second processing while nobody is using it.
Production payments need an independently scheduled worker or more frequent scheduling,
real providers, monitoring and capacity testing. Uploads are limited to 4 MiB in the
frontend to leave room below Vercel's request envelope limit.

## Deploy updates

Use the root Vercel project link for the frontend, and the `backend/` project link
for the API. Deploy production from `mark/production` with Vercel CLI in each directory.
Both projects pin Node 24. Their stable domains follow future production deployments.
GitHub auto-deployment is not connected: the Vercel account needs repository access
to `Lideeyah/attest-team-terra` before that connection can be enabled.

Do not upload `.local-state`, `.env` files, generated keys, or local database files.
Both deployment ignore files exclude these. Keep the provisioned Neon database when
redeploying; function memory is disposable.

## Verified on 2026-11-11

Both production deployments are ready and public health/login checks succeed.
`node scripts/check-hosted.mjs` passed 10 hosted checks: anonymous denial, two role
logins, scoped project collection, synthetic publication, PostGIS/private-map access,
public H3 suppression, authenticated dashboard/map/roster rendering, signed PDF
verification, the untouched clean draft, and SSE through the frontend proxy. The
runner does not execute payments. The backend suite passed 73 tests, including
persistence/idempotency across separate simulated-bank instances. Backend and frontend
type checks passed. Cloud builds caught and resolved missing native PDF parser files.

The Git identity is configured with the user's confirmed address,
`mcjohnson144@outlook.com`, for new commits. Earlier shared commits were not rewritten.
