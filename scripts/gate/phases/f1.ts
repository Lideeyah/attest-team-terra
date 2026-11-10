import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import {
  gitIgnores,
  grepAbsent,
  liveBuildExcludesMock,
  record,
  routeAbsentInProduction,
  routeRenders,
  screenshot,
  typecheck,
} from "../assert";
import { server } from "../server";
import { ROOT } from "../files";

/* Written from F-1's exit checklist. Every endpoint in backend 4.3 is probed
   with its own verb and an identifier that exists in the seed, and the result
   is checked against the envelope, the status table in backend 3 and the
   pagination guarantee in 4.4. */

type Probe = {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  /** A list endpoint must carry a meta block. */
  list?: boolean;
  /** The code this endpoint always returns, where it is meant to refuse. */
  expectCode?: string;
};

const PROBES: Probe[] = [
  /* Auth */
  { method: "POST", path: "/api/auth/signup", body: { email: "ops@ekuri-initiative.ng", password: "x", organisation: "Ekuri", role: "developer" } },
  { method: "POST", path: "/api/auth/signin", body: { email: "ops@ekuri-initiative.ng", password: "x" } },
  { method: "POST", path: "/api/auth/verify-email", body: { token: "tok" } },
  { method: "POST", path: "/api/auth/reset/request", body: { email: "ops@ekuri-initiative.ng" } },
  { method: "POST", path: "/api/auth/reset/confirm", body: { token: "tok", password: "x" } },
  { method: "GET", path: "/api/auth/session" },
  { method: "GET", path: "/api/invites/inv_7KQ2M4" },
  { method: "POST", path: "/api/invites/inv_7KQ2M4/redeem", body: { identity: "id", deviceKey: "key" } },

  /* Project onboarding */
  { method: "POST", path: "/api/projects/lookup", body: { registryId: "GS-10342" } },
  { method: "POST", path: "/api/projects", body: { registryRecord: {} } },
  { method: "GET", path: "/api/projects/proj_ekuri" },
  { method: "POST", path: "/api/projects/proj_ekuri/pdd" },
  { method: "GET", path: "/api/projects/proj_ekuri/extraction" },
  { method: "PATCH", path: "/api/projects/proj_ekuri/commitment", body: { field: "percentage", value: 60, reason: "Page 44." } },
  { method: "POST", path: "/api/projects/proj_ekuri/register" },
  { method: "GET", path: "/api/projects/proj_ekuri/mrv", list: true },
  { method: "POST", path: "/api/projects/proj_ekuri/mrv", body: { period: "2026-H2" } },
  { method: "GET", path: "/api/projects/proj_ekuri/certificates", list: true },

  /* Roster */
  { method: "GET", path: "/api/projects/proj_ekuri/participants?page=1&per_page=25", list: true },
  { method: "POST", path: "/api/projects/proj_ekuri/participants", body: { rows: [] } },
  { method: "GET", path: "/api/participants/ptc_000001" },
  { method: "PATCH", path: "/api/participants/ptc_000001", body: { status: "excluded", reason: "Name enquiry to be re-run." } },
  { method: "GET", path: "/api/participants/ptc_000001/payments", list: true },
  { method: "POST", path: "/api/participants/ptc_000001/name-check" },
  { method: "DELETE", path: "/api/participants/ptc_000001", expectCode: "PARTICIPANT_DELETE_NOT_PERMITTED" },

  /* Agents */
  { method: "GET", path: "/api/projects/proj_ekuri/agents", list: true },
  { method: "POST", path: "/api/projects/proj_ekuri/agents/invite", body: { name: "Eno Etim", email: "eno.etim@ekuri-initiative.ng" } },
  { method: "GET", path: "/api/agents/agt_0001" },
  { method: "PATCH", path: "/api/agents/agt_0001", body: { status: "suspended", reason: "Flag rate above threshold." } },

  /* Runs */
  { method: "GET", path: "/api/projects/proj_ekuri/runs", list: true },
  { method: "POST", path: "/api/projects/proj_ekuri/runs", body: { period: "2026-Q4", rosterId: "ros_1", declaredGross: "80333333.33", fundingAmount: "31400000.00" } },
  { method: "GET", path: "/api/runs/run_2026q4" },
  { method: "GET", path: "/api/runs/run_2026q4/arithmetic" },
  { method: "POST", path: "/api/runs/run_2026q4/preflight" },
  { method: "POST", path: "/api/runs/run_2026q4/execute" },
  { method: "POST", path: "/api/runs/run_2026q4/retry", body: { failureClass: "ACCOUNT_DORMANT" } },
  { method: "POST", path: "/api/runs/run_2026q4/requery", body: { transferId: "trf_2026q4_00001" } },
  { method: "POST", path: "/api/runs/run_2026q4/cancel" },
  { method: "GET", path: "/api/runs/run_2026q4/transfers?page=1&per_page=50", list: true },

  /* Funding */
  { method: "GET", path: "/api/projects/proj_ekuri/funding" },
  { method: "GET", path: "/api/projects/proj_ekuri/reconciliation", list: true },
  { method: "GET", path: "/api/tariff" },

  /* Disputes */
  { method: "GET", path: "/api/projects/proj_ekuri/disputes", list: true },
  { method: "GET", path: "/api/disputes/dsp_0001" },
  { method: "POST", path: "/api/disputes/dsp_0001/respond", body: { body: "The transfer settled with session 000014261109142207104883." } },
  { method: "POST", path: "/api/disputes", body: { projectId: "proj_ekuri", category: "not-received" } },

  /* Attestations and verification */
  { method: "GET", path: "/api/projects/proj_ekuri/attestations", list: true },
  { method: "GET", path: "/api/attestations/att_ekuri_2026q3" },
  { method: "POST", path: "/api/attestations/att_ekuri_2026q3/disclosure", body: { transferId: "trf_2026q3_00001" } },
  { method: "POST", path: "/api/verify/attestation", body: { hash: "0" } },
  /* A bundle without the transfer's own facts cannot be verified at all: the
     leaf is recomputed from them rather than trusted, so the request is
     malformed rather than a proof that does not hold. */
  {
    method: "POST",
    path: "/api/verify/disclosure",
    body: { bundle: { leaf: "", proof: [], rootReference: "att_ekuri_2026q3" } },
    expectCode: "INVALID_REQUEST",
  },
  /* With the facts, and a leaf that is not what they compute to, it is a
     proof that does not hold. */
  {
    method: "POST",
    path: "/api/verify/disclosure",
    body: {
      bundle: {
        transfer: {
          id: "trf_2026q3_00001",
          amount: "23050.00",
          sessionId: null,
          settledAt: null,
        },
        leaf: "0".repeat(64),
        proof: [],
        rootReference: "att_ekuri_2026q3",
      },
    },
    expectCode: "PROOF_INVALID",
  },
  /* A root nothing was checked against is not a foreign leaf. */
  {
    method: "POST",
    path: "/api/verify/disclosure",
    body: {
      bundle: {
        transfer: {
          id: "trf_2026q3_00001",
          amount: "23050.00",
          sessionId: null,
          settledAt: null,
        },
        leaf: "0".repeat(64),
        proof: [],
        rootReference: "att_nothing",
      },
    },
    expectCode: "NOT_FOUND",
  },

  /* Field */
  { method: "POST", path: "/api/field/device/bind", body: { deviceKey: "key" } },
  { method: "POST", path: "/api/field/enrolments", body: { items: [{ clientUuid: "uuid-1" }] } },
  { method: "GET", path: "/api/field/enrolments/enr_000001" },
  { method: "GET", path: "/api/field/me" },

  /* Public */
  { method: "GET", path: "/api/public/register?page=1&per_page=10", list: true },
  { method: "GET", path: "/api/public/projects/proj_ekuri" },
  { method: "GET", path: "/api/public/developers/dev_ekuri" },
  { method: "GET", path: "/api/public/attestations/att_ekuri_2026q3" },
  { method: "GET", path: "/api/public/projects/proj_ekuri/geography" },

  /* Verifier */
  { method: "GET", path: "/api/verifier/watchlist", list: true },
  { method: "POST", path: "/api/verifier/watchlist", body: { projectId: "proj_delta" } },
  { method: "GET", path: "/api/verifier/projects/proj_ekuri" },
  { method: "GET", path: "/api/verifier/compare?ids=proj_ekuri,proj_delta" },
  { method: "POST", path: "/api/verifier/export", body: { projectId: "proj_ekuri", period: "2026-Q3", format: "csv" } },
  { method: "GET", path: "/api/verifier/alerts", list: true },
  { method: "POST", path: "/api/verifier/alerts", body: { projectId: "proj_ekuri", condition: "coverage-below", threshold: 0.5 } },

  /* Bank operations */
  { method: "GET", path: "/api/ops/signals", list: true },
  { method: "GET", path: "/api/ops/signals/sig_0231" },
  { method: "GET", path: "/api/ops/signals/sig_0231/graph" },
  { method: "GET", path: "/api/ops/cases", list: true },
  { method: "POST", path: "/api/ops/cases/case_0231/action", body: { action: "freeze", note: "Pending documentation." } },
  { method: "GET", path: "/api/ops/exceptions", list: true },
  { method: "GET", path: "/api/ops/reconciliation", list: true },

  /* Participant, unauthenticated */
  { method: "GET", path: "/api/receipt/rct_ngozi_eyo_2026q4" },
  { method: "POST", path: "/api/receipt/rct_ngozi_eyo_2026q4/confirm" },
  { method: "POST", path: "/api/receipt/rct_ngozi_eyo_2026q4/dispute", body: { category: "not-received" } },

  /* Inbound */
  { method: "POST", path: "/api/webhooks/ussd", body: { sessionId: "ussd_0001", text: "" } },
  { method: "POST", path: "/api/webhooks/sms-inbound", body: { from: "+2348030000000", text: "CONFIRM" } },
  { method: "POST", path: "/api/webhooks/sms-delivery", body: { id: "sms_0001", status: "Success" } },
];

