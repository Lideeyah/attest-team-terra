# Team05 Kubernetes deployment

Public origin: `https://team05.xtradot.co`. The platform ingress connects to the ClusterIP Service named `app`, port **80**, targeting the frontend on port 3000. Next.js forwards API, authentication, receipt, and Forge callback traffic to the internal `api:8080` Service. The worker and PostgreSQL/PostGIS are separate workloads in the same namespace.

## Reproducible release

Pushing `main` runs `.github/workflows/deploy-team05.yml` on a Linux Node 24 runner. It builds the production backend and standalone frontend and publishes private, versioned release assets tagged `team05-<commit>`. No secrets are part of the bundles. The deployment uses official Node 24 containers with an init container that downloads the pinned bundle and verifies its SHA-256 before extraction. This avoids requiring Docker on the operator's computer or a separately provisioned private container registry.

Prepare a non-secret release JSON file with `commit`, `FRONTEND_ASSET_URL`, `FRONTEND_SHA256`, `BACKEND_ASSET_URL`, and `BACKEND_SHA256`. Asset URLs use GitHub's repository release-assets API. Render the namespace-scoped resources with:

```sh
node deploy/team05/render.mjs .release/team05.json > .release/team05-manifest.json
```

Apply configuration, database/PVC and its Service first. Run the versioned bootstrap Job and wait for completion before starting API, worker and frontend. The Job applies migrations as the database owner, creates a separate `attest_runtime` login inheriting the restricted `attest_app` role, and bootstraps labelled synthetic walkthrough history and role accounts once. It does not reset an existing database. Delete the completed bootstrap Job after verification to free its pod quota.

All four steady-state workloads use one 5 GiB PVC, three ClusterIP Services, 300m requested CPU, 640 MiB requested memory, 1.7 limited CPU and 1664 MiB limited memory. Workloads use `Recreate` updates to fit the namespace quota. PostgreSQL data survives application restarts; do not delete `postgres-data` during updates.

## Operator-managed secrets

- `huawei-gateway`: existing namespace gateway key, injected directly into API/worker.
- `postgres-credentials`: database owner initialization credentials.
- `attest-runtime`: restricted application database URL, stable auth/signing/evidence/identity secrets, and Hedera testnet account/key/topic.
- `attest-bootstrap`: migration-owner URL and initial role-account password; injected into the one-time Job only.
- `attest-download`: GitHub release-download credential; injected into the init container only, never the serving containers.

Preserve existing runtime secrets and database credentials on redeployment. Keep secret values and kubeconfig out of Git, CI output, runtime bundles and reports.

## Provider scope

Bank sandbox, Huawei MaaS and Hedera testnet are live. Messaging and arbitrary registry lookups remain mock providers; the bundled Plan Vivo reference works without an external registry bridge. Email delivery remains unconfigured. Synthetic historical reports are labelled as such. Their fixture source accounts are cleared at initial bootstrap; live payouts require an administrator to link a real sandbox source account and enrol valid sandbox beneficiaries. Bootstrap does not submit live bank transfers or anchor historical mock reports.

Verify public health, API readiness through the namespace, role login/session forwarding, private-route denial, signed-report download, worker health, live read-only bank/MaaS connectivity, PVC binding and quota. Confirm development-tool routes return 404. Real mutation checks must retain idempotency keys and reconcile uncertain outcomes.
