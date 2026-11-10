import type {
  AccountGraph,
  ApiKey,
  ConsoleRole,
  ConsoleUser,
  ImportJob,
  NotificationEvent,
  NotificationPreferences,
  WebhookEndpoint,
  Payment,
  Agent,
  Arithmetic,
  Attestation,
  Case,
  ChainCheck,
  DisclosureBundle,
  ExtractionReview,
  OnboardingReview,
  RegistrySync,
  DisclosureVerificationResult,
  Dispute,
  Envelope,
  ErrorCode,
  GeographyBucket,
  Invite,
  Meta,
  Participant,
  PreflightExclusion,
  Project,
  Receipt,
  Reconciliation,
  RegisterRow,
  RegistryRecord,
  Run,
  RunState,
  Session,
  Signal,
  Tariff,
  Transfer,
  VerifierAlert,
  VerifierKey,
  VerificationException,
} from "@/lib/api/contract";

/* The typed client. One module owns the base URL, so pointing the front end
   at the real backend is one change and nothing else moves.

   Every method returns a discriminated result carrying either data or a typed
   error code, so a caller switches on the code rather than catching. */

export type Ok<T> = { ok: true; data: T; meta: Meta | null };
export type Fail = {
  ok: false;
  code: ErrorCode;
  message: string;
  field: string | null;
  remediation: string;
  /** True when the request never reached an answer, so the outcome of a
      mutation is unknown. A caller requeries; it never resends. */
  transport: boolean;
};
export type Result<T> = Ok<T> | Fail;

/* In the browser a relative path reaches the same origin. On the server there
   is no origin, so one is named: in production that is the backend's own URL,
   and in development it is this application serving its own mock. Pointing the
   front end at a real backend is still a change to these two values and
   nothing else. */
const BASE_URL =
  typeof window === "undefined"
    ? (process.env.ATTEST_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://127.0.0.1:3000")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "");

/* Reads are retried; a mutation never is, because a retry is how a household
   is paid twice. */
const READ_RETRIES = 2;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Required on every mutation by the contract, as a UUID. A caller holds
      one key for one logical action, so a double submit carries the same key
      and the server collapses it rather than acting twice. */
  idempotencyKey?: string;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
};