/* Three codes are facts about a record rather than failures to read it, so
   they are answered with the record carrying that state. They are forceable
   like any other; what differs is where the answer shows. */
const RECORD_STATE_CODES = ["ANCHOR_PENDING", "ANCHOR_UNREACHABLE", "CHAIN_DISCONTINUITY"];

/* The bank's own status table, which Attest's codes map onto. */
const STATUS_EXPECTATION: Record<string, number> = {
  INVALID_REQUEST: 400,
  INSUFFICIENT_FUNDS: 402,
  ACCOUNT_RESTRICTED: 403,
  ACCOUNT_NOT_FOUND: 404,
  NOT_FOUND: 404,
  DUPLICATE_REQUEST: 409,
  NAME_ENQUIRY_EXPIRED: 409,
  NAME_ENQUIRY_MISMATCH: 409,
  ACCOUNT_DORMANT: 422,
  BENEFICIARY_FROZEN: 422,
  LIMIT_EXCEEDED: 422,
  BVN_MISMATCH: 422,
  RATE_LIMITED: 429,
  BANK_UNAVAILABLE: 503,
  TIMEOUT: 504,
};

export const ERROR_CODES = [
  "FORBIDDEN", "RATE_LIMITED", "INVALID_REQUEST", "NOT_FOUND", "DUPLICATE_REQUEST",
  "IDENTITY_DUPLICATE", "BVN_MISMATCH", "IDENTITY_UNREACHABLE",
  "NAME_MISMATCH", "NAME_ENQUIRY_EXPIRED", "NAME_ENQUIRY_MISMATCH",
  "BOUNDARY_OUTSIDE", "GPS_UNAVAILABLE", "CONSENT_MISSING", "DEVICE_UNBOUND",
  "REGISTRY_NOT_FOUND", "REGISTRY_UNREACHABLE",
  "PDD_UNREADABLE", "PDD_NO_COMMITMENT", "EXTRACTION_LOW_CONFIDENCE",
  "MODEL_UNAVAILABLE",
  "ROSTER_EMPTY", "PERIOD_CLOSED", "FUNDING_NOT_RECEIVED", "FUNDING_INSUFFICIENT",
  "FUNDING_EXCLUDES_CHARGES", "PREFLIGHT_EXCLUSIONS_REQUIRED",
  "ACCOUNT_NOT_FOUND", "ACCOUNT_DORMANT", "ACCOUNT_RESTRICTED", "BENEFICIARY_FROZEN",
  "INSUFFICIENT_FUNDS", "LIMIT_EXCEEDED", "BANK_UNAVAILABLE", "TIMEOUT",
  "TRANSFER_REVERSED",
  "ANCHOR_PENDING", "ANCHOR_UNREACHABLE", "CHAIN_DISCONTINUITY",
  "PROOF_INVALID", "LEAF_NOT_IN_ROOT",
  "TOKEN_EXPIRED", "ALREADY_CONFIRMED", "DISPUTE_ALREADY_OPEN",
  "DISPUTE_RESOLUTION_BASIS_REQUIRED",
  "RECONCILIATION_MISMATCH", "PARTICIPANT_DELETE_NOT_PERMITTED",
];

