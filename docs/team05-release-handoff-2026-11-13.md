# Team05 release handoff — 13 November 2026

## Application delivery

Repository branch: `mark/production`. Runtime revision: `ee3223c13a1794e4c1b74e8b3239b0d93223caae`.

Final build/deploy run: https://github.com/Lideeyah/attest-team-terra/actions/runs/43326199420

Backend and frontend packaging succeeded. Migration `005` is applied. The API, frontend and worker pods run the new revision and report Ready. The complete backend suite passed 109 tests, frontend tests passed 25 tests, 15 API journeys and four extended product journeys passed, and all ten browser journeys passed. The layout audit covered 408 viewports across 68 pages without overflow.

The final deployed API also passed a direct authenticated smoke test: demo sign-in, scoped projects, wallet, saved review draft, payment map, funds events and messages. No hosted payment was submitted. The earlier release passed the full frontend-to-API login/workspace smoke check before the final rollout.

## Resolved infrastructure delay

During rollout, the frontend-to-API route returned `ECONNREFUSED` while direct access to the API pod succeeded. Readiness publication/controller or service-data-plane state was suspected; the precise controller cause was not independently confirmed.

**Resolved at final verification:** Kubernetes now reports API, frontend, worker and PostgreSQL 1/1 available. The failed deployment job was retried successfully after normal metadata reconcile requests. Final hosted demo sign-in, scoped project access, wallet readiness, payment map and five money-workspace pages all passed through the frontend-to-API route at approximately 23:33 UTC on 12 November / 00:33 WAT on 13 November. No hosted payments were submitted.

Resources observed during the delayed publication:

| Resource | Observed state |
| --- | --- |
| API pod `api-6d866ccdd9-qzmjf` | Ready=True; IP `10.2.0.206` |
| Frontend pod `frontend-5c7d8788d7-jzp7z` | Ready=True; IP `10.2.0.207` |
| Worker pod `worker-8fb4c448c-x96st` | Ready=True; IP `10.2.1.84` |
| API service | Cluster IP `10.128.9.232`, selector `app=api` |
| Active ReplicaSets | Report ready count zero despite matching Ready pods |
| Deployment templates | Revision `ee3223c`; generation 4 observed |
| Bootstrap pod | Completed successfully; Job completion status was delayed |

API pod owner UID and labels match the active ReplicaSet. No deletion timestamp or custom readiness gate explains the discrepancy. Requests to reconcile were issued through metadata annotations on the existing pods, ReplicaSets and services. Application templates and selectors were preserved. The deployment wait was increased from five to ten minutes, but the workflow still timed out waiting for controller readiness.

The provided deployer account cannot read Endpoints objects. If this recurs, platform administration should inspect controller-manager/ReplicaSet readiness watches, EndpointSlice publication and service routing. The final deploy-job retry and frontend-to-API login smoke check have now succeeded. Existing migration version checks and the bootstrap completion marker make the ordinary deployment path repeatable.

The public hostname `https://team05.xtradot.co` separately redirects visitors to the platform’s Cloudflare Access sign-in. Provider callback access and public-demo access therefore require platform configuration. This is outside Attest’s account-login controls.

## Data protection and activation

`postgres-data` remains Bound to `pvc-6e559930-56f0-4e83-bb8a-053969c8b177`, 5 GiB. A private local database backup was taken with the user’s explicit approval. Backup data, credentials and kubeconfig contents are excluded from Git.

The original bootstrap completion marker remains present. The hosted database has zero active automatic-payment policies. Verified operator approval and a supported funding path are still required before any project begins automatic payouts.

## Product/provider gaps

See `attest-build-status-2026-11-12.md` for the complete implemented scope and remaining work. The confirmed receiving-account debit limitation, messaging configuration, institution/admin flows and withdrawal/refund/deduction-release workflows remain distinct from the infrastructure blocker above.