/** A key for one logical mutation. Hold it across retries of that action. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function withQuery(path: string, query: RequestOptions["query"]): string {
  if (!query) {
    return path;
  }
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.set(key, String(value));
    }
  }
  const search = url.toString();
  return search ? `${path}?${search}` : path;
}

function transportFailure(): Fail {
  return {
    ok: false,
    code: "TIMEOUT",
    message: "The request did not complete, so its outcome is not known.",
    field: null,
    remediation:
      "Requery rather than submitting again. A resend is how a household is paid twice.",
    transport: true,
  };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<Result<T>> {
  const method = options.method ?? "GET";
  const attempts = method === "GET" ? READ_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (method !== "GET") {
      headers["Idempotency-Key"] = options.idempotencyKey ?? newIdempotencyKey();
    }

    const response = await fetch(`${BASE_URL}${withQuery(path, options.query)}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: "no-store",
    }).catch(() => null);

    if (!response) {
      if (attempt === attempts - 1) {
        return transportFailure();
      }
      continue;
    }

    const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (!envelope) {
      return transportFailure();
    }
    if (envelope.status === "success") {
      return { ok: true, data: envelope.data, meta: envelope.meta };
    }
    return {
      ok: false,
      code: envelope.error.code,
      message: envelope.error.message,
      field: envelope.error.field,
      remediation: envelope.error.remediation,
      transport: false,
    };
  }

  return transportFailure();
}

export const api = {
  /* Auth */
  session: () => request<Session>("/api/auth/session"),
  signin: (body: { email: string; password: string }) =>
    request<Session>("/api/auth/signin", { method: "POST", body }),
  signup: (body: {
    email: string;
    password: string;
    organisation: string;
    role: "developer" | "institution";
  }) => request<Session>("/api/auth/signup", { method: "POST", body }),
  verifyEmail: (body: { token: string }) =>
    request<{ verified: boolean }>("/api/auth/verify-email", { method: "POST", body }),
  /** Not in backend 4.3; see BUILD_LOG.md. A verification link expires and the
      reader has no account to sign in to in order to ask for another. */
  resendVerification: (body: { email: string }) =>
    request<{ sent: boolean; email: string }>("/api/auth/resend-verification", {
      method: "POST",
      body,
    }),
  requestReset: (body: { email: string }) =>
    request<{ sent: boolean }>("/api/auth/reset/request", { method: "POST", body }),
  confirmReset: (body: { token: string; password: string }) =>
    request<{ reset: boolean }>("/api/auth/reset/confirm", { method: "POST", body }),
  invite: (code: string) => request<Invite>(`/api/invites/${code}`),
  redeemInvite: (code: string, body: { identity: string; deviceKey: string }) =>
    request<Invite>(`/api/invites/${code}/redeem`, { method: "POST", body }),

  /* Project onboarding */
  lookupProject: (body: { registryId: string }) =>
    request<RegistryRecord>("/api/projects/lookup", { method: "POST", body }),
  createProject: (body: { registryRecord: RegistryRecord }) =>
    request<Project>("/api/projects", { method: "POST", body }),
  project: (id: string) => request<Project>(`/api/projects/${id}`),
  uploadPdd: (id: string, idempotencyKey: string) =>
    request<{ jobId: string }>(`/api/projects/${id}/pdd`, { method: "POST", idempotencyKey }),
  registerProject: (id: string, idempotencyKey: string) =>
    request<{ registered: boolean; reference: string }>(`/api/projects/${id}/register`, {
      method: "POST",
      idempotencyKey,
    }),
  mrv: (id: string) =>
    request<{ id: string; state: string; submittedAt: string }[]>(`/api/projects/${id}/mrv`),
  submitMrv: (id: string, idempotencyKey: string) =>
    request<{ id: string; state: string }>(`/api/projects/${id}/mrv`, {
      method: "POST",
      idempotencyKey,
    }),
  certificates: (id: string) =>
    request<{ id: string; vintage: string; credits: number; retiredAt: string }[]>(
      `/api/projects/${id}/certificates`,
    ),
  extraction: (id: string) =>
    request<{
      commitment: Project["commitment"];
      sourceQuote: string;
      page: number;
      confidence: number;
    }>(`/api/projects/${id}/extraction`),
  correctCommitment: (
    id: string,
    body: { field: string; value: string | number; reason: string },
  ) => request<Project["commitment"]>(`/api/projects/${id}/commitment`, { method: "PATCH", body }),

  /* Roster */
  participants: (
    projectId: string,
    query: {
      page?: number;
      per_page?: number;
      status?: string;
      agent?: string;
      tier?: string;
      flagged?: string;
      wallet?: string;
      phone?: string;
      enrolled_from?: string;
      enrolled_to?: string;
      q?: string;
    } = {},
  ) => request<Participant[]>(`/api/projects/${projectId}/participants`, { query }),
  importParticipants: (projectId: string, body: { rows: unknown[] }, idempotencyKey: string) =>
    request<{ imported: number; failed: number }>(
      `/api/projects/${projectId}/participants`,
      { method: "POST", body, idempotencyKey },
    ),
  participant: (id: string) => request<Participant>(`/api/participants/${id}`),
  /* The client carries no method for removing a household. The endpoint
     exists and refuses, and the refusal is asserted against it directly in
     lib/api/client.test.ts, but a method here is a call somebody can make,
     and the one thing this product must never do is erase a household from
     the denominator of its own coverage. Removal is a status change. */
  updateParticipant: (
    id: string,
    body: { phone?: string; status?: string; reason: string },
  ) => request<Participant>(`/api/participants/${id}`, { method: "PATCH", body }),
  participantPayments: (id: string) => request<Payment[]>(`/api/participants/${id}/payments`),
  nameCheck: (id: string) =>
    request<{ match: string; accountName: string; enrolledName: string }>(
      `/api/participants/${id}/name-check`,
      { method: "POST" },
    ),

  /* Agents */
  agents: (projectId: string) => request<Agent[]>(`/api/projects/${projectId}/agents`),
  agent: (id: string) => request<Agent>(`/api/agents/${id}`),
  inviteAgent: (projectId: string, body: { name: string; email: string }) =>
    request<{ code: string }>(`/api/projects/${projectId}/agents/invite`, { method: "POST", body }),
  updateAgent: (id: string, body: { status: string; reason: string }) =>
    request<Agent>(`/api/agents/${id}`, { method: "PATCH", body }),

  /* Runs */
  runs: (projectId: string) => request<Run[]>(`/api/projects/${projectId}/runs`),
  createRun: (
    projectId: string,
    body: { period: string; rosterId: string; declaredGross: string; fundingAmount: string },
    idempotencyKey: string,
  ) => request<Run>(`/api/projects/${projectId}/runs`, { method: "POST", body, idempotencyKey }),
  run: (id: string) => request<Run>(`/api/runs/${id}`),
  arithmetic: (id: string) => request<Arithmetic>(`/api/runs/${id}/arithmetic`),
  preflight: (
    id: string,
    body: { excluding?: { participantId: string; reason: string }[] } = {},
  ) =>
    request<{ passed: boolean; exclusions: PreflightExclusion[] }>(
      `/api/runs/${id}/preflight`,
      { method: "POST", body },
    ),
  execute: (id: string, idempotencyKey: string) =>
    request<{ runId: string; state: string }>(`/api/runs/${id}/execute`, {
      method: "POST",
      idempotencyKey,
    }),
  retry: (id: string, body: { failureClass: ErrorCode }, idempotencyKey: string) =>
    request<{ retried: number }>(`/api/runs/${id}/retry`, {
      method: "POST",
      body,
      idempotencyKey,
    }),
  requery: (id: string, body: { transferId?: string }) =>
    request<{ state: string; sessionId: string }>(`/api/runs/${id}/requery`, { method: "POST", body }),
  cancelRun: (id: string, idempotencyKey: string) =>
    request<{ runId: string; state: RunState }>(`/api/runs/${id}/cancel`, {
      method: "POST",
      idempotencyKey,
    }),
  transfers: (id: string, query: { page?: number; per_page?: number } = {}) =>
    request<Transfer[]>(`/api/runs/${id}/transfers`, { query }),
  /** The live stream's URL. State arrives only here, per contract 4.4. */
  streamUrl: (id: string) => `${BASE_URL}/api/runs/${id}/stream`,

  /* Funding */
  funding: (projectId: string) =>
    request<{
      accountNumber: string;
      accountName: string;
      bank: string;
      inbound: { reference: string; amount: string; receivedAt: string }[];
      funded: string;
      outbound: string;
      charges: string;
      balance: string;
    }>(`/api/projects/${projectId}/funding`),
  reconciliation: (projectId: string) =>
    request<Reconciliation[]>(`/api/projects/${projectId}/reconciliation`),
  tariff: () => request<Tariff>("/api/tariff"),

  /* Disputes */
  disputes: (projectId: string, query: { page?: number; per_page?: number } = {}) =>
    request<Dispute[]>(`/api/projects/${projectId}/disputes`, { query }),
  dispute: (id: string) => request<Dispute>(`/api/disputes/${id}`),
  respondToDispute: (id: string, body: { body: string }) =>
    request<Dispute>(`/api/disputes/${id}/respond`, { method: "POST", body }),
  fileDispute: (
    body: { projectId: string; category: string; body?: string; voiceNote?: string },
    idempotencyKey: string,
  ) =>
    request<{ id: string; acknowledgement: string }>("/api/disputes", {
      method: "POST",
      body,
      idempotencyKey,
    }),

  /* Attestations and verification */
  attestations: (projectId: string) =>
    request<Attestation[]>(`/api/projects/${projectId}/attestations`),
  attestation: (id: string) => request<Attestation>(`/api/attestations/${id}`),
  disclosure: (id: string, body: { transferId: string }) =>
    request<{ leaf: string; proof: string[]; rootReference: string }>(
      `/api/attestations/${id}/disclosure`,
      { method: "POST", body },
    ),
  verifyAttestation: (body: { hash: string }) =>
    request<{ outcome: "match" | "no-match"; attestation: Attestation | null }>(
      "/api/verify/attestation",
      { method: "POST", body },
    ),
  verifyDisclosure: (body: { bundle: unknown }) =>
    request<DisclosureVerificationResult>("/api/verify/disclosure", {
      method: "POST",
      body,
    }),

  /* Field */
  /** Not in backend 4.3; see BUILD_LOG.md. The duplicate block has to happen
      while the agent is still with the household. */
  checkIdentity: (body: { type: "BVN" | "NIN"; number: string }) =>
    request<{ checked: boolean; lastFour: string }>("/api/field/identity-check", {
      method: "POST",
      body,
    }),
  bindDevice: (body: { deviceKey: string }) =>
    request<{ bound: boolean; deviceId: string }>("/api/field/device/bind", { method: "POST", body }),
  submitEnrolments: (body: { items: unknown[] }) =>
    request<{ clientUuid: string; accepted: boolean; code: ErrorCode | null }[]>(
      "/api/field/enrolments",
      { method: "POST", body },
    ),
  enrolment: (id: string) => request<unknown>(`/api/field/enrolments/${id}`),
  me: () =>
    request<{
      agent: Agent;
      today: { captured: number; queued: number; target: number };
      boundary: { name: string; north: number; south: number; east: number; west: number };
      flagThreshold: number;
    }>("/api/field/me"),

  /* Public */
  register: (query: { q?: string; country?: string; sort?: string; page?: number; per_page?: number } = {}) =>
    request<RegisterRow[]>("/api/public/register", { query }),
  publicProject: (id: string) =>
    request<{
      project: Project;
      attestations: Attestation[];
      disputes: { open: number; substantiated: number };
      signals: number;
    }>(`/api/public/projects/${id}`),
  publicDeveloper: (id: string) =>
    request<{
      developerId: string;
      developerName: string;
      projects: Project[];
      aggregate: { enrolled: number; paid: number };
    }>(`/api/public/developers/${id}`),
  publicAttestation: (id: string) => request<Attestation>(`/api/public/attestations/${id}`),
  geography: (id: string) =>
    request<{ buckets: GeographyBucket[]; resolution: number }>(
      `/api/public/projects/${id}/geography`,
    ),

  /* Verifier */
  watchlist: () => request<RegisterRow[]>("/api/verifier/watchlist"),
  watch: (body: { projectId: string }) =>
    request<{ watched: boolean }>("/api/verifier/watchlist", { method: "POST", body }),
  verifierProject: (id: string) =>
    request<{
      project: Project;
      attestations: Attestation[];
      /* A count, not a breakdown by class: which pattern the bank's
         monitoring raised is evidence, and the published form is the count. */
      signals: number;
      agentFlagRates: { agentId: string; flagRate: number; enrolments: number }[];
      geography: GeographyBucket[];
    }>(`/api/verifier/projects/${id}`),
  compare: (ids: string[]) =>
    request<{ projects: Project[]; comparablePeriods: string[]; unknown: string[] }>("/api/verifier/compare", {
      query: { ids: ids.join(",") },
    }),
  exportBundle: (
    body: { projectId: string; period: string; format: string; transferId?: string },
    idempotencyKey: string,
  ) =>
    request<{
      exportId: string;
      format: string;
      state: string;
      url?: string;
      bundle?: DisclosureBundle;
    }>("/api/verifier/export", { method: "POST", body, idempotencyKey }),
  verifierKeys: () => request<VerifierKey[]>("/api/verifier/keys"),
  issueVerifierKey: (body: { label: string }, idempotencyKey: string) =>
    request<VerifierKey>("/api/verifier/keys", { method: "POST", body, idempotencyKey }),
  alerts: () => request<VerifierAlert[]>("/api/verifier/alerts"),
  createAlert: (
    body: { projectId: string; condition: string; threshold: number },
    idempotencyKey: string,
  ) => request<VerifierAlert>("/api/verifier/alerts", { method: "POST", body, idempotencyKey }),

  /* Bank operations */
  signals: (query: { class?: string; severity?: string; page?: number } = {}) =>
    request<Signal[]>("/api/ops/signals", { query }),
  signal: (id: string) => request<Signal>(`/api/ops/signals/${id}`),
  signalGraph: (id: string) => request<AccountGraph>(`/api/ops/signals/${id}/graph`),
  cases: (query: { page?: number } = {}) => request<Case[]>("/api/ops/cases", { query }),
  caseAction: (id: string, body: { action: string; note: string }) =>
    request<Case>(`/api/ops/cases/${id}/action`, { method: "POST", body }),
  exceptions: (query: { page?: number } = {}) =>
    request<VerificationException[]>("/api/ops/exceptions", { query }),
  opsReconciliation: () => request<Reconciliation[]>("/api/ops/reconciliation"),

  /* Platform admin. Not in backend 4.3; see BUILD_LOG.md. */
  onboardingReviews: () => request<OnboardingReview[]>("/api/admin/onboarding"),
  registrySync: () => request<RegistrySync[]>("/api/admin/registry"),
  extractionReviews: () => request<ExtractionReview[]>("/api/admin/extraction"),
  chainChecks: () => request<ChainCheck[]>("/api/admin/chain"),
  escalations: () => request<Dispute[]>("/api/admin/escalations"),
  decideEscalation: (
    id: string,
    body: { outcome: "substantiated" | "unsubstantiated"; basis: string },
    idempotencyKey: string,
  ) => request<Dispute>(`/api/admin/escalations/${id}`, { method: "POST", body, idempotencyKey }),
  reviewOnboarding: (
    projectId: string,
    body: { decision: "approve" | "return"; note: string },
    idempotencyKey: string,
  ) =>
    request<{ projectId: string; decision: string; note: string; at: string }>(
      `/api/admin/onboarding/${projectId}`,
      { method: "POST", body, idempotencyKey },
    ),
  reviewExtraction: (
    projectId: string,
    field: string,
    body: { accepted: boolean; corrected?: string },
    idempotencyKey: string,
  ) =>
    request<{ projectId: string; decision: ExtractionReview["decision"] }>(
      `/api/admin/extraction/${projectId}/${encodeURIComponent(field)}`,
      { method: "POST", body, idempotencyKey },
    ),
  resyncRegistry: (registry: string, idempotencyKey: string) =>
    request<RegistrySync>(
      `/api/admin/registry/${encodeURIComponent(registry)}/sync`,
      { method: "POST", body: {}, idempotencyKey },
    ),

  /* Participant, unauthenticated */
  receipt: (token: string) => request<Receipt>(`/api/receipt/${token}`),
  confirmReceipt: (token: string) =>
    request<{ confirmedAt: string }>(`/api/receipt/${token}/confirm`, { method: "POST" }),
  disputeReceipt: (token: string, body: { category: string; body?: string }) =>
    request<{ disputeId: string }>(`/api/receipt/${token}/dispute`, { method: "POST", body }),
  /* Console administration. Not in backend 4.3; see BUILD_LOG.md. */
  consoleUsers: (projectId: string) =>
    request<ConsoleUser[]>(`/api/projects/${projectId}/users`),
  /* Each mutation takes the key its caller chose, so pressing a button twice
     is one change: a key minted inside the client would be a different key
     every time and the protection would be a header and nothing else. */
  inviteConsoleUser: (
    projectId: string,
    body: { name: string; email: string; role: ConsoleRole },
    idempotencyKey: string,
  ) =>
    request<ConsoleUser>(`/api/projects/${projectId}/users`, {
      method: "POST",
      body,
      idempotencyKey,
    }),
  changeConsoleRole: (id: string, body: { role: ConsoleRole }, idempotencyKey: string) =>
    request<ConsoleUser>(`/api/users/${id}`, { method: "PATCH", body, idempotencyKey }),
  removeConsoleUser: (id: string, idempotencyKey: string) =>
    request<{ id: string; removed: boolean }>(`/api/users/${id}`, {
      method: "DELETE",
      idempotencyKey,
    }),

  apiKeys: (projectId: string) => request<ApiKey[]>(`/api/projects/${projectId}/api-keys`),
  createApiKey: (projectId: string, body: { label: string }, idempotencyKey: string) =>
    request<ApiKey>(`/api/projects/${projectId}/api-keys`, {
      method: "POST",
      body,
      idempotencyKey,
    }),
  revokeApiKey: (id: string, idempotencyKey: string) =>
    request<{ id: string; revoked: boolean }>(`/api/api-keys/${id}`, {
      method: "DELETE",
      idempotencyKey,
    }),

  webhookEndpoints: (projectId: string) =>
    request<WebhookEndpoint[]>(`/api/projects/${projectId}/webhook-endpoints`),
  createWebhookEndpoint: (
    projectId: string,
    body: { url: string; events: string[] },
    idempotencyKey: string,
  ) =>
    request<WebhookEndpoint>(`/api/projects/${projectId}/webhook-endpoints`, {
      method: "POST",
      body,
      idempotencyKey,
    }),
  removeWebhookEndpoint: (id: string, idempotencyKey: string) =>
    request<{ id: string; removed: boolean }>(`/api/webhook-endpoints/${id}`, {
      method: "DELETE",
      idempotencyKey,
    }),

  notificationPreferences: () =>
    request<NotificationPreferences>("/api/notifications/preferences"),
  saveNotificationPreferences: (body: {
    events: Partial<Record<NotificationEvent, boolean>>;
  }) =>
    request<NotificationPreferences>("/api/notifications/preferences", {
      method: "PATCH",
      body,
    }),

  imports: (projectId: string) => request<ImportJob[]>(`/api/projects/${projectId}/imports`),
  importJob: (id: string) => request<ImportJob>(`/api/imports/${id}`),
};