const STREAM_EVENTS = [
  "transfer.queued",
  "transfer.in_flight",
  "transfer.settled",
  "transfer.failed",
  "transfer.reversed",
  "run.complete",
];

type Envelope = {
  status?: string;
  data?: unknown;
  meta?: { page?: number; per_page?: number; total?: number; total_pages?: number } | null;
  request_id?: string;
  error?: { code?: string; message?: string; remediation?: string };
};

async function force(baseUrl: string, code: string | null): Promise<void> {
  await fetch(`${baseUrl}/api/dev/force`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export async function f1(): Promise<void> {
  typecheck();

  /* Every generated tree is ignored, checked rather than assumed. */
  gitIgnores(["app/dev/states/page.tsx", "app/api/dev/force/route.ts", "app/api/[[...path]]/route.ts", "app/hooks/forge/route.ts"]);

  /* The client is exercised against the mock through MSW. */
  try {
    execFileSync("npm", ["test"], { cwd: ROOT, stdio: "pipe" });
    record("client tests against the mock", true);
  } catch (error) {
    const output = error instanceof Error && "stdout" in error
      ? String((error as { stdout?: Buffer }).stdout ?? "")
      : String(error);
    record("client tests against the mock", false, output.split("\n").slice(-8).join(" | "));
  }

  const { baseUrl } = await server();

  const broken: string[] = [];
  const missingMeta: string[] = [];
  for (const [index, probe] of PROBES.entries()) {
    const response = await fetch(`${baseUrl}${probe.path}`, {
      method: probe.method,
      headers: {
        ...(probe.body ? { "content-type": "application/json" } : {}),
        ...(probe.method === "GET"
          ? {}
          /* One key per probe, not one per path: two probes of the same
             endpoint with different bodies are two requests, and sharing a key
             would make the second a conflict rather than an answer. */
          : { "Idempotency-Key": `gate-${index}-${probe.method}-${probe.path}` }),
      },
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    });
    const payload = (await response.json()) as Envelope;

    if (probe.expectCode) {
      if (payload.error?.code !== probe.expectCode) {
        broken.push(`${probe.method} ${probe.path} — expected ${probe.expectCode}`);
      }
      continue;
    }

    const shaped =
      payload.status === "success" &&
      payload.data !== undefined &&
      typeof payload.request_id === "string";
    if (!response.ok || !shaped) {
      broken.push(
        `${probe.method} ${probe.path} — status ${response.status} ${JSON.stringify(payload).slice(0, 80)}`,
      );
      continue;
    }
    if (probe.list) {
      const meta = payload.meta;
      if (
        !meta ||
        typeof meta.page !== "number" ||
        typeof meta.per_page !== "number" ||
        typeof meta.total !== "number" ||
        typeof meta.total_pages !== "number"
      ) {
        missingMeta.push(`${probe.method} ${probe.path}`);
      }
    }
  }
  record(
    `every contract endpoint answers in the contract envelope (${PROBES.length} probed)`,
    broken.length === 0,
    broken.slice(0, 4).join(" | "),
  );
  record(
    "every list endpoint returns a meta block",
    missingMeta.length === 0,
    missingMeta.join(", "),
  );

  /* Every error code is forceable, and each carries real copy. */
  const unforceable: string[] = [];
  const copyless: string[] = [];
  const wrongStatus: string[] = [];
  for (const code of ERROR_CODES) {
    await force(baseUrl, code);

    if (code === "RECONCILIATION_MISMATCH") {
      /* A period that does not reconcile is a fact about the period, so it
         comes back on the period's own row rather than as a failure to read
         it. */
      const probe = await fetch(`${baseUrl}/api/projects/proj_ekuri/reconciliation`);
      const payload = (await probe.json()) as Envelope & {
        data?: { state?: string }[];
      };
      const shown = (payload.data ?? []).some((row) => row.state === "mismatch");
      if (!shown) {
        unforceable.push(`${code} -> ${JSON.stringify(payload.data ?? payload.error)}`);
      }
      continue;
    }

    if (RECORD_STATE_CODES.includes(code)) {
      /* Forced on the record it is about, it comes back as the record's own
         state rather than as a failure. */
      const probe = await fetch(`${baseUrl}/api/public/attestations/att_ekuri_2026q3`);
      const payload = (await probe.json()) as Envelope & {
        data?: { anchorState?: string; chainBreak?: boolean };
      };
      const shown =
        code === "CHAIN_DISCONTINUITY"
          ? payload.data?.chainBreak === true
          : payload.data?.anchorState === (code === "ANCHOR_PENDING" ? "pending" : "unreachable");
      if (!shown) {
        unforceable.push(`${code} -> ${JSON.stringify(payload.data ?? payload.error)}`);
      }
      continue;
    }

    const probe = await fetch(`${baseUrl}/api/runs/run_2026q4`);
    const payload = (await probe.json()) as Envelope;
    if (payload.error?.code !== code) {
      unforceable.push(`${code} -> ${payload.error?.code ?? "no error"}`);
      continue;
    }
    if (!payload.error.message || !payload.error.remediation) {
      copyless.push(code);
    }
    const expected = STATUS_EXPECTATION[code];
    if (expected !== undefined && probe.status !== expected) {
      wrongStatus.push(`${code} ${probe.status} not ${expected}`);
    }
  }
  await force(baseUrl, null);
  record(
    `every error code is forceable (${ERROR_CODES.length} codes)`,
    unforceable.length === 0,
    unforceable.slice(0, 4).join(" | "),
  );
  record(
    "every forced error carries a message and a remediation",
    copyless.length === 0,
    copyless.join(", "),
  );
  record(
    "error codes carry the bank's own status codes",
    wrongStatus.length === 0,
    wrongStatus.slice(0, 6).join(" | "),
  );

  /* Pagination is capped where the bank caps it. */
  const capped = await fetch(
    `${baseUrl}/api/projects/proj_ekuri/participants?page=1&per_page=400`,
  );
  const cappedPayload = (await capped.json()) as Envelope;
  record(
    "per_page is capped at one hundred",
    cappedPayload.meta?.per_page === 100,
    `per_page ${String(cappedPayload.meta?.per_page)}`,
  );

  /* A parameter the contract does not list changes nothing. */
  const unlisted = await fetch(
    `${baseUrl}/api/projects/proj_ekuri/participants?rows=10000&per_page=1`,
  );
  const unlistedPayload = (await unlisted.json()) as Envelope;
  record(
    "a query parameter outside the contract is ignored",
    unlistedPayload.meta?.total === 2090,
    `total ${String(unlistedPayload.meta?.total)}`,
  );

  /* The roster size is a developer control, not a contract parameter. */
  await fetch(`${baseUrl}/api/dev/roster-size`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: "proj_ekuri", rows: 10_000 }),
  });
  const scaled = await fetch(
    `${baseUrl}/api/projects/proj_ekuri/participants?page=1&per_page=1`,
  );
  const scaledPayload = (await scaled.json()) as Envelope;
  record(
    "the roster size is settable from /api/dev for profiling",
    scaledPayload.meta?.total === 10_000,
    `total ${String(scaledPayload.meta?.total)}`,
  );
  await fetch(`${baseUrl}/api/dev/roster-size`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: "proj_ekuri", rows: null }),
  });

  /* Moving the shares from the panel recomputes the fixture, so a run's
     counts and a period's coverage never go stale against the transfers. */
  await fetch(`${baseUrl}/api/dev/stream-config`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ failureShare: 0.5, reversalShare: 0.05 }),
  });
  const shifted = (await (
    await fetch(`${baseUrl}/api/runs/run_2026q3`)
  ).json()) as Envelope & { data?: { counts?: Record<string, number>; rosterSize?: number } };
  let listedFailures = 0;
  for (let page = 1; page <= 20; page += 1) {
    const rows = (await (
      await fetch(`${baseUrl}/api/runs/run_2026q3/transfers?page=${page}&per_page=100`)
    ).json()) as Envelope & { data?: { state: string }[] };
    listedFailures += (rows.data ?? []).filter((row) => row.state === "failed").length;
    if ((rows.data ?? []).length < 100) {
      break;
    }
  }
  record(
    "moving the shares recomputes a run's counts",
    shifted.data?.counts?.failed === listedFailures,
    `counts ${String(shifted.data?.counts?.failed)} against ${listedFailures} rows`,
  );
  await fetch(`${baseUrl}/api/dev/stream-config`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ failureShare: 0.12, reversalShare: 0.03 }),
  });

  /* A period's figures are the transfers behind it, to the kobo. */
  const project = (await (
    await fetch(`${baseUrl}/api/public/projects/proj_ekuri`)
  ).json()) as Envelope & {
    data?: { project?: { periods?: { period: string; paid: number; enrolled: number }[] } };
  };
  const closed = project.data?.project?.periods?.find((period) => period.period === "2026-Q3");
  let paid = 0;
  for (let page = 1; page <= 20; page += 1) {
    const rows = (await (
      await fetch(`${baseUrl}/api/runs/run_2026q3/transfers?page=${page}&per_page=100`)
    ).json()) as Envelope & { data?: { state: string }[] };
    paid += (rows.data ?? []).filter(
      (row) => row.state === "settled" || row.state === "unconfirmed",
    ).length;
    if ((rows.data ?? []).length < 100) {
      break;
    }
  }
  record(
    "a period's paid count is the transfers that cleared",
    closed?.paid === paid,
    `period ${String(closed?.paid)} against ${paid} rows`,
  );

  /* The platform readiness probe. */
  const health = await fetch(`${baseUrl}/healthz`);
  record("the readiness probe answers", health.ok, `status ${health.status}`);

  /* Idempotency behaves as the bank's conventions require. */
  const key = "gate-idempotency-probe";
  const body = { projectId: "proj_ekuri", category: "not-received", body: "No payment arrived." };
  const first = await fetch(`${baseUrl}/api/disputes`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
  await first.json();
  const replay = await fetch(`${baseUrl}/api/disputes`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
  await replay.json();
  record(
    "the same key and body replays the original response",
    replay.headers.get("Idempotent-Replayed") === "true",
    `header ${String(replay.headers.get("Idempotent-Replayed"))}`,
  );
  const conflict = await fetch(`${baseUrl}/api/disputes`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({ ...body, category: "wrong-amount" }),
  });
  const conflictPayload = (await conflict.json()) as Envelope;
  record(
    "the same key with a different body is refused",
    conflict.status === 409 && conflictPayload.error?.code === "DUPLICATE_REQUEST",
    `status ${conflict.status} ${String(conflictPayload.error?.code)}`,
  );

  /* A batch differs below its top level, which is where a fingerprint taken
     over top-level keys alone would silently accept a different payload. */
  const batchKey = "gate-idempotency-batch";
  const batchHeaders = {
    "content-type": "application/json",
    "Idempotency-Key": batchKey,
  };
  await fetch(`${baseUrl}/api/field/enrolments`, {
    method: "POST",
    headers: batchHeaders,
    body: JSON.stringify({ items: [{ clientUuid: "uuid-one", name: "Adaeze Okonkwo" }] }),
  });
  const batchConflict = await fetch(`${baseUrl}/api/field/enrolments`, {
    method: "POST",
    headers: batchHeaders,
    body: JSON.stringify({ items: [{ clientUuid: "uuid-two", name: "Ebong Asuquo" }] }),
  });
  const batchPayload = (await batchConflict.json()) as Envelope;
  record(
    "a batch that differs below the top level is refused",
    batchConflict.status === 409 && batchPayload.error?.code === "DUPLICATE_REQUEST",
    `status ${batchConflict.status} ${String(batchPayload.error?.code)}`,
  );

  /* The inbound hook verifies before it acts. */
  const hookBody = JSON.stringify({ event_id: "evt_gate_1", data: {} });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const unsigned = await fetch(`${baseUrl}/hooks/forge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-event": "transfer.successful",
      "x-forge-timestamp": timestamp,
      "x-forge-signature": "sha256=00",
    },
    body: hookBody,
  });
  record(
    "the inbound hook refuses an unverified body",
    unsigned.status === 403,
    `status ${unsigned.status}`,
  );
  /* A signature of the right length but not hex, which is what reaches the
     comparison and is where a careless implementation throws. */
  const malformed = await fetch(`${baseUrl}/hooks/forge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-event": "transfer.successful",
      "x-forge-timestamp": timestamp,
      "x-forge-signature": `sha256=${"z".repeat(64)}`,
    },
    body: hookBody,
  });
  record(
    "the inbound hook refuses a malformed signature without failing",
    malformed.status === 403,
    `status ${malformed.status}`,
  );

  const secret =
    process.env.FORGE_WEBHOOK_SECRET ?? "gate-forge-secret-not-a-real-credential";
  const sign = (body: string) =>
    createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  const signed = await fetch(`${baseUrl}/hooks/forge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-event": "transfer.successful",
      "x-forge-timestamp": timestamp,
      "x-forge-signature": `sha256=${sign(hookBody)}`,
    },
    body: hookBody,
  });
  record("the inbound hook accepts a verified body", signed.status === 200, `status ${signed.status}`);

  const replayed = await fetch(`${baseUrl}/hooks/forge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-event": "transfer.successful",
      "x-forge-timestamp": timestamp,
      "x-forge-signature": `sha256=${sign(hookBody)}`,
    },
    body: hookBody,
  });
  const replayedPayload = (await replayed.json()) as { message?: string };
  record(
    "the inbound hook de-duplicates on event id",
    replayed.status === 200 && /already handled/i.test(replayedPayload.message ?? ""),
    String(replayedPayload.message),
  );

  const badJson = "not json";
  const malformedBody = await fetch(`${baseUrl}/hooks/forge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-event": "transfer.successful",
      "x-forge-timestamp": timestamp,
      "x-forge-signature": `sha256=${sign(badJson)}`,
    },
    body: badJson,
  });
  record(
    "the inbound hook refuses a signed body that is not JSON",
    malformedBody.status === 400,
    `status ${malformedBody.status}`,
  );

  /* The stream emits every event type, and a forced code fails it. */
  await fetch(`${baseUrl}/api/dev/stream-config`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rate: 120, failureShare: 0.2, reversalShare: 0.15, transfers: 60 }),
  });
  const seen = new Set<string>();
  const streamed = new Map<string, string>();
  const controller = new AbortController();
  const streamResponse = await fetch(`${baseUrl}/api/runs/run_2026q4/stream`, {
    signal: controller.signal,
  });
  const reader = streamResponse.body?.getReader();
  const decoder = new TextDecoder();
  const deadline = Date.now() + 25_000;
  while (reader && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    let event = "";
    for (const line of decoder.decode(value).split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
        seen.add(event);
      }
      if (line.startsWith("data:") && event.startsWith("transfer.")) {
        const payload = JSON.parse(line.slice(5)) as { id?: string; state?: string };
        if (payload.id && payload.state) {
          streamed.set(payload.id, payload.state);
        }
      }
    }
    if (STREAM_EVENTS.every((event) => seen.has(event))) {
      break;
    }
  }
  controller.abort();
  const missingEvents = STREAM_EVENTS.filter((event) => !seen.has(event));
  record(
    "the mock stream emits every event type",
    missingEvents.length === 0,
    missingEvents.length ? `missing ${missingEvents.join(", ")}` : `${seen.size} types`,
  );

  const configProbe = await fetch(`${baseUrl}/api/dev/stream-config`);
  const config = (await configProbe.json()) as {
    data?: { rate?: number; failureShare?: number; reversalShare?: number };
  };
  record(
    "stream rate, failure share and reversal share are configurable",
    config.data?.rate === 120 &&
      config.data?.failureShare === 0.2 &&
      config.data?.reversalShare === 0.15,
    JSON.stringify(config.data ?? {}),
  );

  /* What the stream reports is what the table behind it says. */
  const streamFailures = [...streamed.entries()]
    .filter(([, state]) => state === "failed")
    .map(([id]) => id);
  const listed = await fetch(`${baseUrl}/api/runs/run_2026q4/transfers?page=1&per_page=100`);
  const listedPayload = (await listed.json()) as Envelope & {
    data?: { id: string; state: string; failureClass: string | null }[];
  };
  const disagreeing = streamFailures.filter((id) => {
    const row = listedPayload.data?.find((candidate) => candidate.id === id);
    return row !== undefined && (row.state !== "failed" || row.failureClass === null);
  });
  record(
    "a transfer the stream reports as failed is failed in the transfer list",
    disagreeing.length === 0,
    disagreeing.slice(0, 4).join(", "),
  );

  record(
    "the stream emits no event the contract does not enumerate",
    [...seen].every((event) => STREAM_EVENTS.includes(event)),
    [...seen].filter((event) => !STREAM_EVENTS.includes(event)).join(", "),
  );

  await force(baseUrl, "BANK_UNAVAILABLE");
  let dropped = false;
  try {
    const failingStream = await fetch(`${baseUrl}/api/runs/run_2026q4/stream`);
    await failingStream.text();
  } catch {
    dropped = true;
  }
  record("a forced code drops the stream", dropped, dropped ? "" : "the stream completed");
  await force(baseUrl, null);

  /* One module owns the base URL, so integration is one change. */
  grepAbsent(
    "no screen calls fetch on an API path directly",
    /fetch\(\s*[`"']\/api\//,
    ["app/**/*.tsx", "components/**/*.tsx", "dev-tools/**/*.tsx", "dev-tools/**/*.ts"],
    ["dev-tools/dev/states/devControl.ts", "app/dev/states/devControl.ts"],
  );
  /* A `.catch()` that turns a transport failure into a typed result is the
     discipline rather than a breach of it, so the pattern ignores a method
     call and nothing is excluded from the search. */
  grepAbsent(
    "no caller uses try/catch for an expected error",
    /(?<![.\w])catch\s*[({]/,
    ["app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts"],
    /* Two places turn a throw into a value, and neither guards an answer from
       the API: lib/json.ts guards pasted input, and lib/field/storage.ts
       guards the device's own storage and camera, which refuse by throwing
       and have no typed result to switch on. */
    ["lib/api/client.test.ts", "lib/json.ts", "lib/field/storage.ts"],
  );
  grepAbsent(
    "no NEXT_PUBLIC_ variable carries a key, secret or token",
    /NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN)/,
    ["app/**/*", "components/**/*", "lib/**/*", "dev-tools/**/*", ".env.example"],
  );
  grepAbsent(
    "no screen reads the platform key",
    /GATEWAY_KEY/,
    ["app/**/*.tsx", "components/**/*.tsx", "lib/api/**/*.ts"],
  );

  await routeRenders("/dev/states");
  await screenshot("F-1", "/dev/states", "dev-states");

  await routeAbsentInProduction("/dev/states");
  await routeAbsentInProduction("/dev/kitchen-sink");
  await routeAbsentInProduction("/api/dev/force");
  await routeAbsentInProduction("/api/dev/stream-config");

  liveBuildExcludesMock();
}
