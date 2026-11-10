/* The API contract, as types. These match backend section 4 exactly. When the
   shared types package ships, these are replaced by an import and deleted. */

export const ERROR_CODES = [
  "FORBIDDEN",
  "RATE_LIMITED",
  "INVALID_REQUEST",
  "NOT_FOUND",
  "DUPLICATE_REQUEST",
  "IDENTITY_DUPLICATE",
  "BVN_MISMATCH",
  "IDENTITY_UNREACHABLE",
  "NAME_MISMATCH",
  "NAME_ENQUIRY_EXPIRED",
  "NAME_ENQUIRY_MISMATCH",
  "BOUNDARY_OUTSIDE",
  "GPS_UNAVAILABLE",
  "CONSENT_MISSING",
  "DEVICE_UNBOUND",
  "REGISTRY_NOT_FOUND",
  "REGISTRY_UNREACHABLE",
  "PDD_UNREADABLE",
  "PDD_NO_COMMITMENT",
  "EXTRACTION_LOW_CONFIDENCE",
  "MODEL_UNAVAILABLE",
  "ROSTER_EMPTY",
  "PERIOD_CLOSED",
  "FUNDING_NOT_RECEIVED",
  "FUNDING_INSUFFICIENT",
  "FUNDING_EXCLUDES_CHARGES",
  "PREFLIGHT_EXCLUSIONS_REQUIRED",
  "ACCOUNT_NOT_FOUND",
  "ACCOUNT_DORMANT",
  "ACCOUNT_RESTRICTED",
  "BENEFICIARY_FROZEN",
  "INSUFFICIENT_FUNDS",
  "LIMIT_EXCEEDED",
  "BANK_UNAVAILABLE",
  "TIMEOUT",
  "TRANSFER_REVERSED",
  "ANCHOR_PENDING",
  "ANCHOR_UNREACHABLE",
  "CHAIN_DISCONTINUITY",
  "PROOF_INVALID",
  "LEAF_NOT_IN_ROOT",
  "TOKEN_EXPIRED",
  "ALREADY_CONFIRMED",
  "DISPUTE_ALREADY_OPEN",
  "DISPUTE_RESOLUTION_BASIS_REQUIRED",
  "RECONCILIATION_MISMATCH",
  "PARTICIPANT_DELETE_NOT_PERMITTED",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiError = {
  code: ErrorCode;
  message: string;
  field: string | null;
  remediation: string;
};

export type Meta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type SuccessEnvelope<T> = {
  status: "success";
  message: string;
  data: T;
  meta: Meta | null;
  request_id: string;
};

export type ErrorEnvelope = {
  status: "error";
  error: ApiError;
  request_id: string;
};

export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

/* ---- Domain shapes ------------------------------------------------------ */

/** Amounts are NGN decimal strings with two places, matching the bank. They
    are never parsed into a float and never converted into another unit. */
export type Amount = string;

export type Commitment = {
  percentage: number;
  basis: "net" | "gross";
  cadence: "quarterly" | "annual";
  beneficiary: string;
  sourceQuote: string;
  page: number;
  confidence: number;
  corrected: boolean;
  originalPercentage: number | null;
  correctionReason: string | null;
};

export type RegistryRecord = {
  registryId: string;
  registry: string;
  name: string;
  country: string;
  methodology: string;
  boundaryName: string;
  issuances: { vintage: string; credits: number; retired: number }[];
};

export type ProjectStatus = "onboarding" | "active" | "suspended" | "withdrawn";

export type Project = {
  id: string;
  developerId: string;
  developerName: string;
  name: string;
  registry: string;
  registryId: string;
  country: string;
  state: string;
  localGovernment: string;
  methodology: string;
  status: ProjectStatus;
  commitment: Commitment;
  enrolled: number;
  /** The households the project undertook to enrol in this programme. The
      figure enrolment is measured against; without it "enrolled against
      target" has no denominator. */
  enrolmentTarget: number;
  paid: number;
  openDisputes: number;
  substantiatedDisputes: number;
  signalCount: number;
  confirmationRate: number;
  lastClosedPeriod: string | null;
  periods: PeriodSummary[];
};

export type PeriodSummary = {
  period: string;
  state: "open" | "closed" | "closed-late";
  enrolled: number;
  paid: number;
  amountToHouseholds: Amount;
  chargesBorne: Amount;
  required: Amount;
  /** What the commitment required and the households did not receive. */
  shortfall: Amount;
  /** What the households received beyond the commitment. Both are stated, so
      a zero shortfall is never confused with an over-payment. */
  surplus: Amount;
  /** The date the period closes on. A front end computing it from the
      period's label would be deriving a fact the record already holds. */
  closesOn: string;
  closedAt: string | null;
  attestationId: string | null;
  corrected: boolean;
  /** Settlement and acknowledgement are separate facts, and both are shown. */
  confirmationRate: number;
};

export type ParticipantStatus =
  | "active"
  | "flagged"
  | "excluded"
  | "disputed"
  | "duplicate-blocked"
  | "removed";

export type Participant = {
  id: string;
  projectId: string;
  name: string;
  phoneMasked: string;
  community: string;
  localGovernment: string;
  walletState: "active" | "dormant" | "restricted" | "unopened";
  tier: 1 | 2 | 3;
  accountNumber: string;
  accountName: string;
  nameMatch: "match" | "mismatch" | "unchecked";
  /* 6A.6: an identity number is held as a hash plus its last four. The full
     value never reaches a surface, so the contract does not carry one. */
  bvnLastFour: string;
  ninLastFour: string;
  enrolledAt: string;
  syncDelaySeconds: number;
  agentId: string;
  agentName: string;
  status: ParticipantStatus;
  statusReason: string | null;
  flags: string[];
  boundary: "inside" | "outside";
};

export type Payment = {
  transferId: string;
  period: string;
  amount: Amount;
  state: TransferState;
  sessionId: string | null;
  settledAt: string | null;
  confirmedAt: string | null;
  disputeId: string | null;
};

export type Agent = {
  id: string;
  projectId: string;
  name: string;
  email: string;
  enrolments: number;
  flagRate: number;
  averageSyncDelaySeconds: number;
  status: "active" | "suspended" | "invited";
  aboveFlagThreshold: boolean;
  deviceBound: boolean;
};

export type RunState =
  | "draft"
  | "awaiting-funding"
  | "funded"
  | "preflight-running"
  | "preflight-failed"
  | "executing"
  | "partially-complete"
  | "complete"
  | "cancelled"
  | "failed";

export type Run = {
  id: string;
  projectId: string;
  period: string;
  state: RunState;
  rosterSize: number;
  declaredGross: Amount;
  fundingAmount: Amount;
  createdAt: string;
  executedAt: string | null;
  counts: Record<TransferState, number>;
  failures: { class: ErrorCode; count: number }[];
};

export type Arithmetic = {
  commitmentPct: number;
  declaredGross: Amount;
  required: Amount;
  estimatedCharges: Amount;
  totalNeeded: Amount;
  funded: Amount;
  shortfall: Amount;
};

export type TransferState =
  | "queued"
  | "in_flight"
  | "settled"
  | "failed"
  | "reversed"
  | "unconfirmed";

export type Transfer = {
  id: string;
  runId: string;
  participantId: string;
  participantName: string;
  community: string;
  amount: Amount;
  fee: Amount;
  vat: Amount;
  stamp_duty: Amount;
  total_debit: Amount;
  state: TransferState;
  failureClass: ErrorCode | null;
  sessionId: string | null;
  queuedAt: string;
  settledAt: string | null;
  confirmedAt: string | null;
  rail: "intrabank" | "interbank";
};

export type Attestation = {
  id: string;
  projectId: string;
  projectName: string;
  period: string;
  enrolled: number;
  paid: number;
  amountToHouseholds: Amount;
  chargesBorne: Amount;
  required: Amount;
  shortfall: Amount;
  confirmationRate: number;
  hash: string;
  previousHash: string | null;
  merkleRoot: string;
  chainPosition: number;
  anchor: { network: string; topicId: string; sequence: number | null; at: string | null };
  anchorState: "anchored" | "pending" | "unreachable";
  /** True where this record does not chain to the period before it. The break
      is published; neither record is rewritten. */
  chainBreak: boolean;
  supersededBy: string | null;
  supersedes: string | null;
  /** On a correction, what it changed and why. A record that supersedes
      another states the difference rather than leaving a reader to diff two
      published documents. */
  correction?: {
    field: string;
    from: string;
    to: string;
    reason: string;
  };
  closedAt: string;
  closedLate: boolean;
};

export type Dispute = {
  id: string;
  projectId: string;
  projectName: string;
  participantId: string | null;
  participantName: string | null;
  period: string;
  category: "not-received" | "wrong-amount" | "not-enrolled";
  body: string;
  state:
    | "open"
    | "developer-responded"
    | "awaiting-participant"
    | "substantiated"
    | "unsubstantiated"
    | "escalated";
  resolutionBasis: string | null;
  transferId: string | null;
  raisedAt: string;
  updatedAt: string;
  responses: { at: string; author: string; body: string }[];
};

export type Signal = {
  id: string;
  class:
    | "onward-concentration"
    | "velocity"
    | "shared-device"
    | "dormant-reactivation"
    | "round-tripping";
  severity: "low" | "medium" | "high";
  projectId: string;
  projectName: string;
  period: string;
  accounts: number;
  raisedAt: string;
  state: "open" | "attached" | "closed";
  caseId: string | null;
  summary: string;
};

export type GraphNode = {
  id: string;
  label: string;
  kind: "household" | "intermediary" | "concentrator";
  amount: Amount;
};

export type GraphEdge = {
  from: string;
  to: string;
  amount: Amount;
  hop: number;
  minutesAfterSettlement: number;
};

export type AccountGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  sampled: boolean;
  sampleSize: number;
  populationSize: number;
};

