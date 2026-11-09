import type {
  Arithmetic,
  Payment,
  Attestation,
  DisclosureBundle,
  ErrorCode,
  Envelope,
  ExtractionResult,
  Invite,
  Meta,
  Participant,
  RegisterRow,
  RegistryRecord,
  Receipt,
  Session,
} from "@/lib/api/contract";
import { ERROR_COPY } from "@/lib/mock/errors";
import { readForced, rosterSizeFor } from "@/lib/mock/forced";
import {
  AGENTS,
  AMOUNT_PER_HOUSEHOLD,
  CASES,
  DISPUTES,
  EXCEPTIONS,
  PROJECTS,
  RECONCILIATIONS,
  RUNS,
  SIGNALS,
  TARIFF,
  accountGraph,
  chargeFor,
  addAmounts,
  attestationsFor,
  geography,
  multiplyAmount,
  participantAt,
  participants,
  projectById,
  runTransfers,
  transferAt,
  subtractAmounts,
} from "@/lib/mock/seed";

/* The mock server. Same paths, same request shapes, same response shapes and
   the same envelope as the contract in backend section 4, so integration is a
   change of base URL and nothing else. */

let requestCounter = 0;

function requestId(): string {
  requestCounter += 1;
  return `req_mock_${String(requestCounter).padStart(8, "0")}`;
}

export function success<T>(data: T, meta: Meta | null = null, message = "OK"): Envelope<T> {
  return { status: "success", message, data, meta, request_id: requestId() };
}

export function failure(code: ErrorCode, field: string | null = null): Envelope<never> {
  const copy = ERROR_COPY[code];
  return {
    status: "error",
    error: { code, message: copy.message, field, remediation: copy.remediation },
    request_id: requestId(),
  };
}

/* The bank's own status table from backend section 3. Attest's codes map onto
   it, so there is no translation layer in the middle. */
const STATUS_FOR_CODE: Partial<Record<ErrorCode, number>> = {
  INVALID_REQUEST: 400,
  INSUFFICIENT_FUNDS: 402,
  ACCOUNT_RESTRICTED: 403,
  FORBIDDEN: 403,
  CONSENT_MISSING: 403,
  PARTICIPANT_DELETE_NOT_PERMITTED: 403,
  ACCOUNT_NOT_FOUND: 404,
  NOT_FOUND: 404,
  REGISTRY_NOT_FOUND: 404,
  DUPLICATE_REQUEST: 409,
  NAME_ENQUIRY_EXPIRED: 409,
  NAME_ENQUIRY_MISMATCH: 409,
  IDENTITY_DUPLICATE: 409,
  ALREADY_CONFIRMED: 409,
  DISPUTE_ALREADY_OPEN: 409,
  ACCOUNT_DORMANT: 422,
  BENEFICIARY_FROZEN: 422,
  LIMIT_EXCEEDED: 422,
  BVN_MISMATCH: 422,
  PERIOD_CLOSED: 422,
  ROSTER_EMPTY: 422,
  FUNDING_NOT_RECEIVED: 422,
  FUNDING_INSUFFICIENT: 422,
  FUNDING_EXCLUDES_CHARGES: 422,
  PREFLIGHT_EXCLUSIONS_REQUIRED: 422,
  TOKEN_EXPIRED: 410,
  RATE_LIMITED: 429,
  BANK_UNAVAILABLE: 503,
  MODEL_UNAVAILABLE: 503,
  REGISTRY_UNREACHABLE: 503,
  IDENTITY_UNREACHABLE: 503,
  ANCHOR_UNREACHABLE: 503,
  TIMEOUT: 504,
};

export function statusFor(envelope: Envelope<unknown>): number {
  if (envelope.status === "success") {
    return 200;
  }
  return STATUS_FOR_CODE[envelope.error.code] ?? 400;
}

const MAX_PER_PAGE = 100;

