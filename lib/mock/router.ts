import { NOTIFICATION_EVENTS } from "@/lib/api/contract";
import type {
  ApiKey,
  VerifierKey,
  ChainCheck,
  ExtractionReview,
  OnboardingReview,
  RegistrySync,
  Arithmetic,
  Attestation,
  ConsoleRole,
  ConsoleUser,
  NotificationEvent,
  WebhookEndpoint,
  Payment,
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
  BenefitSharingReport,
} from "@/lib/api/contract";
import { ERROR_COPY } from "@/lib/mock/errors";
import { maskPhone } from "@/lib/record";
import {
  readForced,
  opsEmpty,
  projectStatusFor,
  registerSizeFor,
  rosterSizeFor, adminEmpty} from "@/lib/mock/forced";
import { depthOf, foldProof, leafFor } from "@/lib/mock/merkle";
import {
  AGENTS,
  AMOUNT_PER_HOUSEHOLD,
  API_KEYS,
  CONSOLE_USERS,
  WEBHOOK_ENDPOINTS,
  importJob,
  importsFor,
  notificationPreferences,
  setNotificationPreferences,
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
  leafCountFor,
  multiplyAmount,
  participantAt,
  participants,
  projectById,
  disclosureFor,
  leavesFor,
  runForPeriod,
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
  BOUNDARY_NOT_AVAILABLE: 404,
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

/* Plan Vivo, per spec patch 02: the demo project sits in the segment the
   product is for — community-led land-based projects where a revenue share
   to households is a certification requirement — and a Plan Vivo PDD always
   states the commitment the extraction service exists to find. Plan Vivo
   issues onto the Markit registry, which is public, so issuance history
   stays fetchable; boundaries are not exposed through an API, so this record
   carries none and onboarding offers the KML upload path. */
const REGISTRY_RECORD: RegistryRecord = {
  registryId: "PV-2314",
  registry: "Plan Vivo",
  name: "Ekuri Community Forest Carbon Project",
  country: "Nigeria",
  methodology: "Plan Vivo community forest management and agroforestry",
  boundaryName: null,
  issuances: [
    { vintage: "2024", credits: 41_200, retired: 38_900 },
    { vintage: "2025", credits: 58_400, retired: 51_100 },
    { vintage: "2026", credits: 63_900, retired: 22_400 },
  ],
};

function registerRows(): RegisterRow[] {
  const seeded = PROJECTS.map((project) => {
    /* The period the row names, and its own figures. */
    const closed = project.periods.filter((period) => period.state !== "open");
    const last = closed.length > 0 ? closed[closed.length - 1] : null;
    return {
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
    lastClosedPaid: last?.paid ?? 0,
    lastClosedEnrolled: last?.enrolled ?? 0,
    lastClosedConfirmationRate: last?.confirmationRate ?? 0,
    openDisputes: project.openDisputes,
    status: projectStatusFor(project.id, project.status) as RegisterRow["status"],
    };
  });

  const total = registerSizeFor(seeded.length);
  if (total === 0) {
    /* An empty register is a state the index has to show, so zero means zero
       rather than "unset". */
    return [];
  }
  if (total <= seeded.length) {
    return seeded.slice(0, total);
  }

  /* Padding projects, so the index can be profiled at the size the register
     will reach. Each is derived from a seeded one, so every figure on it is
     still a figure the fixture supports. */
  return Array.from({ length: total }, (_, index) => {
    if (index < seeded.length) {
      return seeded[index];
    }
    const base = seeded[index % seeded.length];
    const participant = participantAt(base.id, index);
    return {
      ...base,
      id: `${base.id}_${index}`,
      name: `${participant.community} Community Carbon Project`,
      developerName: `${participant.community} Community Trust`,
      registryId: `GS-${11_000 + index}`,
    };
  });
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
  /* Every column the strip row shows is filterable, the wallet, the phone and
     the enrolment date among them. */
  const wallet = url.searchParams.get("wallet");
  const phone = url.searchParams.get("phone");
  const enrolledFrom = url.searchParams.get("enrolled_from");
  const enrolledTo = url.searchParams.get("enrolled_to");

  if (wallet) {
    rows = rows.filter((row) => row.walletState === wallet);
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    rows = rows.filter((row) => row.phoneMasked.replace(/\D/g, "").includes(digits));
  }
  if (enrolledFrom) {
    rows = rows.filter((row) => row.enrolledAt >= enrolledFrom);
  }
  if (enrolledTo) {
    rows = rows.filter((row) => row.enrolledAt <= `${enrolledTo}T23:59:59Z`);
  }

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

function arithmeticFor(runId: string): Arithmetic | null {
  const run = RUNS.find((candidate) => candidate.id === runId);
  if (!run) {
    return null;
  }
  const project = projectById(run.projectId);
  const percentage = project?.commitment.percentage ?? 60;
  const required = multiplyAmount(run.declaredGross, percentage / 100);
  /* One household in eleven banks elsewhere, so the run carries that many
     interbank charges. The charge is matched to the amount by the schedule,
     never to a remembered band. */
  /* A run that has not executed has no transfers yet, so the estimate is over
     the roster it would pay rather than over nothing. */
  const payable = run.rosterSize > 0 ? run.rosterSize : (project?.enrolled ?? 0);
  const interbankCount = Math.round(payable / 11);
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

const RECEIPT_TOKENS: Record<string, { projectId: string; index: number }> = {
  rct_ngozi_eyo_2026q4: { projectId: "proj_ekuri", index: 330 },
  rct_adaeze_okonkwo_2026q4: { projectId: "proj_ekuri", index: 0 },
  rct_unpaid_2026q4: { projectId: "proj_oban", index: 4 },
};

function receiptFor(token: string): Receipt | null {
  const entry = RECEIPT_TOKENS[token];
  if (!entry) {
    return null;
  }
  const participant = participantAt(entry.projectId, entry.index);
  /* A household enrolled in a project that has paid nobody has a receipt with
     no payments on it, which is its own state and not an error. */
  if (entry.projectId === "proj_oban") {
    return {
      token,
      participantName: participant.name,
      projectName: projectById(entry.projectId)?.name ?? "",
      payments: [],
      disputeOpen: false,
    };
  }
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


/* A leaf that exists in a period other than the one the bundle names. */
function isLeafOfAnotherPeriod(leaf: string, rootReference: string): boolean {
  for (const project of PROJECTS) {
    for (const period of project.periods) {
      if (period.attestationId === rootReference) {
        continue;
      }
      const periodRun = runForPeriod(project.id, period.period);
      if (!periodRun) {
        continue;
      }
      if (leavesFor(periodRun.id, project.id, periodRun.rosterSize).includes(leaf)) {
        return true;
      }
    }
  }
  return false;
}

/* An anchor that has not landed, one that cannot be reached, and a chain that
   does not join are facts about a record rather than failures to read it, so
   forcing one returns the record carrying that state. */
/* Codes that describe a record rather than a failure to produce one. The
   endpoint answers with the record carrying the state, because a screen that
   collapses to a notice shows a reader none of what the state is about. */
const RECORD_STATES = new Set([
  "ANCHOR_PENDING",
  "ANCHOR_UNREACHABLE",
  "CHAIN_DISCONTINUITY",
  "RECONCILIATION_MISMATCH",
]);

function withRecordState(attestation: Attestation, code: ErrorCode): Attestation {
  if (code === "ANCHOR_PENDING") {
    return {
      ...attestation,
      anchorState: "pending",
      anchor: { ...attestation.anchor, sequence: null, at: null },
    };
  }
  if (code === "ANCHOR_UNREACHABLE") {
    return { ...attestation, anchorState: "unreachable" };
  }
  if (code === "CHAIN_DISCONTINUITY") {
    return { ...attestation, chainBreak: true };
  }
  /* RECONCILIATION_MISMATCH is about the money, not the chain. The earlier
     fallthrough fabricated a chain break for it, which is a worse record
     than the one being forced. The reconciliation endpoint reads the code
     itself; the record passes through unchanged. */
  return attestation;
}

type Handler = (context: {
  url: URL;
  segments: string[];
  method: string;
  body: Record<string, unknown>;
  /** A forced code that the endpoint answers with rather than fails on. */
  forced: ErrorCode | null;
}) => Envelope<unknown>;

/* Identifiers are minted from a counter rather than from a list's length, so
   removing one and adding another does not reissue an identifier that has
   already been used. */
let userCounter = 0;
let keyCounter = 0;

function nextUserNumber(): number {
  userCounter = Math.max(userCounter + 1, CONSOLE_USERS.length + 1);
  return userCounter;
}

function nextKeyNumber(): number {
  keyCounter = Math.max(keyCounter + 1, API_KEYS.length + 1);
  return keyCounter;
}

function randomHex(length: number): string {
  let out = "";
  while (out.length < length) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out.slice(0, length);
}

/* The contract has no code for this, and FORBIDDEN's own copy — "ask an
   administrator to grant access" — is absurd said to the only administrator.
   The code is the contract's; the words are this constraint's. */
function lastAdmin(field: string): Envelope<never> {
  return {
    status: "error",
    error: {
      code: "FORBIDDEN",
      message: "You are the only administrator on this project.",
      field,
      remediation:
        "Add another administrator first. A project with nobody who can grant the role is a project nobody can administer.",
    },
    request_id: requestId(),
  };
}

/* What pre-flight finds on this project's roster: an account that resolves to
   another holder, a wallet below the payment amount, and a second enrolment
   on one verification number. */
const PREFLIGHT_EXCLUSIONS: { participantId: string; reason: ErrorCode; detail: string }[] = [
  {
    participantId: "ptc_000098",
    reason: "NAME_MISMATCH",
    detail: "The account resolves to a different holder.",
  },
  {
    participantId: "ptc_000211",
    reason: "LIMIT_EXCEEDED",
    detail: "A tier 1 wallet takes less in a day than this payment.",
  },
  {
    participantId: "ptc_000614",
    reason: "IDENTITY_DUPLICATE",
    detail: "A second enrolment carries the same verification number.",
  },
];

/* What the field endpoint has accepted, by the client UUID the device
   minted. The real backend holds this in a table with a unique index; here it
   is a map, and it is what makes the batch idempotent rather than merely
   described as idempotent. */
const enrolled = new Map<
  string,
  { clientUuid: string; accepted: boolean; code: ErrorCode | null; enrolmentId: string | null }
>();

/* The four actions this console may take on a case, and one more the desk
   takes when it has decided. Anything else is not an action. */
/* The reader's own watchlist, which holds across requests. */
const watchlist = new Set<string>(["proj_ekuri", "proj_hadejia"]);

/* The keys this reader has issued. Only the prefix is kept, as everywhere
   else a key is issued in this product. */
const verifierKeys: VerifierKey[] = [];

const CASE_ACTIONS = [
  "freeze",
  "documentation",
  "escalate",
  "clear",
  "substantiate",
] as const;

const exclusionsByRun = new Map<string, Set<string>>();

function confirmExclusion(runId: string, participantId: string): void {
  const current = exclusionsByRun.get(runId) ?? new Set<string>();
  current.add(participantId);
  exclusionsByRun.set(runId, current);
}

function confirmedExclusions(runId: string): Set<string> {
  return exclusionsByRun.get(runId) ?? new Set<string>();
}

function notFound(): Envelope<never> {
  return failure("NOT_FOUND");
}

/* The route table. Each entry matches on method and a path pattern where a
   segment beginning with ":" is a parameter. */
/* The onboarding queue, held at module scope rather than rebuilt per
   request: a review that cannot be seen to have happened is a list, not a
   queue. A decision here mutates these rows, which is what the reviewer sees
   when the screen refreshes. */
const ONBOARDING_REVIEWS: (OnboardingReview & {
  decidedNote: string | null;
  decidedAt: string | null;
})[] = [

        {
          projectId: "proj_oban",
          projectName: "Oban Hills Community Forest Project",
          developerName: "Oban Hills Conservation Trust",
          registry: "Plan Vivo",
          registryId: "PV-2291",
          state: "awaiting-review",
          submittedAt: "2026-11-08T14:20:00Z",
          outstanding: ["Nothing. The registry record matches and the account is verified."],
          manualEntry: false,
          decidedNote: null,
          decidedAt: null,
        },
        {
          projectId: "proj_hadejia",
          projectName: "Hadejia Wetlands Restoration",
          developerName: "Hadejia Basin Trust",
          registry: "Verra",
          registryId: "VCS-1842",
          state: "registry-unverified",
          submittedAt: "2026-11-06T09:00:00Z",
          outstanding: [
            "The registry did not answer and the details were entered by hand.",
            "Check the name, the country and the methodology against the registry's own page before this is published.",
          ],
          manualEntry: true,
          decidedNote: null,
          decidedAt: null,
        },
        {
          projectId: "proj_delta",
          projectName: "Akassa Mangrove Carbon Project",
          developerName: "Delta Blue Carbon Limited",
          registry: "Gold Standard",
          registryId: "GS-11903",
          state: "kyb-outstanding",
          submittedAt: "2026-10-30T11:40:00Z",
          outstanding: ["The bank has not answered on the organisation's verification."],
          manualEntry: false,
          decidedNote: null,
          decidedAt: null,
        },
];

/* Likewise the extraction queue. */
const EXTRACTION_REVIEWS: ExtractionReview[] = [

        {
          projectId: "proj_hadejia",
          projectName: "Hadejia Wetlands Restoration",
          field: "percentage",
          extracted: "45",
          confidence: 0.61,
          sourceQuote:
            "The project shall distribute not less than forty-five per centum of net proceeds to participating households, assessed annually.",
          page: 31,
          decision: null,
        },
        {
          projectId: "proj_delta",
          projectName: "Akassa Mangrove Carbon Project",
          field: "basis",
          extracted: "gross",
          confidence: 0.58,
          sourceQuote:
            "Benefit sharing is calculated on revenue received, before deduction of verification and monitoring costs.",
          page: 18,
          decision: {
            at: "2026-11-02T10:12:00Z",
            by: "Platform review",
            accepted: true,
            corrected: null,
          },
        },
];

/* Registry sync, held at module scope so a re-sync an operator asks for has
   somewhere to land. */
const REGISTRY_SYNC: RegistrySync[] = [

        {
          registry: "Gold Standard",
          lastSyncedAt: "2026-11-10T06:00:00Z",
          projects: 2,
          state: "synced" as const,
          failures: [],
        },
        {
          registry: "Verra",
          lastSyncedAt: "2026-11-04T06:00:00Z",
          projects: 1,
          state: "failing" as const,
          failures: [
            {
              at: "2026-11-10T06:00:04Z",
              registryId: "VCS-1842",
              reason: "The registry answered 503 on four consecutive attempts.",
            },
            {
              at: "2026-11-09T06:00:03Z",
              registryId: "VCS-1842",
              reason: "The registry answered 503 on four consecutive attempts.",
            },
          ],
        },
        {
          registry: "Plan Vivo",
          lastSyncedAt: "2026-11-09T06:00:00Z",
          projects: 1,
          state: "stale" as const,
          failures: [],
        },
      ];

/* Which escalations the platform decided in this process, so the admin list
   can keep showing them, and the dev reset can undo them. */
const DECIDED_ESCALATIONS = new Set<string>();

/* Pristine copies, taken before anything mutates. The admin queues are
   mutated in place by decisions — which is what makes a decision visible —
   and without a way back, every state the dev panel names is one-shot: taken
   once, gone until the process restarts. */
const PRISTINE_ADMIN = {
  onboarding: JSON.parse(JSON.stringify(ONBOARDING_REVIEWS)) as typeof ONBOARDING_REVIEWS,
  extraction: JSON.parse(JSON.stringify(EXTRACTION_REVIEWS)) as typeof EXTRACTION_REVIEWS,
  registry: JSON.parse(JSON.stringify(REGISTRY_SYNC)) as typeof REGISTRY_SYNC,
  escalated: JSON.parse(
    JSON.stringify(DISPUTES.filter((dispute) => dispute.state === "escalated")),
  ) as typeof DISPUTES,
};

export function resetAdminQueues(): void {
  ONBOARDING_REVIEWS.splice(
    0,
    ONBOARDING_REVIEWS.length,
    ...(JSON.parse(JSON.stringify(PRISTINE_ADMIN.onboarding)) as typeof ONBOARDING_REVIEWS),
  );
  EXTRACTION_REVIEWS.splice(
    0,
    EXTRACTION_REVIEWS.length,
    ...(JSON.parse(JSON.stringify(PRISTINE_ADMIN.extraction)) as typeof EXTRACTION_REVIEWS),
  );
  REGISTRY_SYNC.splice(
    0,
    REGISTRY_SYNC.length,
    ...(JSON.parse(JSON.stringify(PRISTINE_ADMIN.registry)) as typeof REGISTRY_SYNC),
  );
  for (const pristine of PRISTINE_ADMIN.escalated) {
    const live = DISPUTES.find((dispute) => dispute.id === pristine.id);
    if (live) {
      live.state = pristine.state;
      live.resolutionBasis = pristine.resolutionBasis;
      live.updatedAt = pristine.updatedAt;
    }
  }
  DECIDED_ESCALATIONS.clear();
}

const ROUTES: { method: string; pattern: string; handler: Handler }[] = [
  { method: "GET", pattern: "/api/auth/session", handler: () => success(SESSION) },
  {
    method: "POST",
    pattern: "/api/auth/signin",
    handler: ({ body }) => {
      /* An address that has not been verified signs in and is told so, rather
         than being refused: the account exists and the address is the thing
         outstanding. The trigger is the address itself, so the state is
         reachable by typing one. */
      const email = String(body.email ?? SESSION.email);
      return success(
        {
          ...SESSION,
          email,
          emailVerified: !/^unverified/i.test(email),
        },
        null,
        "Signed in",
      );
    },
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
    handler: ({ body }) => {
      const token = String(body.token ?? "");
      if (token.length === 0) {
        return failure("INVALID_REQUEST", "token");
      }
      /* A link older than a day is expired, which is a different answer from
         a link that was never valid. */
      if (/expired/i.test(token)) {
        return failure("TOKEN_EXPIRED", "token");
      }
      if (/unknown|invalid/i.test(token)) {
        return failure("NOT_FOUND", "token");
      }
      return success({ verified: true }, null, "Email verified");
    },
  },
  {
    /* Not in backend 4.3: a verification link expires and the reader needs
       another without an account to sign in to. Recorded in BUILD_LOG.md. */
    method: "POST",
    pattern: "/api/auth/resend-verification",
    handler: ({ body }) => {
      const email = String(body.email ?? "");
      if (!/.+@.+\..+/.test(email)) {
        return failure("INVALID_REQUEST", "email");
      }
      return success({ sent: true, email }, null, "Verification link sent");
    },
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
  {
    method: "GET",
    pattern: "/api/invites/:code",
    handler: ({ segments }) => {
      const code = segments[2];
      /* An invitation's state is a fact about the code, so the code carries
         it: the real backend reads it from the row, and here it is read from
         the identifier, which keeps every state reachable by opening a link
         rather than by editing a fixture. */
      const state: Invite["state"] = /expired/i.test(code)
        ? "expired"
        : /redeemed|used/i.test(code)
          ? "redeemed"
          : /revoked/i.test(code)
            ? "revoked"
            : "valid";
      return success({
        ...INVITE,
        code,
        state,
        expiresAt:
          state === "expired" ? "2026-10-19T23:59:59Z" : INVITE.expiresAt,
      });
    },
  },
  {
    method: "POST",
    pattern: "/api/invites/:code/redeem",
    handler: ({ segments, body }) => {
      /* Identity verification does not always answer inside the request. A
         number beginning 0000 is held pending, in the style of section 2.5's
         trigger values, so the waiting state is reachable with a number
         rather than by editing a fixture. */
      const identity = String(body.identity ?? "");
      const pending = identity.startsWith("0000");
      return success(
        {
          ...INVITE,
          code: segments[2],
          state: pending ? ("valid" as const) : ("redeemed" as const),
        },
        null,
        pending ? "Identity verification queued" : "Invite redeemed",
      );
    },
  },

  { method: "POST", pattern: "/api/projects/lookup", handler: () => success(REGISTRY_RECORD) },
  {
    /* The uploaded KML boundary, parsed server-side. Plan Vivo does not
       expose boundaries through an API — the file is requested from the
       Foundation and uploaded here — so this is the path a Plan Vivo
       project's geometry arrives by. The parse counts the outer ring's
       coordinates and computes the enclosed area, which is what the
       enrolment boundary check runs against. */
    method: "POST",
    pattern: "/api/registry/boundary",
    handler: ({ body }) => {
      const kml = String(body.kml ?? "");
      const name = String(body.name ?? "uploaded boundary");
      const coordinates = /<coordinates>([\s\S]*?)<\/coordinates>/i.exec(kml);
      if (!coordinates) {
        return failure("INVALID_REQUEST", "kml");
      }
      const points = coordinates[1]
        .trim()
        .split(/\s+/)
        .map((tuple) => tuple.split(",").map(Number))
        .filter((pair) => pair.length >= 2 && pair.every((value) => Number.isFinite(value)));
      if (points.length < 3) {
        return failure("INVALID_REQUEST", "kml");
      }
      /* Shoelace over lon/lat, scaled to hectares at this latitude: a mock's
         arithmetic, but real arithmetic — the area comes from the file, not
         from a constant. */
      let doubled = 0;
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[(index + 1) % points.length];
        doubled += x1 * y2 - x2 * y1;
      }
      const degreesSquared = Math.abs(doubled) / 2;
      const areaHectares = Math.round(degreesSquared * 111_320 * 110_574 * 0.0001);
      return success(
        { name, points: points.length, areaHectares },
        null,
        "Boundary parsed",
      );
    },
  },
  { method: "POST", pattern: "/api/projects", handler: () => success(PROJECTS[0], null, "Project created") },
  {
    method: "GET",
    pattern: "/api/projects/:id",
    handler: ({ segments }) => {
      const project = projectById(segments[2]);
      if (!project) {
        return notFound();
      }
      /* A status set from /dev/states is the project's status everywhere, not
         only on the public register. */
      return success({
        ...project,
        status: projectStatusFor(project.id, project.status) as typeof project.status,
      });
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
  { method: "POST", pattern: "/api/projects/:id/register", handler: () => success({ registered: true, reference: "PV-2314" }) },
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
          /* A corrected number comes back masked like every other: the
             full number never leaves the record it was corrected on. */
          phoneMasked: body.phone ? maskPhone(String(body.phone)) : participant.phoneMasked,
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
      if (!run) {
        return notFound();
      }
      if (run.projectId !== SESSION.projectId) {
        return failure("FORBIDDEN");
      }
      return success(run);
    },
  },
  {
    method: "GET",
    pattern: "/api/runs/:id/arithmetic",
    handler: ({ segments }) => {
      const figures = arithmeticFor(segments[2]);
      return figures ? success(figures) : notFound();
    },
  },
  {
    method: "POST",
    pattern: "/api/runs/:id/preflight",
    handler: ({ segments, body }) => {
      const runId = segments[2];
      /* An exclusion the console has confirmed, with its reason, is recorded
         against the run. Pre-flight passes when every enrolment it found is
         either corrected or excluded; until then the run does not execute,
         which is what the refusal on the step means. */
      const confirming = Array.isArray(body.excluding)
        ? (body.excluding as { participantId?: string; reason?: string }[])
        : [];
      for (const entry of confirming) {
        if (typeof entry.participantId !== "string") {
          return failure("INVALID_REQUEST", "excluding");
        }
        if (typeof entry.reason !== "string" || entry.reason.trim().length < 8) {
          return failure("INVALID_REQUEST", "reason");
        }
        confirmExclusion(runId, entry.participantId);
      }

      const found = PREFLIGHT_EXCLUSIONS;
      const confirmed = confirmedExclusions(runId);
      const outstanding = found.filter(
        (exclusion) => !confirmed.has(exclusion.participantId),
      );
      return success({
        passed: outstanding.length === 0,
        exclusions: found.map((exclusion) => ({
          ...exclusion,
          excluded: confirmed.has(exclusion.participantId),
        })),
      });
    },
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
    handler: ({ segments, url, forced }) => {
      const rows = RECONCILIATIONS.filter((row) => row.projectId === segments[2]);
      /* A forced mismatch is answered as the period's own state: the row says
         it does not reconcile, by how much, and what the candidate causes
         are, which is what a reader needs to see beside the account. */
      const shaped =
        forced === "RECONCILIATION_MISMATCH" && rows.length > 0
          ? rows.map((row, index) =>
              index === rows.length - 1
                ? {
                    ...row,
                    state: "mismatch" as const,
                    delta: row.delta === "0.00" ? "182400.00" : row.delta,
                    candidateCauses:
                      row.candidateCauses.length > 0
                        ? row.candidateCauses
                        : [
                            "A reversal landed after the period's figures were computed.",
                            "A charge was debited on a transfer the period does not carry.",
                          ],
                  }
                : row,
            )
          : rows;
      const { page, meta } = paginate(shaped, url);
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
      if (!dispute) {
        return notFound();
      }
      /* Scoping is at the query, never in the response filter: a record
         belonging to another project is not this session's to read. */
      if (dispute.projectId !== SESSION.projectId) {
        return failure("FORBIDDEN");
      }
      return success(dispute);
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
      if (dispute.projectId !== SESSION.projectId) {
        return failure("FORBIDDEN");
      }
      if (String(body.body ?? "").trim().length < 12) {
        return failure("INVALID_REQUEST", "body");
      }
      /* The response goes to the household, and the report is theirs to
         close: it waits on them until they confirm or the transfer is
         reversed. Nothing the project says closes it. */
      return success(
        {
          ...dispute,
          state: "awaiting-participant" as const,
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
    handler: ({ segments, url, forced }) => {
      /* An anchor that has not landed, or a chain that does not join, is a
         fact about the record rather than a failure to list it. The latest
         record carries it, which is the one a forced state is about. */
      const records = attestationsFor(segments[2]);
      const shaped =
        forced && RECORD_STATES.has(forced) && records.length > 0
          ? records.map((record, index) =>
              index === records.length - 1 ? withRecordState(record, forced) : record,
            )
          : records;
      const { page, meta } = paginate(shaped, url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/attestations/:id",
    handler: ({ segments, forced }) => {
      const attestation = attestationById(segments[2]);
      if (!attestation) {
        return notFound();
      }
      return success(
        forced && RECORD_STATES.has(forced) ? withRecordState(attestation, forced) : attestation,
      );
    },
  },
  {
    method: "POST",
    pattern: "/api/attestations/:id/disclosure",
    handler: ({ segments, body }) => {
      const bundle = disclosureFor(segments[2], String(body.transferId ?? ""));
      return bundle
        ? success({ ...bundle, attestationId: segments[2] })
        : notFound();
    },
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

      const transfer = bundle?.transfer;
      if (
        !bundle ||
        typeof bundle.leaf !== "string" ||
        !Array.isArray(bundle.proof) ||
        !bundle.proof.every((sibling) => typeof sibling === "string" && /^[0-9a-f]{64}$/.test(sibling)) ||
        typeof bundle.rootReference !== "string" ||
        !transfer ||
        typeof transfer.id !== "string" ||
        typeof transfer.amount !== "string" ||
        (transfer.sessionId !== null && typeof transfer.sessionId !== "string") ||
        (transfer.settledAt !== null && typeof transfer.settledAt !== "string") ||
        /* A bundle carries the four facts its leaf is computed from and
           nothing else. An extra key would be read as part of the record and
           proved by nothing. */
        Object.keys(transfer).some(
          (key) => !["id", "amount", "sessionId", "settledAt"].includes(key),
        )
      ) {
        return failure("INVALID_REQUEST", "bundle");
      }

      /* A record that names no root that exists has not been checked against
         anything, which is a different answer from a proof that does not
         hold. */
      const attestation = attestationById(bundle.rootReference);
      if (!attestation) {
        return notFound();
      }

      /* The leaf is recomputed from the transfer's own facts rather than
         taken from the bundle. A hash lifted from a published record — the
         period's root among them — is not a leaf, and an internal node of the
         tree is not one either, because leaves and nodes are hashed in
         separate domains. */
      const computed = leafFor({
        id: transfer.id,
        amount: transfer.amount,
        sessionId: transfer.sessionId ?? null,
        settledAt: transfer.settledAt ?? null,
      });
      if (computed !== bundle.leaf) {
        return failure("PROOF_INVALID", "leaf");
      }

      /* A path of the wrong length cannot be a path through this tree. */
      const leaves = leafCountFor(bundle.rootReference);
      if (leaves !== null && bundle.proof.length !== depthOf(leaves)) {
        return failure("PROOF_INVALID", "proof");
      }

      const folded = foldProof(computed, bundle.proof);
      if (folded !== attestation.merkleRoot) {
        /* A leaf that belongs to this period with a path that does not fold
           is an invalid proof. A leaf that belongs to another period is a
           foreign leaf. They are different facts and are told apart. */
        return failure(
          isLeafOfAnotherPeriod(computed, bundle.rootReference)
            ? "LEAF_NOT_IN_ROOT"
            : "PROOF_INVALID",
        );
      }

      return success({
        outcome: "match" as const,
        period: attestation.period,
        projectName: attestation.projectName,
        anchorReachable: attestation.anchorState === "anchored",
        /* A proof that holds against a record that has since been corrected
           is still a proof, and an auditor has to be told the record was
           superseded. Saying only "match" would let a withdrawn record be
           cited as current. */
        supersededBy: attestation.supersededBy,
        checkedAt: "2026-11-09T16:12:00Z",
      });
    },
  },

  {
    /* Not in backend 4.3. The one hard block in the product — a second
       enrolment on one verification number — has to happen while the agent is
       still in front of the household, which means a check at capture rather
       than at sync. Offline it does not answer and the enrolment is queued
       with the check outstanding. Recorded in BUILD_LOG.md. */
    method: "POST",
    pattern: "/api/field/identity-check",
    handler: ({ body }) => {
      const number = String(body.number ?? "").trim();
      if (number.length < 11) {
        return failure("INVALID_REQUEST", "number");
      }
      /* Section 2.5's trigger values, so each answer is reachable by typing a
         number rather than by editing a fixture. */
      if (number.endsWith("12")) {
        return failure("IDENTITY_DUPLICATE", "number");
      }
      if (number.endsWith("97")) {
        return failure("BVN_MISMATCH", "number");
      }
      if (number.endsWith("00")) {
        return failure("IDENTITY_UNREACHABLE", "number");
      }
      return success({ checked: true, lastFour: number.slice(-4) });
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
          /* Idempotent on the client UUID: a batch resent because the
             connection died mid-request must not enrol the same household
             twice, and the device cannot know whether the first attempt
             arrived. The answer to a UUID already accepted is the answer it
             was given the first time. */
          const record = item as {
            clientUuid?: string;
            identity?: { lastFour?: string };
          };
          /* An account the bank does not resolve, in the style of section
             2.5's trigger values: the number itself decides, so a partial
             failure is reachable by enrolling with one. */
          const uuid = String(record.clientUuid ?? `uuid_${index}`);
          const already = enrolled.get(uuid);
          if (already) {
            return already;
          }
          /* An account the bank does not resolve, in the style of section
             2.5's trigger values: the last four decide, so a partial failure
             is reachable by enrolling with one. */
          const lastFour = String(record.identity?.lastFour ?? "");
          const failed = lastFour.endsWith("4") || index % 9 === 4;
          const answer = {
            clientUuid: uuid,
            accepted: !failed,
            code: failed ? ("NAME_MISMATCH" as const) : null,
            enrolmentId: failed
              ? null
              : `enr_${String(enrolled.size + 1).padStart(6, "0")}`,
          };
          if (!failed) {
            enrolled.set(uuid, answer);
          }
          return answer;
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
        /* The boundary the capture is judged against. The field app cannot
           ask for it when it is offline, so it is given with the session and
           held on the device. */
        boundary: {
          name: "Ekuri community forest, Akamkpa",
          north: 5.95,
          south: 5.55,
          east: 8.65,
          west: 8.25,
        },
        flagThreshold: 0.05,
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
      const found = projectById(segments[3]);
      if (!found) {
        return notFound();
      }
      const project = {
        ...found,
        status: projectStatusFor(found.id, found.status) as typeof found.status,
      };
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
    handler: ({ segments, forced }) => {
      const attestation = attestationById(segments[3]);
      if (!attestation) {
        return notFound();
      }
      return success(
        forced && RECORD_STATES.has(forced) ? withRecordState(attestation, forced) : attestation,
      );
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
      const rows = registerRows().filter((row) => watchlist.has(row.id));
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/verifier/watchlist",
    handler: ({ body }) => {
      const projectId = String(body.projectId ?? "");
      if (!projectById(projectId)) {
        return notFound();
      }
      /* Watching is the reader's own bookmark, and it holds: a toggle that
         forgets on reload is a toggle that lies. */
      const watched = !watchlist.has(projectId);
      if (watched) {
        watchlist.add(projectId);
      } else {
        watchlist.delete(projectId);
      }
      return success({ projectId, watched });
    },
  },
  {
    method: "GET",
    pattern: "/api/verifier/projects/:id",
    handler: ({ segments }) => {
      const found = projectById(segments[3]);
      if (!found) {
        return notFound();
      }
      const project = {
        ...found,
        status: projectStatusFor(found.id, found.status) as typeof found.status,
      };
      return success({
        project,
        attestations: attestationsFor(project.id),
        /* A count, not a breakdown. Which patterns the bank's monitoring
           raised is the substance of the evidence rather than its published
           form, and the rule for this surface is the count. */
        signals: SIGNALS.filter((signal) => signal.projectId === project.id).length,
        /* With what each agent enrolled, so a rate across them can be
           weighted rather than averaged as though every agent enrolled the
           same number. */
        agentFlagRates: AGENTS.filter((agent) => agent.projectId === project.id).map(
          (agent) => ({
            agentId: agent.id,
            flagRate: agent.flagRate,
            enrolments: agent.enrolments,
          }),
        ),
        geography: geography(project.id),
      });
    },
  },
  {
    method: "GET",
    pattern: "/api/verifier/compare",
    handler: ({ url }) => {
      /* One of each, and what was asked for but does not exist is named
         rather than dropped: a column quietly missing is a comparison the
         reader thinks they are making and are not. */
      const ids = [...new Set((url.searchParams.get("ids") ?? "").split(",").filter(Boolean))];
      const projects = ids
        .map((id) => projectById(id))
        .filter((project) => project !== undefined);
      const unknown = ids.filter((id) => !projectById(id));
      const periods = projects.map((project) =>
        project.periods.filter((period) => period.state !== "open").map((period) => period.period),
      );
      const shared = periods.reduce<string[]>(
        (common, list) => common.filter((period) => list.includes(period)),
        periods[0] ?? [],
      );
      return success({ projects, comparablePeriods: shared, unknown });
    },
  },
  {
    method: "POST",
    pattern: "/api/verifier/export",
    handler: ({ body }) => {
      const format = String(body.format ?? "csv");
      const projectId = String(body.projectId ?? "proj_ekuri");
      const period = String(body.period ?? "2026-Q3");

      /* A disclosure export is the bundle itself, not a link to one: an
         export that an auditor cannot put straight into the public verifier
         proves nothing, and that round trip is the point of the format. */
      if (format === "disclosure") {
        const project = projectById(projectId);
        const closed = project?.periods.find((candidate) => candidate.period === period);
        if (!project || !closed?.attestationId) {
          return failure("NOT_FOUND", "period");
        }
        const periodRun = runForPeriod(projectId, period);
        if (!periodRun) {
          return failure("NOT_FOUND", "period");
        }
        /* The first settled transfer of the period: a bundle is about one
           transfer, and which one is the auditor's choice elsewhere. */
        const transferId = String(
          body.transferId ??
            runTransfers(periodRun.id, projectId, periodRun.rosterSize).find(
              (transfer) =>
                transfer.state === "settled" || transfer.state === "unconfirmed",
            )?.id ??
            "",
        );
        const bundle = disclosureFor(closed.attestationId, transferId);
        if (!bundle) {
          return failure("NOT_FOUND", "transferId");
        }
        return success(
          {
            exportId: "exp_0041",
            format,
            state: "ready" as const,
            bundle: { ...bundle, attestationId: closed.attestationId },
          },
          null,
          "Export ready",
        );
      }

      /* The payment summary the Plan Vivo annual report template stipulates,
         rendered from the closed period's attestation: an existing filing,
         currently satisfied by a developer's own account of its payments,
         satisfied here by the settlement record. */
      if (format === "benefit-sharing") {
        const project = projectById(projectId);
        const closed = project?.periods.find((candidate) => candidate.period === period);
        if (!project || !closed?.attestationId) {
          return failure("NOT_FOUND", "period");
        }
        const attestation = attestationsFor(projectId).find(
          (candidate) => candidate.id === closed.attestationId,
        );
        if (!attestation) {
          return failure("NOT_FOUND", "period");
        }
        const periodDisputes = DISPUTES.filter(
          (dispute) => dispute.projectId === projectId && dispute.period === period,
        );
        const report: BenefitSharingReport = {
          projectId,
          projectName: project.name,
          registry: project.registry,
          registryId: project.registryId,
          period,
          commitment: {
            percentage: project.commitment.percentage,
            basis: project.commitment.basis,
            sourceQuote: project.commitment.sourceQuote,
            page: project.commitment.page,
          },
          enrolled: attestation.enrolled,
          paid: attestation.paid,
          coveragePercent: Math.round((attestation.paid / Math.max(1, attestation.enrolled)) * 100),
          amountToHouseholds: attestation.amountToHouseholds,
          chargesBorne: attestation.chargesBorne,
          shortfall: attestation.shortfall,
          confirmations: Math.round(attestation.confirmationRate * attestation.paid),
          disputesOpenAtClose: periodDisputes.filter(
            (dispute) =>
              dispute.state !== "substantiated" && dispute.state !== "unsubstantiated",
          ).length,
          disputesSubstantiated: periodDisputes.filter(
            (dispute) => dispute.state === "substantiated",
          ).length,
          merkleRoot: attestation.merkleRoot,
          attestationHash: attestation.hash,
          anchor: {
            network: attestation.anchor.network,
            topicId: attestation.anchor.topicId,
            sequence: attestation.anchor.sequence,
          },
        };
        return success(
          {
            exportId: "exp_0042",
            format,
            state: "ready" as const,
            report,
            url: `/attestation/${closed.attestationId}/benefit-sharing.pdf`,
          },
          null,
          "Export ready",
        );
      }

      const project = projectById(projectId);
      const closed = project?.periods.find((candidate) => candidate.period === period);
      if (!project || !closed?.attestationId) {
        return failure("NOT_FOUND", "period");
      }
      return success(
        {
          exportId: "exp_0041",
          format,
          state: "ready" as const,
          /* Each format its own file: the record as it is published, or the
             period's figures as a table. Two formats behind one URL meant
             the CSV was the record with a different label on it. */
          url:
            format === "csv"
              ? `/verifier/export/${closed.attestationId}.csv`
              : `/attestation/${closed.attestationId}/download`,
        },
        null,
        "Export ready",
      );
    },
  },
  {
    /* Not in backend 4.3; see BUILD_LOG.md. The phase lists API keys as one
       of the three things the export screen is for. */
    method: "POST",
    pattern: "/api/verifier/keys",
    handler: ({ body }) => {
      const label = String(body.label ?? "").trim();
      if (label.length === 0) {
        return failure("INVALID_REQUEST", "label");
      }
      const key: VerifierKey = {
        id: `vk_${String(verifierKeys.length + 1).padStart(4, "0")}`,
        label,
        prefix: "att_read",
        createdAt: new Date().toISOString(),
        secret: `att_read_${randomHex(32)}`,
      };
      verifierKeys.push({ ...key, secret: null });
      return success(key, null, "Key issued. It is shown once.");
    },
  },
  {
    method: "GET",
    pattern: "/api/verifier/keys",
    handler: ({ url }) => {
      const { page, meta } = paginate(verifierKeys, url);
      return success(page, meta);
    },
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
      let rows = opsEmpty() ? [] : SIGNALS;
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
    if (opsEmpty()) {
      const { page, meta } = paginate([], url);
      return success(page, meta);
    }
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
      if (openCase.state === "closed") {
        return failure("FORBIDDEN", "id");
      }

      const action = String(body.action ?? "");
      if (!CASE_ACTIONS.includes(action as (typeof CASE_ACTIONS)[number])) {
        return failure("INVALID_REQUEST", "action");
      }
      /* The note is what the case record carries afterwards, so it is
         required here rather than only in the dialog that asks for it. */
      const note = String(body.note ?? "").trim();
      if (note.length < 12) {
        return failure("INVALID_REQUEST", "note");
      }

      const at = new Date().toISOString();
      openCase.actions = [
        ...openCase.actions,
        { at, action, note, by: "Operations, Access Bank" },
      ];
      /* What each action does to the case. Freezing and escalation are the
         financial crime desk's to authorise, so they move the case to
         investigating and no further; clearing and substantiating end it. */
      if (action === "clear") {
        openCase.state = "unsubstantiated";
      } else if (action === "substantiate") {
        openCase.state = "substantiated";
      } else if (openCase.state === "open") {
        openCase.state = "investigating";
      }

      return success(openCase, null, "Action recorded");
    },
  },
  { method: "GET", pattern: "/api/ops/exceptions", handler: ({ url }) => {
    if (opsEmpty()) {
      const { page, meta } = paginate([], url);
      return success(page, meta);
    }
    const { page, meta } = paginate(EXCEPTIONS, url);
    return success(page, meta);
  } },
  {
    method: "GET",
    pattern: "/api/ops/reconciliation",
    handler: ({ url }) => {
      /* With nothing open, every period reconciles: "nothing open" is the
         state of the whole console, not of three of its four screens. */
      const rows = opsEmpty()
        ? RECONCILIATIONS.map((row) => ({
            ...row,
            state: "reconciled" as const,
            delta: "0.00",
            candidateCauses: [],
          }))
        : RECONCILIATIONS;
      const { page, meta } = paginate(rows, url);
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

  {
    method: "GET",
    pattern: "/api/receipt/:token",
    handler: ({ segments }) => {
      const receipt = receiptFor(segments[2]);
      return receipt ? success(receipt) : notFound();
    },
  },
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

  /* ---- The console's own administration -----------------------------------

     Not in backend 4.3. Named here so both lanes carry one shape; the decision
     is in BUILD_LOG.md. */
  {
    method: "GET",
    pattern: "/api/projects/:id/users",
    handler: ({ segments, url }) => {
      if (!projectById(segments[2])) {
        return notFound();
      }
      const { page, meta } = paginate(CONSOLE_USERS, url);
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/projects/:id/users",
    handler: ({ body }) => {
      const email = String(body.email ?? "");
      if (!/.+@.+\..+/.test(email)) {
        return failure("INVALID_REQUEST", "email");
      }
      if (CONSOLE_USERS.some((user) => user.email === email)) {
        return failure("DUPLICATE_REQUEST", "email");
      }
      const user: ConsoleUser = {
        id: `usr_${String(nextUserNumber()).padStart(4, "0")}`,
        name: String(body.name ?? email),
        email,
        role: (body.role as ConsoleRole) ?? "viewer",
        invitedAt: new Date().toISOString(),
        lastSignInAt: null,
        self: false,
      };
      /* The invite is held, so a second one with the same address is the
         duplicate the refusal says it is. */
      CONSOLE_USERS.push(user);
      return success(user, null, "Invite sent");
    },
  },
  {
    method: "PATCH",
    pattern: "/api/users/:id",
    handler: ({ segments, body }) => {
      const user = CONSOLE_USERS.find((candidate) => candidate.id === segments[2]);
      if (!user) {
        return notFound();
      }
      const role = (body.role as ConsoleRole) ?? user.role;
      /* The last administrator cannot give up the role, or the project is
         left with nobody who can grant it. */
      const admins = CONSOLE_USERS.filter((candidate) => candidate.role === "admin");
      if (user.role === "admin" && role !== "admin" && admins.length === 1) {
        return lastAdmin("role");
      }
      user.role = role;
      return success(user, null, "Role changed");
    },
  },
  {
    method: "DELETE",
    pattern: "/api/users/:id",
    handler: ({ segments }) => {
      const user = CONSOLE_USERS.find((candidate) => candidate.id === segments[2]);
      if (!user) {
        return notFound();
      }
      const admins = CONSOLE_USERS.filter((candidate) => candidate.role === "admin");
      if (user.role === "admin" && admins.length === 1) {
        return lastAdmin("id");
      }
      CONSOLE_USERS.splice(CONSOLE_USERS.indexOf(user), 1);
      return success({ id: user.id, removed: true }, null, "Access removed");
    },
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/api-keys",
    handler: ({ segments, url }) => {
      if (!projectById(segments[2])) {
        return notFound();
      }
      const { page, meta } = paginate(API_KEYS, url);
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/projects/:id/api-keys",
    handler: ({ body }) => {
      const label = String(body.label ?? "").trim();
      if (label.length === 0) {
        return failure("INVALID_REQUEST", "label");
      }
      /* The secret is returned once and is this key's own. Nothing holds it
         afterwards, here or in the console: only the prefix is kept. */
      const secret = `att_live_${randomHex(32)}`;
      const key: ApiKey = {
        id: `key_${String(nextKeyNumber()).padStart(4, "0")}`,
        label,
        prefix: "att_live",
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        secret,
      };
      API_KEYS.push({ ...key, secret: null });
      return success(key, null, "Key created. It is shown once.");
    },
  },
  {
    method: "DELETE",
    pattern: "/api/api-keys/:id",
    handler: ({ segments }) => {
      const key = API_KEYS.find((candidate) => candidate.id === segments[2]);
      if (!key) {
        return notFound();
      }
      API_KEYS.splice(API_KEYS.indexOf(key), 1);
      return success({ id: key.id, revoked: true }, null, "Key revoked");
    },
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/webhook-endpoints",
    handler: ({ segments, url }) => {
      if (!projectById(segments[2])) {
        return notFound();
      }
      const { page, meta } = paginate(WEBHOOK_ENDPOINTS, url);
      return success(page, meta);
    },
  },
  {
    method: "POST",
    pattern: "/api/projects/:id/webhook-endpoints",
    handler: ({ body }) => {
      const target = String(body.url ?? "");
      /* A URL scheme is case-insensitive, so HTTPS:// is https. */
      if (!/^https:\/\//i.test(target)) {
        return failure("INVALID_REQUEST", "url");
      }
      const events = Array.isArray(body.events) ? (body.events as string[]) : [];
      const unknown = events.filter(
        (event) => !NOTIFICATION_EVENTS.includes(event as NotificationEvent),
      );
      if (unknown.length > 0) {
        return failure("INVALID_REQUEST", "events");
      }
      const endpoint: WebhookEndpoint = {
        id: `whk_${String(WEBHOOK_ENDPOINTS.length + 1).padStart(4, "0")}`,
        url: target,
        events,
        createdAt: new Date().toISOString(),
        lastDeliveryAt: null,
        lastDeliveryState: "none",
      };
      WEBHOOK_ENDPOINTS.push(endpoint);
      return success(endpoint, null, "Endpoint registered");
    },
  },
  {
    method: "DELETE",
    pattern: "/api/webhook-endpoints/:id",
    handler: ({ segments }) => {
      const endpoint = WEBHOOK_ENDPOINTS.find((candidate) => candidate.id === segments[2]);
      if (!endpoint) {
        return notFound();
      }
      WEBHOOK_ENDPOINTS.splice(WEBHOOK_ENDPOINTS.indexOf(endpoint), 1);
      return success({ id: endpoint.id, removed: true }, null, "Endpoint removed");
    },
  },

  {
    method: "GET",
    pattern: "/api/notifications/preferences",
    handler: () => success(notificationPreferences("usr_0001")),
  },
  {
    method: "PATCH",
    pattern: "/api/notifications/preferences",
    handler: ({ body }) => {
      const events = (body.events ?? {}) as Partial<Record<NotificationEvent, boolean>>;
      const unknown = Object.keys(events).filter(
        (event) => !NOTIFICATION_EVENTS.includes(event as NotificationEvent),
      );
      if (unknown.length > 0) {
        return failure("INVALID_REQUEST", "events");
      }
      return success(
        setNotificationPreferences("usr_0001", events),
        null,
        "Notification preferences saved",
      );
    },
  },

  {
    method: "GET",
    pattern: "/api/projects/:id/imports",
    handler: ({ segments, url }) => {
      const { page, meta } = paginate(importsFor(segments[2]), url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/imports/:id",
    handler: ({ segments }) => {
      const job = importJob(segments[2]);
      return job ? success(job) : notFound();
    },
  },

  /* ---- Platform admin ------------------------------------------------------

     Not in backend 4.3; see BUILD_LOG.md. */
  {
    method: "GET",
    pattern: "/api/admin/onboarding",
    handler: ({ url }) => {
      const rows = adminEmpty() ? [] : ONBOARDING_REVIEWS;
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/admin/registry",
    handler: () => success(adminEmpty() ? [] : REGISTRY_SYNC),
  },
  {
    /* A re-sync, asked for from the screen that shows the failure. It reads
       the registry now rather than at tomorrow's schedule; a registry that
       is still down fails again, and the failure is appended where the
       operator can see it is fresh. */
    method: "POST",
    pattern: "/api/admin/registry/:registry/sync",
    handler: ({ segments, forced }) => {
      const name = decodeURIComponent(segments[3]);
      const row = REGISTRY_SYNC.find((candidate) => candidate.registry === name);
      if (!row) {
        return notFound();
      }
      const at = new Date().toISOString();
      if (forced === "REGISTRY_UNREACHABLE") {
        row.state = "failing";
        row.failures = [
          {
            at,
            registryId: row.failures[0]?.registryId ?? "—",
            reason: "The registry did not answer when asked just now.",
          },
          ...row.failures,
        ];
        return success(row, null, "The registry still does not answer");
      }
      row.state = "synced";
      row.lastSyncedAt = at;
      return success(row, null, "Read just now");
    },
  },
  {
    method: "GET",
    pattern: "/api/admin/extraction",
    handler: ({ url }) => {
      const rows = adminEmpty() ? [] : EXTRACTION_REVIEWS;
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
  },
  {
    method: "GET",
    pattern: "/api/admin/chain",
    handler: ({ forced }) => {
      if (adminEmpty()) {
        return success([]);
      }
      const rows: ChainCheck[] = [];
      for (const project of PROJECTS) {
        const records = attestationsFor(project.id);
        for (const record of records) {
          /* A chain state forced from /dev/states is a fact about the
             record, and this is the screen that monitors it: answering
             without it made the one thing the monitor exists for
             unreachable. */
          const attestation =
            forced && RECORD_STATES.has(forced) && record === records[records.length - 1]
              ? withRecordState(record, forced)
              : record;
          rows.push({
            projectId: project.id,
            projectName: project.name,
            period: attestation.period,
            attestationId: attestation.id,
            chains: !attestation.chainBreak,
            anchorState: attestation.anchorState,
            checkedAt: "2026-11-10T08:00:00Z",
          });
        }
      }
      return success(rows);
    },
  },
  {
    /* The platform's decision on an escalated report. The basis is required,
       which is what DISPUTE_RESOLUTION_BASIS_REQUIRED is for and what makes a
       closed report checkable. */
    method: "POST",
    pattern: "/api/admin/escalations/:id",
    handler: ({ segments, body }) => {
      const dispute = DISPUTES.find((candidate) => candidate.id === segments[3]);
      if (!dispute) {
        return notFound();
      }
      const outcome = String(body.outcome ?? "");
      if (outcome !== "substantiated" && outcome !== "unsubstantiated") {
        return failure("INVALID_REQUEST", "outcome");
      }
      const basis = String(body.basis ?? "").trim();
      if (basis.length < 24) {
        return failure("DISPUTE_RESOLUTION_BASIS_REQUIRED", "basis");
      }
      dispute.state = outcome;
      dispute.resolutionBasis = basis;
      dispute.updatedAt = new Date().toISOString();
      DECIDED_ESCALATIONS.add(dispute.id);
      return success(dispute, null, "The report is closed on its basis");
    },
  },
  {
    /* A project reviewed, or sent back with what is outstanding. */
    method: "POST",
    pattern: "/api/admin/onboarding/:id",
    handler: ({ segments, body }) => {
      const decision = String(body.decision ?? "");
      if (decision !== "approve" && decision !== "return") {
        return failure("INVALID_REQUEST", "decision");
      }
      const note = String(body.note ?? "").trim();
      if (note.length < 12) {
        return failure("INVALID_REQUEST", "note");
      }
      const review = ONBOARDING_REVIEWS.find(
        (candidate) => candidate.projectId === segments[3],
      );
      if (!review) {
        return notFound();
      }
      const at = new Date().toISOString();
      /* The decision is written onto the row, so the queue shows what was
         decided, when, and on what reason rather than forgetting it the
         moment the screen refreshes. A returned project is returned — the
         first version put it back to "awaiting-review", which stamped a
         project the platform had just read as one nobody had read. */
      review.decidedNote = note;
      review.decidedAt = at;
      review.state = decision === "approve" ? "approved" : "returned";
      review.outstanding = decision === "approve" ? [] : [note];
      return success(
        { projectId: segments[3], decision, note, at },
        null,
        decision === "approve" ? "The project is approved" : "Returned to the operator",
      );
    },
  },
  {
    /* An extraction accepted as read, or corrected. The original stays. */
    method: "POST",
    pattern: "/api/admin/extraction/:projectId/:field",
    handler: ({ segments, body }) => {
      const accepted = body.accepted === true;
      const corrected = body.corrected === undefined ? null : String(body.corrected);
      if (!accepted && (corrected === null || corrected.trim().length === 0)) {
        return failure("INVALID_REQUEST", "corrected");
      }
      /* By project AND field: a queue is keyed by what was read, and a
         project with two uncertain extractions must not have a decision on
         one land on the other. */
      const row = EXTRACTION_REVIEWS.find(
        (candidate) =>
          candidate.projectId === segments[3] && candidate.field === segments[4],
      );
      if (!row) {
        return notFound();
      }
      /* What the model read stays where it was; the decision is written
         beside it. A correction that overwrote the reading would destroy the
         one thing this queue exists to make checkable. */
      row.decision = {
        at: new Date().toISOString(),
        by: "Platform review",
        accepted,
        corrected,
      };
      return success(
        {
          projectId: segments[3],
          decision: row.decision,
        },
        null,
        accepted ? "Accepted as read" : "Corrected, with the original kept",
      );
    },
  },
  {
    method: "GET",
    pattern: "/api/admin/escalations",
    handler: ({ url }) => {
      /* Decided reports stay on the screen. The first version filtered to
         "escalated" alone, so the operator's own decision removed the row the
         moment it was made — an irreversible act with nothing left to show
         for it, and the published basis unreadable from the surface that
         wrote it. */
      const rows = adminEmpty()
        ? []
        : DISPUTES.filter(
            (dispute) =>
              dispute.state === "escalated" || DECIDED_ESCALATIONS.has(dispute.id),
          );
      const { page, meta } = paginate(rows, url);
      return success(page, meta);
    },
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
  /* Most codes are failures. A few are facts about the record, and those are
     handed to the endpoint to answer with. */
  if (forced && !RECORD_STATES.has(forced)) {
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

  const envelope = route.handler({ url, segments, method, body, forced });

  if (key && mutating) {
    idempotency.set(key, { bodyFingerprint: mark, envelope });
  }
  return { envelope, replayed: false };
}
