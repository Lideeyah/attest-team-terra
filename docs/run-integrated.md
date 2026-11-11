# Run the integrated application

Install the frontend with `npm ci`, then run `npm run backend:install` and
`npm run backend:build`. Backend code and contracts stay under `backend/`.

Start `npm run backend:local` in one terminal and `npm run dev:integrated` in another.
Use `http://localhost:3000` consistently. The backend listens on port 8080 and creates
persistent, ignored `.local-state/` data under `backend/`. Its terminal prints the local
fixture password. Keep that password private; it is not a production credential.

| Role | Local fixture email |
| --- | --- |
| Developer administrator | local@example.test |
| Developer operator | developer_operator@example.test |
| Verifier | verifier@example.test |
| Bank operations | bank_ops@example.test |
| Platform administrator | platform_admin@example.test |

Agents must use invitation redemption and administrator identity activation. The
invitation device retains its Ed25519 private key. All external providers in local
mode are mocked even though the frontend is connected to the real API and PostGIS.

The integration preview used during this task is on `http://localhost:3001`. To use
that port after restarting, set `PUBLIC_URL=http://localhost:3001` in the backend
terminal and `PORT=3001` in the frontend terminal before starting the commands above.
Match PUBLIC_URL to the visible browser origin; use 127.0.0.1 only for internal proxy
traffic, not browser authentication URLs.

Run `npm run check:integration` for local-only acceptance. Its default origin is port
3001; set ATTEST_TEST_ORIGIN for another local port. It can execute the clean synthetic
fixture once and deliberately reuses an existing executed run on subsequent checks.

For a production build, run `npm run build:integrated`; configure backend environment
variables using `backend/.env.example`, apply migrations, then use
`npm run start:integrated`. API, worker and Next.js run behind one frontend origin.
The root Dockerfile provides the same arrangement; it has not been container-tested.
Never copy local fixture settings or credentials into an image. No deployment was made.

Read [integration status](integration-status.md) before treating the build as a live
payment service. `npm run dev` alone retains the original mock-front-end workflow;
use `dev:integrated` for the connected application.