function positiveInteger(raw: string | null, fallback: number): number {
  if (raw === null || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : fallback;
}

function paginate<T>(
  rows: T[],
  url: URL,
  defaultPerPage = 25,
): { page: T[]; meta: Meta } {
  const page = positiveInteger(url.searchParams.get("page"), 1);
  const perPage = Math.min(
    MAX_PER_PAGE,
    positiveInteger(url.searchParams.get("per_page"), defaultPerPage),
  );
  const start = (page - 1) * perPage;
  return {
    page: rows.slice(start, start + perPage),
    meta: {
      page,
      per_page: perPage,
      total: rows.length,
      total_pages: Math.max(1, Math.ceil(rows.length / perPage)),
    },
  };
}

/* Idempotency: a repeated key returns the first result rather than acting
   twice. This is the behaviour the contract requires of every mutation. */
const idempotency = new Map<
  string,
  { bodyFingerprint: string; envelope: Envelope<unknown> }
>();

/* The whole body, canonically ordered. An array replacer would be applied at
   every depth and would erase everything below the top level, which is where
   a batch of enrolments differs. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function fingerprint(body: Record<string, unknown>): string {
  return JSON.stringify(canonical(body));
}

export type Replay = { envelope: Envelope<unknown>; replayed: boolean };

const SESSION: Session = {
  userId: "usr_lydia_ekuri",
  email: "operations@ekuri-initiative.ng",
  organisation: "Ekuri Initiative Limited",
  role: "developer",
  projectId: "proj_ekuri",
  emailVerified: true,
};

const REGISTRY_RECORD: RegistryRecord = {
  registryId: "GS-10342",
  registry: "Gold Standard",
  name: "Ekuri Community Forest Carbon Project",
  country: "Nigeria",
  methodology: "Gold Standard AR-ACM0003, afforestation and avoided deforestation",
  boundaryName: "Ekuri community forest, Akamkpa LGA, Cross River",
  issuances: [
    { vintage: "2024", credits: 41_200, retired: 38_900 },
    { vintage: "2025", credits: 58_400, retired: 51_100 },
    { vintage: "2026", credits: 63_900, retired: 22_400 },
  ],
};

function registerRows(): RegisterRow[] {
  return PROJECTS.map((project) => ({
    id: project.id,
    name: project.name,
    developerName: project.developerName,
    country: project.country,
    registry: project.registry,
    registryId: project.registryId,
    commitmentPct: project.commitment.percentage,
    enrolled: project.enrolled,
    paid: project.paid,
    lastClosedPeriod: project.lastClosedPeriod,
    openDisputes: project.openDisputes,
    status: project.status,
  }));
}

function rosterFor(projectId: string, url: URL): Participant[] {
  const project = projectById(projectId);
  const total = rosterSizeFor(projectId, project?.enrolled ?? 0);
  let rows = participants(projectId, total);

  const status = url.searchParams.get("status");
  const agent = url.searchParams.get("agent");
  const tier = url.searchParams.get("tier");
  const flagged = url.searchParams.get("flagged");
  const query = url.searchParams.get("q");

  if (status) {
    rows = rows.filter((row) => row.status === status);
  }
  if (agent) {
    rows = rows.filter((row) => row.agentId === agent);
  }
  if (tier) {
    rows = rows.filter((row) => String(row.tier) === tier);
  }
  if (flagged === "true") {
    rows = rows.filter((row) => row.flags.length > 0);
  }
  if (query) {
    const needle = query.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.community.toLowerCase().includes(needle),
    );
  }
  return rows;
}

function arithmeticFor(runId: string): Arithmetic {
  const run = RUNS.find((candidate) => candidate.id === runId) ?? RUNS[1];
  const project = projectById(run.projectId);
  const percentage = project?.commitment.percentage ?? 60;
  const required = multiplyAmount(run.declaredGross, percentage / 100);
  /* One household in eleven banks elsewhere, so the run carries that many
     interbank charges. The charge is matched to the amount by the schedule,
     never to a remembered band. */
  const interbankCount = Math.round(run.rosterSize / 11);
  const charge = chargeFor(AMOUNT_PER_HOUSEHOLD, "interbank");
  const estimatedCharges = multiplyAmount(charge.total, interbankCount);
  const totalNeeded = addAmounts(required, estimatedCharges);
  return {
    commitmentPct: percentage,
    declaredGross: run.declaredGross,
    required,
    estimatedCharges,
    totalNeeded,
    funded: run.fundingAmount,
    shortfall: subtractAmounts(totalNeeded, run.fundingAmount),
  };
}

function attestationById(id: string): Attestation | undefined {
  for (const project of PROJECTS) {
    const found = attestationsFor(project.id).find(
      (attestation) => attestation.id === id,
    );
    if (found) {
      return found;
    }
  }
  return undefined;
}

const EXTRACTION: ExtractionResult = {
  commitment: PROJECTS[0].commitment,
  sourceQuote: PROJECTS[0].commitment.sourceQuote,
  page: PROJECTS[0].commitment.page,
  confidence: PROJECTS[0].commitment.confidence,
};

const INVITE: Invite = {
  code: "inv_7KQ2M4",
  projectName: "Ekuri Community Forest Carbon Project",
  agentName: "Idongesit Ekpenyong",
  state: "valid",
  expiresAt: "2026-11-23T23:59:59Z",
};