export type Case = {
  id: string;
  signalIds: string[];
  projectId: string;
  projectName: string;
  severity: "low" | "medium" | "high";
  state: "open" | "investigating" | "substantiated" | "unsubstantiated" | "closed";
  openedAt: string;
  actions: { at: string; action: string; note: string; by: string }[];
};

export type VerificationException = {
  id: string;
  kind: "failed-check" | "name-mismatch" | "tier-limit";
  projectId: string;
  projectName: string;
  participantRef: string;
  detail: string;
  raisedAt: string;
  resolution: string | null;
};

export type Reconciliation = {
  projectId: string;
  projectName: string;
  period: string;
  inbound: Amount;
  outbound: Amount;
  charges: Amount;
  balance: Amount;
  state: "reconciled" | "mismatch" | "period-open" | "awaiting-settlement";
  delta: Amount;
  candidateCauses: string[];
};

export type Receipt = {
  token: string;
  participantName: string;
  projectName: string;
  payments: {
    period: string;
    amount: Amount;
    settledAt: string;
    confirmedAt: string | null;
    sessionId: string;
  }[];
  disputeOpen: boolean;
};

export type RegisterRow = {
  id: string;
  name: string;
  developerName: string;
  country: string;
  registry: string;
  registryId: string;
  commitmentPct: number;
  enrolled: number;
  paid: number;
  lastClosedPeriod: string | null;
  /** The figures for the period named above. `paid` and `enrolled` are the
      project's current ones, which belong to the open period; printing those
      under a closed period's label states the wrong figures for it. */
  lastClosedPaid: number;
  lastClosedEnrolled: number;
  lastClosedConfirmationRate: number;
  openDisputes: number;
  status: ProjectStatus;
};

