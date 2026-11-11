# Team05 Kubernetes deployment

Public origin: `https://team05.xtradot.co`. The platform ingress connects to the ClusterIP Service named `app`, port **80**, targeting the frontend on port 3000. Next.js forwards API, authentication, receipt, and Forge callback traffic to the internal `api:8080` Service. The worker and PostgreSQL/PostGIS are separate workloads in the same namespace.

## Reproducible release

Pushing `main` runs `.github/workflows/deploy-team05.yml` on a Linux Node 24 runner. It builds the production backend and standalone frontend and publishes private, versioned release assets tagged `team05-<commit>`. No secrets are part of the bundles. The deployment uses official Node 24 containers with an init container that downloads the pinned bundle and verifies its SHA-256 before extraction. This avoids requiring Docker on the operator's computer or a separately provisioned private container registry.

Prepare a non-secret release JSON file with `commit`, `FRONTEND_ASSET_URL`, `FRONTEND_SHA256`, `BACKEND_ASSET_URL`, and `BACKEND_SHA256`. Asset URLs use GitHub's repository release-assets API. Render the namespace-scoped resources with:

```sh
node deploy/team05/render.mjs .release/team05.json > .release/team05-manifest.json
```

Apply configuration, database/PVC and its Service first. Run the versioned bootstrap Job and wait for completion before starting API, worker and frontend. The Job applies migrations as the database owner, creates a separate `attest_runtime` login inheriting the restricted `attest_app` role, and bootstraps labelled synthetic walkthrough history and role accounts once. It does not reset an existing database. Delete the completed bootstrap Job after verification to free its pod quota.

The workflow's deployment job performs this sequence with `deploy/team05/apply.py`. It reads `TEAM05_KUBECONFIG` and `TEAM05_BOOTSTRAP_JSON` from encrypted repository Actions secrets; the kubeconfig is written only to the runner's temporary directory with mode 0600. The namespace gateway secret is preserved. A redeployment preserves existing managed secrets and the database volume. `scripts/check-hosted.mjs` accepts `ATTEST_CHECK_ORIGIN` and `ATTEST_CHECK_PASSWORD` for a read-only hosted walkthrough against this origin.

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

## Rollout result — 11 November 2026

Deployment code and provider fixes were pushed to main (`638a05b`, followed by the remote rollout job in `87b5fe5`). Both Linux production builds and release packaging succeeded. The four-workload manifest was checked against the namespace CPU/memory/PVC quota, and all 25 frontend tests passed. The latest provider regression run passed all 84 backend tests.

**Deployment remains blocked by Kubernetes API availability.** Initial read-only inventory succeeded, showing an empty namespace and the expected gateway secret. Subsequent CA-verified TLS connections to the supplied API endpoint timed out before authentication from both the Windows workstation and GitHub's Linux runner. Python TLS 1.2/1.3 probes and kubectl reproduced the failure. The rollout failed on its first resource read, before secret creation or workload application; no live deployment is claimed. The public origin returned HTTP 403 during this attempt.

Build and rollout evidence: [GitHub Actions run 43022124294](https://github.com/Lideeyah/attest-team-terra/actions/runs/43022124294). Encrypted deployment secrets are configured; their values are not in the repository. After platform access is restored (or an updated kubeconfig is supplied), rerun only the failed deployment job; the immutable runtime release already exists:

```sh
gh run rerun 43022124294 --failed --repo Lideeyah/attest-team-terra
```

Then run the hosted walkthrough against `https://team05.xtradot.co` with `ATTEST_CHECK_ORIGIN` and the locally retained initial login password. Runtime readiness, public login and the complete hosted workflow have not been verified for this cluster rollout.

## Later retry: storage provisioning blocked

Cluster access briefly recovered. The encrypted runtime secrets, ConfigMaps, `postgres-data` PVC, PostgreSQL Deployment and its internal Service were applied. Existing managed secrets were preserved. The application workloads have not reached deployment because the rollout correctly waits for PostgreSQL and migrations first.

The diagnostic log in [run 43083176200](https://github.com/Lideeyah/attest-team-terra/actions/runs/43083176200) identifies the current blocker:

> Cannot create a new Volume with an outstanding balance on your account

This is the storage provider's `ProvisioningFailed` response. PVC `postgres-data` remains Pending with storage class `linode-block-storage-retain`, and the PostgreSQL pod is unschedulable due to the unbound claim. Increasing application timeouts will not resolve volume provisioning. The volume has not been deleted, replaced with ephemeral storage, or migrated to an external database. Platform storage must be restored, or the operator must explicitly approve an external PostgreSQL/PostGIS database, before continuing.

The namespace quota was increased by the platform to requests of 1 CPU / 2 GiB and limits of 3 CPU / 3 GiB; the prepared workload budget remains within it. TLS access is still intermittent, so deployment commands now retry transient connection errors and emit read-only pod/PVC diagnostics on database-readiness failure.

The public origin is protected by Cloudflare Access, and the user confirmed that the platform login should remain. An HTTP 200 Cloudflare sign-in page is not evidence of application readiness. No access policy was changed or bypassed.