function receiptFor(token: string): Receipt {
  const participant = participantAt("proj_ekuri", 330);
  return {
    token,
    participantName: participant.name,
    projectName: PROJECTS[0].name,
    payments: [
      {
        period: "2026-Q3",
        amount: AMOUNT_PER_HOUSEHOLD,
        settledAt: "2026-09-29T11:04:21Z",
        confirmedAt: "2026-09-30T07:12:00Z",
        sessionId: "000014260929110421004417",
      },
      {
        period: "2026-Q4",
        amount: AMOUNT_PER_HOUSEHOLD,
        settledAt: "2026-11-09T13:22:58Z",
        confirmedAt: null,
        sessionId: "000014261109142258104885",
      },
    ],
    disputeOpen: false,
  };
}

const DISCLOSURE: DisclosureBundle = {
  leaf: "7b41d0c2f6a9e85310bb4c7d2e91f0a6c5d83b42e7f1908a6cd25b3e47f0912a",
  proof: [
    "3f9c0a71e4b85d26c1f0a93b7d4e25608fa1c3d9b06e472f85a1cd30b9e74f62",
    "a1d47f02c93e65b8071da4f3e26c58901bd7a4e6f30c92b815e7d04a3fc61b28",
    "5e2b93c7041fa86d35b0c91e7d4a2b6083bd1c47e90a2f638d5bc1047e92a3f6",
  ],
  rootReference: "att_ekuri_2026q3",
  attestationId: "att_ekuri_2026q3",
  period: "2026-Q3",
  projectName: "Ekuri Community Forest Carbon Project",
};

type Handler = (context: {
  url: URL;
  segments: string[];
  method: string;
  body: Record<string, unknown>;
}) => Envelope<unknown>;

function notFound(): Envelope<never> {
  return failure("NOT_FOUND");
}

/* The route table. Each entry matches on method and a path pattern where a
   segment beginning with ":" is a parameter. */