export type GeographyBucket = {
  h3: string;
  centroid: [number, number];
  households: number;
};

export type Tariff = {
  schedule: string;
  rows: { band: string; min: Amount; max: Amount | null; fee: Amount; vat: Amount; stamp_duty: Amount; total: Amount }[];
  intrabank: { fee: Amount; vat: Amount; stamp_duty: Amount; total: Amount };
};

export type Session = {
  userId: string;
  email: string;
  organisation: string;
  role: "developer" | "institution" | "agent" | "ops" | "admin";
  projectId: string | null;
  emailVerified: boolean;
};

export type Invite = {
  code: string;
  projectName: string;
  agentName: string;
  state: "valid" | "expired" | "redeemed" | "revoked";
  expiresAt: string;
};

export type ExtractionResult = {
  commitment: Commitment;
  sourceQuote: string;
  page: number;
  confidence: number;
};

export type DisclosureBundle = {
  /* The facts the leaf is computed from. A verifier recomputes the leaf from
     these rather than trusting the hash it was handed, so a hash lifted from
     a published record cannot be presented as a payment. */
  transfer: {
    id: string;
    amount: Amount;
    sessionId: string | null;
    settledAt: string | null;
  };
  leaf: string;
  proof: string[];
  rootReference: string;
  attestationId: string;
  period: string;
  projectName: string;
};

export type VerificationResult = {
  outcome: "match" | "no-match";
  attestation: Attestation | null;
  checkedAt: string;
};

export type DisclosureVerificationResult = {
  outcome: "match" | "no-match";
  period: string | null;
  projectName: string | null;
  anchorReachable: boolean;
  /** Set when the record the proof holds against has since been corrected. A
      proof that holds against a withdrawn record is still a proof, and a
      reader has to be told which record they are citing. */
  supersededBy?: string | null;
  checkedAt: string;
};

/* ---- Platform admin -------------------------------------------------------

   Backend 4.3 enumerates none of these. F-9 asks for project onboarding
   review, registry sync with its failure log, an extraction review queue, the
   escalations a project cannot resolve itself, and a monitor on the
   attestation chain. Named here for the backend lane to adopt or amend. */

export type OnboardingReview = {
  projectId: string;
  projectName: string;
  developerName: string;
  registry: string;
  registryId: string;
  /** Where the project is in review, and what is outstanding. */
  state:
    | "awaiting-review"
    | "registry-unverified"
    | "kyb-outstanding"
    | "approved"
    | "returned";
  submittedAt: string;
  outstanding: string[];
  /** The reason the platform decided on, which is the record of why a page
      is public or why a submission went back. Null until a decision. */
  decidedNote: string | null;
  decidedAt: string | null;
  /** True where the registry could not be reached and the details were
      entered by hand, which is the case that needs a person. */
  manualEntry: boolean;
};

export type RegistrySync = {
  registry: string;
  lastSyncedAt: string;
  projects: number;
  state: "synced" | "stale" | "failing";
  failures: { at: string; registryId: string; reason: string }[];
};

export type ExtractionReview = {
  projectId: string;
  projectName: string;
  field: string;
  extracted: string;
  confidence: number;
  sourceQuote: string;
  page: number;
  /** Set once a reviewer has decided; the extraction stays either way. */
  decision: { at: string; by: string; accepted: boolean; corrected: string | null } | null;
};

export type VerifierKey = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  /** Returned once, at issue, and never again. */
  secret: string | null;
};

export type ChainCheck = {
  projectId: string;
  projectName: string;
  period: string;
  attestationId: string;
  /** Each record's hash is the previous record's input. A break is published
      rather than repaired, so this monitor reports rather than fixes. */
  chains: boolean;
  anchorState: "anchored" | "pending" | "unreachable";
  checkedAt: string;
};

export type VerifierAlert = {
  id: string;
  projectId: string;
  /** What the alert watches. The condition is a fact about a record, never a
      judgement: a coverage figure below a number the verifier chose, a period
      closed after its own date, a correction published. */
  condition:
    | "coverage-below"
    | "dispute-raised"
    | "period-closed-late"
    | "correction-issued";
  threshold: number;
  firedAt: string | null;
  /** The record that fired it, so the alert is a pointer rather than a claim. */
  record: string | null;
};

export type PreflightExclusion = {
  participantId: string;
  reason: ErrorCode;
  detail: string;
  /** True once the exclusion has been confirmed with a reason. */
  excluded?: boolean;
};

/* ---- Console settings and roster imports ----------------------------------

   Backend section 4.3 enumerates no endpoint for the console's own
   administration — users and roles, API keys, webhook endpoints, notification
   preferences — and none for the state of a roster import, which F-5 requires
   to be resumable and partially downloadable. These five shapes are named here
   so the two lanes carry the same ones, and the decision is recorded in
   BUILD_LOG.md for the backend lane to adopt or amend. */

export type ConsoleRole = "admin" | "operator" | "viewer";

export type ConsoleUser = {
  id: string;
  name: string;
  email: string;
  role: ConsoleRole;
  invitedAt: string;
  lastSignInAt: string | null;
  /** The signed-in reader, who may not remove their own last admin role. */
  self: boolean;
};

export type ApiKey = {
  id: string;
  label: string;
  /** The first eight characters, which is all that is held after creation. */
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Returned once, at creation, and never again. */
  secret: string | null;
};

export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  lastDeliveryAt: string | null;
  lastDeliveryState: "delivered" | "failed" | "none";
};

/* The five events the console notifies on, per spec patch 01 item 15: each is
   email to the user who turned it on, and every one defaults on. */
export const NOTIFICATION_EVENTS = [
  "dispute.opened",
  "run.complete",
  "funding.received",
  "period.closing",
  "reconciliation.mismatch",
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export type NotificationPreferences = {
  userId: string;
  /** Every event defaults on. A reader turns one off deliberately. */
  events: Record<NotificationEvent, boolean>;
};

export type ImportFailure = {
  /** The row number in the uploaded file, header row counted as 1. */
  row: number;
  errorCode: ErrorCode;
  errorMessage: string;
  values: Record<string, string>;
};

export type ImportJob = {
  id: string;
  projectId: string;
  filename: string;
  state: "running" | "complete" | "partially-failed";
  rows: number;
  imported: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
  failures: ImportFailure[];
};