const ROUTES: { method: string; pattern: string; handler: Handler }[] = [
  { method: "GET", pattern: "/api/auth/session", handler: () => success(SESSION) },
  {
    method: "POST",
    pattern: "/api/auth/signin",
    handler: () => success(SESSION, null, "Signed in"),
  },
  {
    method: "POST",
    pattern: "/api/auth/signup",
    handler: ({ body }) =>
      success(
        { ...SESSION, email: String(body.email ?? SESSION.email), emailVerified: false },
        null,
        "Verification email sent",
      ),
  },
  {
    method: "POST",
    pattern: "/api/auth/verify-email",
    handler: () => success({ verified: true }, null, "Email verified"),
  },
  {
    method: "POST",
    pattern: "/api/auth/reset/request",
    handler: () => success({ sent: true }, null, "Reset link sent"),
  },
  {
    method: "POST",
    pattern: "/api/auth/reset/confirm",
    handler: () => success({ reset: true }, null, "Password reset"),
  },
  { method: "GET", pattern: "/api/invites/:code", handler: ({ segments }) => success({ ...INVITE, code: segments[2] }) },
  {
    method: "POST",
    pattern: "/api/invites/:code/redeem",
    handler: ({ segments }) =>
      success({ ...INVITE, code: segments[2], state: "redeemed" as const }, null, "Invite redeemed"),
  },

  { method: "POST", pattern: "/api/projects/lookup", handler: () => success(REGISTRY_RECORD) },
  { method: "POST", pattern: "/api/projects", handler: () => success(PROJECTS[0], null, "Project created") },
  {
    method: "GET",
    pattern: "/api/projects/:id",
    handler: ({ segments }) => {
      const project = projectById(segments[2]);
      return project ? success(project) : notFound();
    },
  },
  { method: "POST", pattern: "/api/projects/:id/pdd", handler: () => success({ jobId: "job_extract_0041" }, null, "Extraction queued") },
  { method: "GET", pattern: "/api/projects/:id/extraction", handler: () => success(EXTRACTION) },
  {
    method: "PATCH",
    pattern: "/api/projects/:id/commitment",
    handler: ({ body }) =>
      success(
        {
          ...PROJECTS[0].commitment,
          corrected: true,
          correctionReason: String(body.reason ?? ""),
        },
        null,
        "Correction logged",
      ),
  },
  { method: "POST", pattern: "/api/projects/:id/register", handler: () => success({ registered: true, reference: "GS-10342" }) },
  {
    method: "GET",
    pattern: "/api/projects/:id/mrv",
    handler: ({ url }) => {
      const { page, meta } = paginate(
        [{ id: "mrv_2026h2", state: "verified", submittedAt: "2026-08-02T10:00:00Z" }],
        url,
      );
      return success(page, meta);
    },
  },
  { method: "POST", pattern: "/api/projects/:id/mrv", handler: () => success({ id: "mrv_2026h2", state: "submitted" }) },
  {
    method: "GET",
    pattern: "/api/projects/:id/certificates",
    handler: ({ url }) => {
      const { page, meta } = paginate(
        [{ id: "cert_2026_0041", vintage: "2026", credits: 22_400, retiredAt: "2026-10-18T09:00:00Z" }],
        url,
      );
      return success(page, meta);
    },
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/participants",
    handler: ({ segments, url }) => {
      const rows = rosterFor(segments[2], url);
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  { method: "POST", pattern: "/api/projects/:id/participants", handler: () => success({ imported: 184, failed: 6 }, null, "Import complete") },
  {
    method: "GET",
    pattern: "/api/participants/:id",
    handler: ({ segments }) => {
      const index = Number(segments[2].replace("ptc_", "")) - 1;
      if (!Number.isFinite(index) || index < 0) {
        return notFound();
      }
      return success(participantAt("proj_ekuri", index));
    },
  },
  {
    method: "PATCH",
    pattern: "/api/participants/:id",
    handler: ({ segments, body }) => {
      const index = Number(segments[2].replace("ptc_", "")) - 1;
      const participant = participantAt("proj_ekuri", Math.max(0, index));
      return success(
        {
          ...participant,
          phoneMasked: body.phone ? String(body.phone) : participant.phoneMasked,
          status: (body.status as Participant["status"]) ?? participant.status,
          statusReason: String(body.reason ?? participant.statusReason ?? ""),
        },
        null,
        "Change logged with its reason",
      );
    },
  },
  {
    method: "GET",
    pattern: "/api/participants/:id/payments",
    handler: ({ segments, url }) => {
      const index = Math.max(0, Number(segments[2].replace("ptc_", "")) - 1);
      const payments: Payment[] = [
        { runId: "run_2026q3", period: "2026-Q3" },
        { runId: "run_2026q4", period: "2026-Q4" },
      ]
        .map((entry) => {
          const transfer = transferAt(entry.runId, index, "proj_ekuri");
          return {
            transferId: transfer.id,
            period: entry.period,
            amount: transfer.amount,
            state: transfer.state,
            sessionId: transfer.sessionId,
            settledAt: transfer.settledAt,
            confirmedAt: transfer.confirmedAt,
            disputeId:
              DISPUTES.find((dispute) => dispute.transferId === transfer.id)?.id ?? null,
          };
        });
      const { page, meta } = paginate(payments, url);
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/participants/:id/name-check",
    handler: ({ segments }) => {
      const index = Math.max(0, Number(segments[2].replace("ptc_", "")) - 1);
      const participant = participantAt("proj_ekuri", index);
      return success({
        match: participant.nameMatch,
        accountName: participant.accountName,
        enrolledName: participant.name,
        bvnLastFour: participant.bvnLastFour,
        checkedAt: "2026-11-09T15:40:00Z",
      });
    },
  },
  {
    method: "DELETE",
    pattern: "/api/participants/:id",
    handler: () => failure("PARTICIPANT_DELETE_NOT_PERMITTED"),
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/agents",
    handler: ({ segments, url }) => {
      const { page, meta } = paginate(
        AGENTS.filter((agent) => agent.projectId === segments[2]),
        url,
      );
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/projects/:id/agents/invite",
    handler: ({ body }) =>
      success(
        { code: "inv_7KQ2M4", name: String(body.name ?? ""), email: String(body.email ?? "") },
        null,
        "Invite sent",
      ),
  },
  {
    method: "GET",
    pattern: "/api/agents/:id",
    handler: ({ segments }) => {
      const agent = AGENTS.find((candidate) => candidate.id === segments[2]);
      return agent ? success(agent) : notFound();
    },
  },
  {
    method: "PATCH",
    pattern: "/api/agents/:id",
    handler: ({ segments, body }) => {
      const agent = AGENTS.find((candidate) => candidate.id === segments[2]);
      if (!agent) {
        return notFound();
      }
      return success(
        { ...agent, status: (body.status as typeof agent.status) ?? agent.status },
        null,
        "Change logged with its reason",
      );
    },
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/runs",
    handler: ({ segments, url }) => {
      const { page, meta } = paginate(
        RUNS.filter((run) => run.projectId === segments[2]),
        url,
      );
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/projects/:id/runs",
    handler: ({ segments, body }) =>
      success(
        {
          ...RUNS[2],
          projectId: segments[2],
          period: String(body.period ?? "2026-Q4"),
          declaredGross: String(body.declaredGross ?? "0.00"),
          fundingAmount: String(body.fundingAmount ?? "0.00"),
          state: "awaiting-funding" as const,
        },
        null,
        "Run created",
      ),
  },
  {
    method: "GET",
    pattern: "/api/runs/:id",
    handler: ({ segments }) => {
      const run = RUNS.find((candidate) => candidate.id === segments[2]);
      return run ? success(run) : notFound();
    },
  },
  { method: "GET", pattern: "/api/runs/:id/arithmetic", handler: ({ segments }) => success(arithmeticFor(segments[2])) },
  {
    method: "POST",
    pattern: "/api/runs/:id/preflight",
    handler: () =>
      success({
        passed: false,
        exclusions: [
          { participantId: "ptc_000098", reason: "NAME_MISMATCH", detail: "The account resolves to a different holder." },
          { participantId: "ptc_000211", reason: "LIMIT_EXCEEDED", detail: "Tier 1 wallet below the payment amount." },
          { participantId: "ptc_000614", reason: "IDENTITY_DUPLICATE", detail: "A second enrolment carries the same verification number." },
        ],
      }),
  },
  {
    method: "POST",
    pattern: "/api/runs/:id/execute",
    handler: ({ segments }) =>
      success({ runId: segments[2], state: "executing" as const }, null, "Run submitted as a bulk transfer"),
  },
  {
    method: "POST",
    pattern: "/api/runs/:id/retry",
    handler: ({ body }) =>
      success({ retried: 42, failureClass: String(body.failureClass ?? "") }, null, "Retry queued"),
  },
  {
    method: "POST",
    pattern: "/api/runs/:id/requery",
    handler: ({ body }) =>
      success(
        { transferId: body.transferId ?? null, state: "settled" as const, sessionId: "000014261109142207104883" },
        null,
        "Requeried. Nothing was resent.",
      ),
  },
  { method: "POST", pattern: "/api/runs/:id/cancel", handler: ({ segments }) => success({ runId: segments[2], state: "cancelled" as const }) },
  {
    method: "GET",
    pattern: "/api/runs/:id/transfers",
    handler: ({ segments, url }) => {
      const run = RUNS.find((candidate) => candidate.id === segments[2]);
      if (!run) {
        return notFound();
      }
      const count = rosterSizeFor(run.projectId, run.rosterSize);
      const rows = runTransfers(run.id, run.projectId, count);
      const { page, meta } = paginate(rows, url, 50);
      return success(page, meta);
    },
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/funding",
    handler: ({ segments }) => {
      const project = projectById(segments[2]);
      const period = project?.periods.find((candidate) => candidate.state === "open");
      /* The open period's run is what the account is funding. Picking the
         first run of the project would report a historical figure. */
      const openRun = RUNS.find(
        (candidate) =>
          candidate.projectId === segments[2] &&
          candidate.period === period?.period &&
          candidate.state !== "draft",
      );
      const inbound = openRun
        ? [
            {
              reference: `FND-${openRun.period}-001`,
              amount: multiplyAmount(openRun.fundingAmount, 0.64),
              receivedAt: "2026-11-02T10:14:00Z",
            },
            {
              reference: `FND-${openRun.period}-002`,
              amount: subtractAmounts(
                openRun.fundingAmount,
                multiplyAmount(openRun.fundingAmount, 0.64),
              ),
              receivedAt: "2026-11-07T09:02:00Z",
            },
          ]
        : [];
      const spent = period
        ? addAmounts(period.amountToHouseholds, period.chargesBorne)
        : "0.00";
      return success({
        accountNumber: "0123987001",
        accountName: "EKURI INITIATIVE LIMITED DISBURSEMENT",
        bank: "Access Bank",
        inbound,
        funded: openRun?.fundingAmount ?? "0.00",
        outbound: period?.amountToHouseholds ?? "0.00",
        charges: period?.chargesBorne ?? "0.00",
        balance: subtractAmounts(openRun?.fundingAmount ?? "0.00", spent),
      });
    },
  },
  {
    method: "GET",
    pattern: "/api/projects/:id/reconciliation",
    handler: ({ segments, url }) => {
      const { page, meta } = paginate(
        RECONCILIATIONS.filter((row) => row.projectId === segments[2]),
        url,
      );
      return success(page, meta);
    },
  },
  { method: "GET", pattern: "/api/tariff", handler: () => success(TARIFF) },

  {
    method: "GET",
    pattern: "/api/projects/:id/disputes",
    handler: ({ segments, url }) => {
      const rows = DISPUTES.filter((dispute) => dispute.projectId === segments[2]);
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/disputes/:id",
    handler: ({ segments }) => {
      const dispute = DISPUTES.find((candidate) => candidate.id === segments[2]);
      return dispute ? success(dispute) : notFound();
    },
  },
  {
    method: "POST",
    pattern: "/api/disputes/:id/respond",
    handler: ({ segments, body }) => {
      const dispute = DISPUTES.find((candidate) => candidate.id === segments[2]);
      if (!dispute) {
        return notFound();
      }
      return success(
        {
          ...dispute,
          state: "developer-responded" as const,
          responses: [
            ...dispute.responses,
            {
              at: "2026-11-09T16:00:00Z",
              author: "Ekuri Initiative Limited",
              body: String(body.body ?? ""),
            },
          ],
        },
        null,
        "Response logged",
      );
    },
  },
  {
    method: "POST",
    pattern: "/api/disputes",
    handler: ({ body }) =>
      success(
        {
          id: "dsp_0006",
          projectId: String(body.projectId ?? "proj_ekuri"),
          category: String(body.category ?? "not-received"),
          state: "open" as const,
          raisedAt: "2026-11-09T16:04:00Z",
          acknowledgement:
            "The claim is checked against the transfers recorded for that period. A reply is sent to the number it was raised from within five working days.",
        },
        null,
        "Dispute filed",
      ),
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/attestations",
    handler: ({ segments, url }) => {
      const { page, meta } = paginate(attestationsFor(segments[2]), url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/attestations/:id",
    handler: ({ segments }) => {
      const attestation = attestationById(segments[2]);
      return attestation ? success(attestation) : notFound();
    },
  },
  {
    method: "POST",
    pattern: "/api/attestations/:id/disclosure",
    handler: ({ segments }) => success({ ...DISCLOSURE, attestationId: segments[2] }),
  },
  {
    method: "POST",
    pattern: "/api/verify/attestation",
    handler: ({ body }) => {
      const hash = String(body.hash ?? "");
      const attestation = PROJECTS.flatMap((project) => attestationsFor(project.id)).find(
        (candidate) => candidate.hash === hash,
      );
      return success({
        outcome: attestation ? ("match" as const) : ("no-match" as const),
        attestation: attestation ?? null,
        checkedAt: "2026-11-09T16:10:00Z",
      });
    },
  },
  {
    method: "POST",
    pattern: "/api/verify/disclosure",
    handler: ({ body }) => {
      const bundle = body.bundle as Partial<DisclosureBundle> | undefined;
      const matched = bundle?.leaf === DISCLOSURE.leaf;
      return success({
        outcome: matched ? ("match" as const) : ("no-match" as const),
        period: matched ? DISCLOSURE.period : null,
        projectName: matched ? DISCLOSURE.projectName : null,
        anchorReachable: true,
        checkedAt: "2026-11-09T16:12:00Z",
      });
    },
  },

  { method: "POST", pattern: "/api/field/device/bind", handler: () => success({ bound: true, deviceId: "dev_9f41" }, null, "Device bound") },
  {
    method: "POST",
    pattern: "/api/field/enrolments",
    handler: ({ body }) => {
      const items = Array.isArray(body.items) ? body.items : [];
      return success(
        items.map((item, index) => {
          const record = item as { clientUuid?: string };
          const failed = index % 9 === 4;
          return {
            clientUuid: record.clientUuid ?? `uuid_${index}`,
            accepted: !failed,
            code: failed ? ("NAME_MISMATCH" as const) : null,
            enrolmentId: failed ? null : `enr_${String(index + 1).padStart(6, "0")}`,
          };
        }),
        null,
        "Batch processed with per-item results",
      );
    },
  },
  {
    method: "GET",
    pattern: "/api/field/enrolments/:id",
    handler: ({ segments }) =>
      success({
        id: segments[3],
        participant: participantAt("proj_ekuri", 41),
        capturedAt: "2026-11-09T09:14:02Z",
        syncedAt: "2026-11-09T11:40:55Z",
        location: { recorded: true, boundary: "inside" as const },
        editable: false,
      }),
  },
  {
    method: "GET",
    pattern: "/api/field/me",
    handler: () =>
      success({
        agent: AGENTS[2],
        today: { captured: 14, queued: 3, target: 20 },
      }),
  },

  {
    method: "GET",
    pattern: "/api/public/register",
    handler: ({ url }) => {
      let rows = registerRows();
      const query = url.searchParams.get("q");
      const country = url.searchParams.get("country");
      const sort = url.searchParams.get("sort");
      if (query) {
        const needle = query.toLowerCase();
        rows = rows.filter(
          (row) =>
            row.name.toLowerCase().includes(needle) ||
            row.developerName.toLowerCase().includes(needle) ||
            row.registryId.toLowerCase().includes(needle),
        );
      }
      if (country) {
        rows = rows.filter((row) => row.country === country);
      }
      if (sort === "coverage") {
        rows = [...rows].sort(
          (left, right) =>
            right.paid / Math.max(1, right.enrolled) -
            left.paid / Math.max(1, left.enrolled),
        );
      }
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/public/projects/:id",
    handler: ({ segments }) => {
      const project = projectById(segments[3]);
      if (!project) {
        return notFound();
      }
      return success({
        project,
        attestations: attestationsFor(project.id),
        disputes: {
          open: project.openDisputes,
          substantiated: project.substantiatedDisputes,
        },
        signals: project.signalCount,
      });
    },
  },
  {
    method: "GET",
    pattern: "/api/public/developers/:id",
    handler: ({ segments }) => {
      const projects = PROJECTS.filter((project) => project.developerId === segments[3]);
      if (projects.length === 0) {
        return notFound();
      }
      const enrolled = projects.reduce((sum, project) => sum + project.enrolled, 0);
      const paid = projects.reduce((sum, project) => sum + project.paid, 0);
      return success({
        developerId: segments[3],
        developerName: projects[0].developerName,
        projects,
        aggregate: { enrolled, paid },
      });
    },
  },
  {
    method: "GET",
    pattern: "/api/public/attestations/:id",
    handler: ({ segments }) => {
      const attestation = attestationById(segments[3]);
      return attestation ? success(attestation) : notFound();
    },
  },
  {
    method: "GET",
    pattern: "/api/public/projects/:id/geography",
    handler: ({ segments }) => success({ buckets: geography(segments[3]), resolution: 7 }),
  },

  {
    method: "GET",
    pattern: "/api/verifier/watchlist",
    handler: ({ url }) => {
      const { page, meta } = paginate(registerRows().slice(0, 2), url);
      return success(page, meta);
    },
  },
  { method: "POST", pattern: "/api/verifier/watchlist", handler: ({ body }) => success({ projectId: String(body.projectId ?? ""), watched: true }) },
  {
    method: "GET",
    pattern: "/api/verifier/projects/:id",
    handler: ({ segments }) => {
      const project = projectById(segments[3]);
      if (!project) {
        return notFound();
      }
      return success({
        project,
        attestations: attestationsFor(project.id),
        signalsByClass: SIGNALS.filter((signal) => signal.projectId === project.id).reduce<
          Record<string, number>
        >((counts, signal) => {
          counts[signal.class] = (counts[signal.class] ?? 0) + 1;
          return counts;
        }, {}),
        agentFlagRates: AGENTS.filter((agent) => agent.projectId === project.id).map(
          (agent) => ({ agentId: agent.id, flagRate: agent.flagRate }),
        ),
        geography: geography(project.id),
      });
    },
  },
  {
    method: "GET",
    pattern: "/api/verifier/compare",
    handler: ({ url }) => {
      const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
      const projects = ids
        .map((id) => projectById(id))
        .filter((project) => project !== undefined);
      const periods = projects.map((project) =>
        project.periods.filter((period) => period.state !== "open").map((period) => period.period),
      );
      const shared = periods.reduce<string[]>(
        (common, list) => common.filter((period) => list.includes(period)),
        periods[0] ?? [],
      );
      return success({ projects, comparablePeriods: shared });
    },
  },
  {
    method: "POST",
    pattern: "/api/verifier/export",
    handler: ({ body }) =>
      success(
        {
          exportId: "exp_0041",
          format: String(body.format ?? "csv"),
          state: "ready" as const,
        },
        null,
        "Export ready",
      ),
  },
  {
    method: "GET",
    pattern: "/api/verifier/alerts",
    handler: ({ url }) => {
      const rows = [
        {
          id: "alr_0001",
          projectId: "proj_delta",
          condition: "coverage-below",
          threshold: 0.5,
          firedAt: "2026-10-02T11:20:00Z",
          record: "att_delta_2026q3",
        },
      ];
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/verifier/alerts",
    handler: ({ body }) =>
      success(
        {
          id: "alr_0002",
          projectId: String(body.projectId ?? ""),
          condition: String(body.condition ?? "coverage-below"),
          threshold: Number(body.threshold ?? 0.5),
          firedAt: null,
          record: null,
        },
        null,
        "Alert configured",
      ),
  },

  {
    method: "GET",
    pattern: "/api/ops/signals",
    handler: ({ url }) => {
      let rows = SIGNALS;
      const signalClass = url.searchParams.get("class");
      const severity = url.searchParams.get("severity");
      if (signalClass) {
        rows = rows.filter((signal) => signal.class === signalClass);
      }
      if (severity) {
        rows = rows.filter((signal) => signal.severity === severity);
      }
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/ops/signals/:id",
    handler: ({ segments }) => {
      const signal = SIGNALS.find((candidate) => candidate.id === segments[3]);
      return signal ? success(signal) : notFound();
    },
  },
  {
    method: "GET",
    pattern: "/api/ops/signals/:id/graph",
    handler: ({ segments }) => success(accountGraph(segments[3])),
  },
  { method: "GET", pattern: "/api/ops/cases", handler: ({ url }) => {
    const { page, meta } = paginate(CASES, url);
    return success(page, meta);
  } },
  {
    method: "POST",
    pattern: "/api/ops/cases/:id/action",
    handler: ({ segments, body }) => {
      const openCase = CASES.find((candidate) => candidate.id === segments[3]);
      if (!openCase) {
        return notFound();
      }
      return success(
        {
          ...openCase,
          actions: [
            ...openCase.actions,
            {
              at: "2026-11-09T16:20:00Z",
              action: String(body.action ?? ""),
              note: String(body.note ?? ""),
              by: "Operations, Access Bank",
            },
          ],
        },
        null,
        "Action recorded",
      );
    },
  },
  { method: "GET", pattern: "/api/ops/exceptions", handler: ({ url }) => {
    const { page, meta } = paginate(EXCEPTIONS, url);
    return success(page, meta);
  } },
  {
    method: "GET",
    pattern: "/api/ops/reconciliation",
    handler: ({ url }) => {
      const { page, meta } = paginate(RECONCILIATIONS, url);
      return success(page, meta);
    },
  },

  /* Inbound. The participant channel's callbacks and the delivery reports. */
  {
    method: "POST",
    pattern: "/api/webhooks/ussd",
    handler: ({ body }) =>
      success(
        {
          sessionId: String(body.sessionId ?? "ussd_0001"),
          response:
            "CON Attest\n1. My last payment\n2. Confirm I received it\n3. Report a problem",
          continues: true,
        },
        null,
        "USSD session handled",
      ),
  },
  {
    method: "POST",
    pattern: "/api/webhooks/sms-inbound",
    handler: ({ body }) =>
      success(
        {
          from: String(body.from ?? "+2348030000000"),
          keyword: String(body.text ?? "CONFIRM").split(" ")[0].toUpperCase(),
          handled: true,
        },
        null,
        "Inbound message handled",
      ),
  },
  {
    method: "POST",
    pattern: "/api/webhooks/sms-delivery",
    handler: ({ body }) =>
      success(
        {
          messageId: String(body.id ?? "sms_0001"),
          status: String(body.status ?? "Success"),
          recorded: true,
        },
        null,
        "Delivery report recorded",
      ),
  },

  { method: "GET", pattern: "/api/receipt/:token", handler: ({ segments }) => success(receiptFor(segments[2])) },
  {
    method: "POST",
    pattern: "/api/receipt/:token/confirm",
    handler: () =>
      success({ confirmedAt: "2026-11-09T16:30:00Z" }, null, "Payment confirmed"),
  },
  {
    method: "POST",
    pattern: "/api/receipt/:token/dispute",
    handler: ({ body }) =>
      success(
        {
          disputeId: "dsp_0007",
          category: String(body.category ?? "not-received"),
          raisedAt: "2026-11-09T16:32:00Z",
        },
        null,
        "Dispute filed",
      ),
  },
];

function matches(pattern: string, segments: string[]): boolean {
  const parts = pattern.split("/").filter(Boolean);
  if (parts.length !== segments.length) {
    return false;
  }
  return parts.every(
    (part, index) => part.startsWith(":") || part === segments[index],
  );
}

/** Dispatches one request against the contract. */
export function handle(
  method: string,
  url: URL,
  body: Record<string, unknown>,
  headers: { idempotencyKey: string | null },
): Replay {
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean);

  const forced = readForced(path);
  if (forced) {
    return { envelope: failure(forced), replayed: false };
  }

  const mutating = method !== "GET";
  const key = headers.idempotencyKey
    ? `${method}:${path}:${headers.idempotencyKey}`
    : null;
  const mark = fingerprint(body);

  if (key && mutating) {
    const cached = idempotency.get(key);
    if (cached) {
      /* Same key and body replays the original response; same key with a
         different body is a conflict, per backend section 3. */
      return cached.bodyFingerprint === mark
        ? { envelope: cached.envelope, replayed: true }
        : { envelope: failure("DUPLICATE_REQUEST"), replayed: false };
    }
  }

  const route = ROUTES.find(
    (candidate) => candidate.method === method && matches(candidate.pattern, segments),
  );
  if (!route) {
    return { envelope: notFound(), replayed: false };
  }

  const envelope = route.handler({ url, segments, method, body });

  if (key && mutating) {
    idempotency.set(key, { bodyFingerprint: mark, envelope });
  }
  return { envelope, replayed: false };
}
