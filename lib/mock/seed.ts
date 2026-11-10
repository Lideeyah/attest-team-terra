import { fixtureShares, onSharesChanged } from "@/lib/mock/forced";
import type {
  AccountGraph,
  Agent,
  ErrorCode,
  Amount,
  Attestation,
  Case,
  Commitment,
  Dispute,
  GeographyBucket,
  Participant,
  PeriodSummary,
  Project,
  Reconciliation,
  Run,
  Signal,
  Tariff,
  Transfer,
  TransferState,
  VerificationException,
} from "@/lib/api/contract";

/* The fixture seed. Everything here is deterministic: the same index always
   produces the same household, so a screenshot taken today matches one taken
   next week and a test can name a row. Identifiers are synthetic. */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GIVEN_NAMES = [
  "Adaeze", "Ebong", "Ngozi", "Musa", "Blessing", "Ifeoma", "Okon", "Hauwa",
  "Chinedu", "Aisha", "Emeka", "Rukayat", "Ubong", "Folasade", "Ikechukwu",
  "Zainab", "Obinna", "Amaka", "Bassey", "Halima", "Chiamaka", "Sadiq",
  "Eno", "Yetunde", "Nkechi", "Abubakar", "Idongesit", "Temitope", "Uche",
  "Fatima", "Edet", "Olamide", "Nneka", "Garba", "Affiong", "Damilola",
];

const FAMILY_NAMES = [
  "Okonkwo", "Asuquo", "Eyo", "Abdullahi", "Udoh", "Nwachukwu", "Effiong",
  "Ibrahim", "Oyelaran", "Bassey", "Adeyemi", "Okoro", "Etim", "Danjuma",
  "Nwosu", "Ekpenyong", "Lawal", "Obi", "Archibong", "Sanusi", "Agbo",
  "Ironsi", "Ndifon", "Yusuf", "Ogar", "Inyang", "Chukwu", "Adamu",
];

const EKURI_COMMUNITIES = [
  "Old Ekuri", "New Ekuri", "Okokori", "Iko Esai", "Owai", "Agoi Ekpo",
  "Etara", "Eyeyen",
];

const HADEJIA_COMMUNITIES = [
  "Marma", "Kafin Hausa", "Auyo", "Guri", "Kirikasamma",
];

const DELTA_COMMUNITIES = [
  "Akassa", "Koluama", "Odioma", "Sangana", "Brass",
];

export const AMOUNT_PER_HOUSEHOLD: Amount = "23050.00";

/** What one household is paid, which differs by project because the
    commitment and the issuance behind it differ. */
const AMOUNT_BY_PROJECT: Record<string, Amount> = {
  proj_ekuri: "23050.00",
  proj_hadejia: "19400.00",
  proj_delta: "21400.00",
};

/* One project in the register simply worked: every transfer cleared and the
   commitment was met. Without it there is no comparator for the others. */
const SHARES_BY_PROJECT: Record<string, { failureShare: number; reversalShare: number }> = {
  proj_hadejia: { failureShare: 0, reversalShare: 0 },
};

function naira(value: number): Amount {
  return value.toFixed(2);
}

export function addAmounts(...values: Amount[]): Amount {
  /* Decimal strings are added in minor units so no float ever touches an
     amount. The contract forbids parsing one into a float. */
  const total = values.reduce((sum, value) => {
    const [major, minor = "00"] = value.split(".");
    return sum + Number(major) * 100 + Number(minor.padEnd(2, "0"));
  }, 0);
  return naira(total / 100);
}

export function multiplyAmount(value: Amount, factor: number): Amount {
  const [major, minor = "00"] = value.split(".");
  const minorUnits = Number(major) * 100 + Number(minor.padEnd(2, "0"));
  return naira(Math.round(minorUnits * factor) / 100);
}

export function subtractAmounts(left: Amount, right: Amount): Amount {
  const toMinor = (value: Amount) => {
    const [major, minor = "00"] = value.split(".");
    return Number(major) * 100 + Number(minor.padEnd(2, "0"));
  };
  return naira(Math.max(0, toMinor(left) - toMinor(right)) / 100);
}

/* ---- The commitment ------------------------------------------------------ */

const EKURI_COMMITMENT: Commitment = {
  percentage: 60,
  basis: "net",
  cadence: "quarterly",
  beneficiary:
    "Households resident in the Ekuri community forest area and enrolled in the benefit-sharing register",
  sourceQuote:
    "At least sixty percent of net revenue from the sale of verified emission reductions shall be distributed to participating households in the Ekuri community, quarterly, in the year following issuance.",
  page: 44,
  confidence: 0.94,
  corrected: true,
  originalPercentage: 50,
  correctionReason:
    "The extraction read the forty-year average rather than the current benefit-sharing clause on page 44.",
};

const HADEJIA_COMMITMENT: Commitment = {
  percentage: 55,
  basis: "gross",
  cadence: "annual",
  beneficiary:
    "Registered farming households within the Hadejia-Nguru wetland project boundary",
  sourceQuote:
    "Fifty-five percent of gross revenue from issued credits is payable annually to registered farming households within the project boundary.",
  page: 31,
  confidence: 0.91,
  corrected: false,
  originalPercentage: null,
  correctionReason: null,
};

const DELTA_COMMITMENT: Commitment = {
  percentage: 70,
  basis: "net",
  cadence: "quarterly",
  beneficiary:
    "Mangrove user groups and fishing households in the Akassa and Koluama clusters",
  sourceQuote:
    "Seventy percent of net proceeds shall be paid to mangrove user groups and fishing households in the Akassa and Koluama clusters each quarter.",
  page: 52,
  confidence: 0.88,
  corrected: false,
  originalPercentage: null,
  correctionReason: null,
};

const CALABAR_COMMITMENT: Commitment = {
  percentage: 65,
  basis: "net",
  cadence: "quarterly",
  beneficiary:
    "Households in the nine communities bordering the Oban Hills block of Cross River National Park",
  sourceQuote:
    "Sixty-five percent of net revenue from issued credits shall be distributed quarterly to households in the nine communities bordering the Oban Hills block.",
  page: 38,
  confidence: 0.9,
  corrected: false,
  originalPercentage: null,
  correctionReason: null,
};

/* ---- Periods -------------------------------------------------------------- */

/* A period carries only what is declared: which period it is, whether it is
   open, when it closed and whether it was corrected. Every figure in it is
   computed from the run behind it by computeCoverage below, because a figure
   that can be typed is a figure that can be authored. */
function periodStub(
  period: string,
  state: PeriodSummary["state"],
  closedAt: string | null,
  attestationId: string | null,
  corrected = false,
): PeriodSummary {
  return {
    period,
    state,
    enrolled: 0,
    paid: 0,
    amountToHouseholds: "0.00",
    chargesBorne: "0.00",
    required: "0.00",
    shortfall: "0.00",
    surplus: "0.00",
    closedAt,
    attestationId,
    corrected,
    confirmationRate: 0,
  };
}

function ekuriPeriods(): PeriodSummary[] {
  return [
    periodStub("2026-Q1", "closed", "2026-04-01T09:12:44Z", "att_ekuri_2026q1"),
    periodStub("2026-Q2", "closed-late", "2026-07-14T16:02:10Z", "att_ekuri_2026q2"),
    periodStub("2026-Q3", "closed", "2026-10-01T08:30:02Z", "att_ekuri_2026q3", true),
    periodStub("2026-Q4", "open", null, null),
  ];
}

/* ---- Projects ------------------------------------------------------------- */

export const PROJECTS: Project[] = [
  {
    id: "proj_ekuri",
    developerId: "dev_ekuri",
    developerName: "Ekuri Initiative Limited",
    name: "Ekuri Community Forest Carbon Project",
    registry: "Gold Standard",
    registryId: "GS-10342",
    country: "Nigeria",
    state: "Cross River",
    localGovernment: "Akamkpa",
    methodology: "Gold Standard AR-ACM0003, afforestation and avoided deforestation",
    status: "active",
    commitment: EKURI_COMMITMENT,
    enrolled: 2090,
    paid: 1284,
    openDisputes: 4,
    substantiatedDisputes: 1,
    signalCount: 2,
    confirmationRate: 0.81,
    lastClosedPeriod: "2026-Q3",
    periods: ekuriPeriods(),
  },
  {
    id: "proj_hadejia",
    developerId: "dev_hadejia",
    developerName: "Hadejia Wetlands Cooperative",
    name: "Hadejia-Nguru Wetland Restoration",
    registry: "Gold Standard",
    registryId: "GS-10877",
    country: "Nigeria",
    state: "Jigawa",
    localGovernment: "Kafin Hausa",
    methodology: "Gold Standard wetland restoration, soil carbon",
    status: "active",
    commitment: HADEJIA_COMMITMENT,
    enrolled: 846,
    paid: 846,
    openDisputes: 0,
    substantiatedDisputes: 0,
    signalCount: 0,
    confirmationRate: 0.93,
    lastClosedPeriod: "2026-Q3",
    periods: [
      periodStub("2026-Q2", "closed", "2026-07-01T10:04:19Z", "att_hadejia_2026q2"),
      periodStub("2026-Q3", "closed", "2026-10-01T09:41:55Z", "att_hadejia_2026q3"),
    ],
  },
  {
    id: "proj_delta",
    developerId: "dev_delta",
    developerName: "Niger Delta Blue Carbon Limited",
    name: "Akassa Mangrove Carbon Project",
    registry: "Gold Standard",
    registryId: "GS-11204",
    country: "Nigeria",
    state: "Bayelsa",
    localGovernment: "Brass",
    methodology: "Gold Standard blue carbon, mangrove restoration",
    status: "active",
    commitment: DELTA_COMMITMENT,
    enrolled: 1402,
    paid: 1308,
    openDisputes: 11,
    substantiatedDisputes: 3,
    signalCount: 5,
    confirmationRate: 0.34,
    lastClosedPeriod: "2026-Q3",
    periods: [
      periodStub("2026-Q3", "closed", "2026-10-02T11:18:07Z", "att_delta_2026q3"),
    ],
  },
  {
    id: "proj_oban",
    developerId: "dev_oban",
    developerName: "Oban Hills Community Trust",
    name: "Oban Hills Community Forest Project",
    registry: "Gold Standard",
    registryId: "GS-11460",
    country: "Nigeria",
    state: "Cross River",
    localGovernment: "Akamkpa",
    methodology: "Gold Standard AR-ACM0003, avoided deforestation",
    status: "onboarding",
    commitment: CALABAR_COMMITMENT,
    enrolled: 0,
    paid: 0,
    openDisputes: 0,
    substantiatedDisputes: 0,
    signalCount: 0,
    confirmationRate: 0,
    lastClosedPeriod: null,
    /* Onboarded, nothing closed. Its figures are explicit zeros, because a
       project that has paid nobody is a fact the register publishes rather
       than an absence it hides. */
    periods: [periodStub("2026-Q4", "open", null, null)],
  },
];

export function projectById(id: string): Project | undefined {
  return PROJECTS.find((project) => project.id === id);
}

/* ---- Agents --------------------------------------------------------------- */

export const AGENTS: Agent[] = [
  {
    id: "agt_0001",
    projectId: "proj_ekuri",
    name: "Bassey Archibong",
    email: "bassey.archibong@ekuri-initiative.ng",
    enrolments: 612,
    flagRate: 0.018,
    averageSyncDelaySeconds: 2140,
    status: "active",
    aboveFlagThreshold: false,
    deviceBound: true,
  },
  {
    id: "agt_0002",
    projectId: "proj_ekuri",
    name: "Affiong Ndifon",
    email: "affiong.ndifon@ekuri-initiative.ng",
    enrolments: 548,
    flagRate: 0.031,
    averageSyncDelaySeconds: 3620,
    status: "active",
    aboveFlagThreshold: false,
    deviceBound: true,
  },
  {
    id: "agt_0003",
    projectId: "proj_ekuri",
    name: "Okon Edet Inyang",
    email: "okon.inyang@ekuri-initiative.ng",
    enrolments: 731,
    flagRate: 0.094,
    averageSyncDelaySeconds: 11480,
    status: "active",
    aboveFlagThreshold: true,
    deviceBound: true,
  },
  {
    id: "agt_0004",
    projectId: "proj_ekuri",
    name: "Nkechi Agbo",
    email: "nkechi.agbo@ekuri-initiative.ng",
    enrolments: 199,
    flagRate: 0.015,
    averageSyncDelaySeconds: 1820,
    status: "suspended",
    aboveFlagThreshold: false,
    deviceBound: false,
  },
  {
    id: "agt_0005",
    projectId: "proj_ekuri",
    name: "Idongesit Ekpenyong",
    email: "idongesit.ekpenyong@ekuri-initiative.ng",
    enrolments: 0,
    flagRate: 0,
    averageSyncDelaySeconds: 0,
    status: "invited",
    aboveFlagThreshold: false,
    deviceBound: false,
  },
];

/* ---- Participants --------------------------------------------------------- */

/* Section 2.5 trigger values. A handful of seeded households carry them so
   the failure they produce is reachable against the sandbox itself. */
function triggerAccount(index: number): string | null {
  if (index % 1009 === 3) {
    return "0000000001"; /* ACCOUNT_NOT_FOUND */
  }
  if (index % 1009 === 7) {
    return "0000000002"; /* TIMEOUT after ten seconds */
  }
  return null;
}

/** The amount a household is paid, carrying a trigger suffix where the seed
    deliberately exercises one. Amounts ending .00 never trigger. */
export function amountForIndex(projectId: string, index: number): string {
  const base = AMOUNT_BY_PROJECT[projectId] ?? AMOUNT_PER_HOUSEHOLD;
  const major = base.split(".")[0];
  const suffix = index % 1009;
  const TRIGGERS: Record<number, string> = {
    11: "01" /* INSUFFICIENT_FUNDS */,
    13: "02" /* TIMEOUT, then failed and reversed */,
    17: "03" /* pending, then successful */,
    19: "04" /* successful, then reversed about a minute later */,
    23: "05" /* first webhook delivery withheld */,
  };
  const trigger = TRIGGERS[suffix];
  return trigger ? `${major}.${trigger}` : base;
}

const FLAG_LABELS = [
  "Outside boundary",
  "Name mismatch",
  "Sync delay over 24 hours",
  "Shared device",
];

function communitiesFor(projectId: string): string[] {
  if (projectId === "proj_hadejia") {
    return HADEJIA_COMMUNITIES;
  }
  if (projectId === "proj_delta") {
    return DELTA_COMMUNITIES;
  }
  return EKURI_COMMUNITIES;
}

/** Participants are generated from their index, so the roster can be any size
    without a fixture file and row 9,999 is as real as row 1. */
export function participantAt(projectId: string, index: number): Participant {
  const random = mulberry32(index * 2654435761 + projectId.length);
  const given = GIVEN_NAMES[Math.floor(random() * GIVEN_NAMES.length)];
  const family = FAMILY_NAMES[Math.floor(random() * FAMILY_NAMES.length)];
  const communities = communitiesFor(projectId);
  const community = communities[index % communities.length];
  const project = projectById(projectId);
  const agents = AGENTS.filter((agent) => agent.projectId === projectId);
  const agent = agents.length > 0 ? agents[index % agents.length] : AGENTS[0];

  const outsideBoundary = index % 211 === 0;
  const nameMismatch = index % 97 === 0;
  const duplicate = index % 613 === 0;
  const removed = index % 457 === 0;
  const disputed = index % 331 === 0;
  const excluded = index % 173 === 0;

  const flags: string[] = [];
  if (outsideBoundary) {
    flags.push(FLAG_LABELS[0]);
  }
  if (nameMismatch) {
    flags.push(FLAG_LABELS[1]);
  }
  if (index % 89 === 0) {
    flags.push(FLAG_LABELS[2]);
  }
  if (index % 401 === 0) {
    flags.push(FLAG_LABELS[3]);
  }

  const status: Participant["status"] = duplicate
    ? "duplicate-blocked"
    : removed
      ? "removed"
      : disputed
        ? "disputed"
        : excluded
          ? "excluded"
          : flags.length > 0
            ? "flagged"
            : "active";

  const statusReason =
    status === "removed"
      ? "Household relocated outside the project boundary. Confirmed by the community liaison on 12 August 2026."
      : status === "excluded"
        ? "Excluded from the 2026-Q4 run pending a re-run of name enquiry."
        : status === "duplicate-blocked"
          ? "A second enrolment carries the same bank verification number."
          : null;

  const line = String(8_030_000_000 + index * 7919).slice(0, 10);
  const tier: Participant["tier"] = index % 7 === 0 ? 1 : index % 3 === 0 ? 3 : 2;

  return {
    id: `ptc_${String(index + 1).padStart(6, "0")}`,
    projectId,
    name: `${given} ${family}`,
    phoneMasked: `0${line.slice(0, 3)} *** ${line.slice(-4)}`,
    community,
    localGovernment: project?.localGovernment ?? "Akamkpa",
    walletState:
      index % 311 === 0 ? "dormant" : index % 509 === 0 ? "restricted" : "active",
    tier,
    accountNumber: triggerAccount(index) ?? `01${String(23_000_000 + index * 13).slice(0, 8)}`,
    accountName: nameMismatch
      ? `${FAMILY_NAMES[(index + 3) % FAMILY_NAMES.length].toUpperCase()} ${given.toUpperCase()}`
      : `${given.toUpperCase()} ${family.toUpperCase()}`,
    nameMatch: nameMismatch ? "mismatch" : "match",
    /* Synthetic identifiers in the sandbox's own style: BVNs follow
       222000000NN and NINs 700000000NN, and only the last four are carried. */
    bvnLastFour: `222000000${String(index % 100).padStart(2, "0")}`.slice(-4),
    ninLastFour: `700000000${String(index % 100).padStart(2, "0")}`.slice(-4),
    enrolledAt: new Date(
      Date.UTC(2026, 0, 14) + index * 2_400_000,
    ).toISOString(),
    syncDelaySeconds: Math.floor(random() * (agent.averageSyncDelaySeconds + 600)),
    agentId: agent.id,
    agentName: agent.name,
    status,
    statusReason,
    flags,
    boundary: outsideBoundary ? "outside" : "inside",
  };
}

export function participants(projectId: string, total: number): Participant[] {
  return Array.from({ length: total }, (_, index) =>
    participantAt(projectId, index),
  );
}

/* ---- Charges, read from the tariff rather than computed in a screen ------- */

export const TARIFF: Tariff = {
  schedule: "Event schedule, confirmed 9 November 2026",
  intrabank: { fee: "0.00", vat: "0.00", stamp_duty: "0.00", total: "0.00" },
  rows: [
    { band: "NIP up to ₦5,000", min: "0.00", max: "5000.00", fee: "10.00", vat: "0.75", stamp_duty: "0.00", total: "10.75" },
    { band: "NIP ₦5,001 to ₦50,000", min: "5000.01", max: "50000.00", fee: "25.00", vat: "1.88", stamp_duty: "0.00", total: "26.88" },
    { band: "NIP above ₦50,000", min: "50000.01", max: null, fee: "50.00", vat: "3.75", stamp_duty: "0.00", total: "53.75" },
  ],
};

function minorUnits(value: Amount): number {
  const [major, minor = "00"] = value.split(".");
  return Number(major) * 100 + Number(minor.padEnd(2, "0"));
}

/** The charge for one transfer, matched to its amount and its rail. Charges
    are read from the schedule, never computed from a remembered formula, so a
    switch to another schedule changes the figures and nothing else. */
export function chargeFor(
  amount: Amount,
  rail: "intrabank" | "interbank",
): { fee: Amount; vat: Amount; stamp_duty: Amount; total: Amount } {
  if (rail === "intrabank") {
    return TARIFF.intrabank;
  }
  const value = minorUnits(amount);
  const band =
    TARIFF.rows.find(
      (row) =>
        value >= minorUnits(row.min) &&
        (row.max === null || value <= minorUnits(row.max)),
    ) ?? TARIFF.rows[TARIFF.rows.length - 1];
  return { fee: band.fee, vat: band.vat, stamp_duty: band.stamp_duty, total: band.total };
}

/* ---- Runs and transfers --------------------------------------------------- */

const FAILURE_CLASSES = [
  "ACCOUNT_NOT_FOUND",
  "ACCOUNT_DORMANT",
  "LIMIT_EXCEEDED",
  "TIMEOUT",
  "INSUFFICIENT_FUNDS",
] as const;

/* How many households in a hundred acknowledge the payment. Akassa's figure
   is the pattern worth looking at: the money cleared and the households did
   not confirm it, which is what the onward-flow signal is about. */
const CONFIRMATION_RATE: Record<string, number> = {
  proj_ekuri: 81,
  proj_hadejia: 93,
  proj_delta: 34,
};

/* When each run executed. A transfer's timestamps hang off this. */
const RUN_EXECUTION: Record<string, string> = {
  run_2026q1: "2026-03-30T09:02:00Z",
  run_2026q2: "2026-07-12T11:20:00Z",
  run_2026q3: "2026-09-29T10:14:02Z",
  run_2026q4: "2026-11-09T13:20:00Z",
  run_hadejia_q2: "2026-06-30T10:00:00Z",
  run_hadejia_q3: "2026-09-30T09:30:00Z",
  run_delta_q3: "2026-09-30T14:10:00Z",
};

/* The NIP session identifier the bank returns is thirty digits: an
   institution prefix, the settlement date and time, and a serial. */
function sessionPrefix(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${String(date.getUTCFullYear()).slice(2)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  return `000014${day}${time}`;
}

function runSerial(runId: string): string {
  const serial = runId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % 1000;
  return String(serial).padStart(3, "0");
}

export function transferIdFor(runId: string, index: number): string {
  return `trf_${runId.slice(-6)}_${String(index + 1).padStart(5, "0")}`;
}

/** The outcome of one transfer. The stream, the transfer list and the run's
    counts all read this, so a row the stream reports as failed is failed in
    the table behind it and carries the class the retry control acts on. The
    shares come from the configured fixture, so the panel changes all three at
    once rather than only the stream. */
/* A run still executing has rows that have not reached an outcome. These are
   where the open run's queue begins, so the live screen has something in
   flight before the stream says anything. */
const PENDING_FROM: Record<string, { inFlightFrom: number; queuedFrom: number }> = {
  run_2026q4: { inFlightFrom: 1642, queuedFrom: 1678 },
};

export function transferStateAt(
  runId: string,
  index: number,
  projectId: string,
  shares: { failureShare: number; reversalShare: number },
): TransferState {
  const pending = PENDING_FROM[runId];
  if (pending && index >= pending.queuedFrom) {
    return "queued";
  }
  if (pending && index >= pending.inFlightFrom) {
    return "in_flight";
  }
  const applied = SHARES_BY_PROJECT[projectId] ?? shares;
  const seed = index * 97 + runId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const roll = mulberry32(seed)();
  if (roll < applied.failureShare) {
    return "failed";
  }
  if (roll < applied.failureShare + applied.reversalShare) {
    return "reversed";
  }
  /* A settled transfer the participant has not acknowledged is its own state,
     and it is visible. */
  return index % 9 === 4 ? "unconfirmed" : "settled";
}

export function transferAt(runId: string, index: number, projectId: string): Transfer {
  const participant = participantAt(projectId, index);
  const interbank = index % 11 === 0;
  const state = transferStateAt(runId, index, projectId, fixtureShares());
  const failureClass =
    state === "failed"
      ? FAILURE_CLASSES[index % FAILURE_CLASSES.length]
      : null;
  const amount = amountForIndex(projectId, index);
  const charge = chargeFor(amount, interbank ? "interbank" : "intrabank");
  /* A transfer is queued when its own run executed, so a period's transfers
     never settle after the period that attests to them closed. */
  const executedAt = RUN_EXECUTION[runId] ?? "2026-11-09T13:20:00Z";
  const queuedAt = new Date(Date.parse(executedAt) + index * 2300).toISOString();

  return {
    id: transferIdFor(runId, index),
    runId,
    participantId: participant.id,
    participantName: participant.name,
    community: participant.community,
    amount,
    fee: charge.fee,
    vat: charge.vat,
    stamp_duty: charge.stamp_duty,
    total_debit: addAmounts(amount, charge.total),
    state,
    failureClass,
    /* The NIP session identifier is the bank's unique reference for one
       settlement, so it is unique across runs as well as within one. */
    sessionId:
      state === "settled" || state === "unconfirmed" || state === "reversed"
        ? `${sessionPrefix(queuedAt)}${runSerial(runId)}${String(index).padStart(9, "0")}`
        : null,
    queuedAt,
    settledAt:
      state === "failed"
        ? null
        : new Date(Date.parse(queuedAt) + 4200).toISOString(),
    confirmedAt:
      state === "settled" && index % 100 < CONFIRMATION_RATE[projectId]
        ? new Date(Date.parse(queuedAt) + 86_400_000).toISOString()
        : null,
    rail: interbank ? "interbank" : "intrabank",
  };
}

export function runTransfers(runId: string, projectId: string, count: number): Transfer[] {
  return Array.from({ length: count }, (_, index) =>
    transferAt(runId, index, projectId),
  );
}

function tally(runId: string, projectId: string, size: number): {
  counts: Run["counts"];
  failures: Run["failures"];
} {
  const counts: Run["counts"] = {
    queued: 0,
    in_flight: 0,
    settled: 0,
    failed: 0,
    reversed: 0,
    unconfirmed: 0,
  };
  const byClass = new Map<string, number>();
  for (let index = 0; index < size; index += 1) {
    const transfer = transferAt(runId, index, projectId);
    counts[transfer.state] += 1;
    if (transfer.failureClass) {
      byClass.set(transfer.failureClass, (byClass.get(transfer.failureClass) ?? 0) + 1);
    }
  }
  return {
    counts,
    failures: [...byClass.entries()]
      .map(([failureClass, count]) => ({ class: failureClass as ErrorCode, count }))
      .sort((left, right) => right.count - left.count),
  };
}

function run(
  id: string,
  projectId: string,
  period: string,
  state: Run["state"],
  rosterSize: number,
  declaredGross: Amount,
  fundingAmount: Amount,
  createdAt: string,
  executedAt: string | null,
): Run {
  const { counts, failures } = rosterSize === 0
    ? { counts: { queued: 0, in_flight: 0, settled: 0, failed: 0, reversed: 0, unconfirmed: 0 }, failures: [] }
    : tally(id, projectId, rosterSize);
  return {
    id,
    projectId,
    period,
    state,
    rosterSize,
    declaredGross,
    fundingAmount,
    createdAt,
    executedAt,
    counts,
    failures,
  };
}

export const RUNS: Run[] = [
  run("run_2026q1", "proj_ekuri", "2026-Q1", "complete", 1140, "56700000.00", "23000000.00", "2026-03-28T08:00:00Z", "2026-03-30T09:02:00Z"),
  run("run_2026q2", "proj_ekuri", "2026-Q2", "complete", 1612, "68300000.00", "32100000.00", "2026-07-10T08:00:00Z", "2026-07-12T11:20:00Z"),
  run("run_2026q3", "proj_ekuri", "2026-Q3", "complete", 1904, "73300000.00", "37400000.00", "2026-09-28T08:00:00Z", "2026-09-29T10:14:02Z"),
  run("run_2026q4", "proj_ekuri", "2026-Q4", "executing", 2090, "80333333.33", "40500000.00", "2026-11-09T12:40:00Z", "2026-11-09T13:20:00Z"),
  run("run_draft", "proj_ekuri", "2026-Q4", "draft", 0, "0.00", "0.00", "2026-11-09T15:02:00Z", null),
  run("run_hadejia_q2", "proj_hadejia", "2026-Q2", "complete", 720, "25396363.64", "14050000.00", "2026-06-28T08:00:00Z", "2026-06-30T10:00:00Z"),
  run("run_hadejia_q3", "proj_hadejia", "2026-Q3", "complete", 846, "29840727.27", "16500000.00", "2026-09-28T08:00:00Z", "2026-09-30T09:30:00Z"),
  run("run_delta_q3", "proj_delta", "2026-Q3", "complete", 1402, "44600000.00", "25700000.00", "2026-09-29T08:00:00Z", "2026-09-30T14:10:00Z"),
];

/* Coverage is computed from transfers that cleared, never typed. The fixture
   obeys the same rule the product does: a period's paid count, the amount
   households received and the charges borne are tallied from the run behind
   it, and a project's totals are the sum of its periods. A reversed transfer
   is not a payment; an unconfirmed one is, because the money arrived and the
   acknowledgement is a separate fact. */
function computeCoverage(): void {
  for (const project of PROJECTS) {
    for (const period of project.periods) {
      const periodRun = RUNS.find(
        (candidate) =>
          candidate.projectId === project.id &&
          candidate.period === period.period &&
          candidate.state !== "draft",
      );
      if (!periodRun) {
        continue;
      }
      let households = 0;
      let paidOut: Amount = "0.00";
      let charges: Amount = "0.00";
      let confirmed = 0;
      for (let index = 0; index < periodRun.rosterSize; index += 1) {
        const transfer = transferAt(periodRun.id, index, project.id);
        if (transfer.state === "settled" || transfer.state === "unconfirmed") {
          households += 1;
          paidOut = addAmounts(paidOut, transfer.amount);
          charges = addAmounts(charges, subtractAmounts(transfer.total_debit, transfer.amount));
          if (transfer.confirmedAt) {
            confirmed += 1;
          }
        }
      }
      period.enrolled = periodRun.rosterSize;
      period.paid = households;
      period.amountToHouseholds = paidOut;
      period.chargesBorne = charges;
      period.required = multiplyAmount(
        periodRun.declaredGross,
        project.commitment.percentage / 100,
      );
      period.shortfall = subtractAmounts(period.required, paidOut);
      period.surplus = subtractAmounts(paidOut, period.required);
      period.confirmationRate =
        households === 0 ? 0 : Number((confirmed / households).toFixed(2));
    }

    const open = project.periods.find((period) => period.state === "open");
    const latest = open ?? project.periods.at(-1);
    project.confirmationRate = latest?.confirmationRate ?? 0;

    /* A dispute is open until it is resolved one way or the other. These are
       the figures the public register publishes, so they are counted. */
    const disputes = DISPUTES.filter((dispute) => dispute.projectId === project.id);
    project.openDisputes = disputes.filter(
      (dispute) => dispute.state !== "substantiated" && dispute.state !== "unsubstantiated",
    ).length;
    project.substantiatedDisputes = disputes.filter(
      (dispute) => dispute.state === "substantiated",
    ).length;
    project.signalCount = SIGNALS.filter(
      (signal) => signal.projectId === project.id,
    ).length;
    project.enrolled = latest?.enrolled ?? project.enrolled;
    project.paid = latest?.paid ?? project.paid;
    project.lastClosedPeriod =
      project.periods.filter((period) => period.state !== "open").at(-1)?.period ?? null;
  }
}



/* ---- Attestations --------------------------------------------------------- */

function hashFor(seed: string): string {
  const random = mulberry32(
    seed.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0),
  );
  return Array.from({ length: 64 }, () =>
    "0123456789abcdef"[Math.floor(random() * 16)],
  ).join("");
}

export function attestationFor(
  projectId: string,
  period: PeriodSummary,
  position: number,
  previous: string | null,
): Attestation {
  const project = projectById(projectId);
  return {
    id: period.attestationId ?? `att_${projectId}_${period.period.toLowerCase()}`,
    projectId,
    projectName: project?.name ?? "",
    period: period.period,
    enrolled: period.enrolled,
    paid: period.paid,
    amountToHouseholds: period.amountToHouseholds,
    chargesBorne: period.chargesBorne,
    required: period.required,
    shortfall: period.shortfall,
    confirmationRate: period.confirmationRate,
    hash: hashFor(`${projectId}-${period.period}`),
    previousHash: previous,
    merkleRoot: hashFor(`merkle-${projectId}-${period.period}`),
    chainPosition: position,
    anchor: {
      network: "Hedera Consensus Service",
      topicId: "0.0.4417266",
      sequence: 18_240 + position,
      at: period.closedAt,
    },
    anchorState: "anchored",
    supersededBy: null,
    supersedes: null,
    closedAt: period.closedAt ?? "",
    closedLate: period.state === "closed-late",
  };
}

export function attestationsFor(projectId: string): Attestation[] {
  const project = projectById(projectId);
  if (!project) {
    return [];
  }
  const closed = project.periods.filter((period) => period.state !== "open");
  let previous: string | null = null;
  return closed.map((period, index) => {
    const attestation = attestationFor(projectId, period, index + 1, previous);
    previous = attestation.hash;
    return attestation;
  });
}

/* ---- Disputes ------------------------------------------------------------- */

export const DISPUTES: Dispute[] = [
  {
    id: "dsp_0001",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    participantId: "ptc_000331",
    participantName: participantAt("proj_ekuri", 330).name,
    period: "2026-Q4",
    category: "not-received",
    body: "The payment notice arrived by SMS on 10 November but no credit appeared in the account.",
    state: "open",
    resolutionBasis: null,
    transferId: transferIdFor("run_2026q4", 330),
    raisedAt: "2026-11-10T09:14:00Z",
    updatedAt: "2026-11-10T09:14:00Z",
    responses: [],
  },
  {
    id: "dsp_0002",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    participantId: "ptc_000662",
    participantName: participantAt("proj_ekuri", 661).name,
    period: "2026-Q3",
    category: "wrong-amount",
    body: "The amount received was less than the amount stated in the enrolment notice.",
    state: "developer-responded",
    resolutionBasis: null,
    transferId: transferIdFor("run_2026q3", 661),
    raisedAt: "2026-10-04T11:02:00Z",
    updatedAt: "2026-10-06T08:40:00Z",
    responses: [
      {
        at: "2026-10-06T08:40:00Z",
        author: "Ekuri Initiative Limited",
        body: "The 2026-Q3 payment was ₦23,050.00 and the transfer carries session 000014261109142200000661. A second payment for the same period was not made.",
      },
    ],
  },
  {
    id: "dsp_0003",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    participantId: null,
    participantName: null,
    period: "2026-Q3",
    category: "not-enrolled",
    body: "Three households in Iko Esai were listed on the enrolment notice board but do not appear in the register.",
    state: "escalated",
    resolutionBasis: null,
    transferId: null,
    raisedAt: "2026-10-09T15:33:00Z",
    updatedAt: "2026-10-12T10:00:00Z",
    responses: [],
  },
  {
    id: "dsp_0004",
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    participantId: "ptc_000120",
    participantName: participantAt("proj_delta", 119).name,
    period: "2026-Q3",
    category: "not-received",
    body: "The household says the money left the account on the same day it arrived and they did not move it.",
    state: "substantiated",
    resolutionBasis:
      "Onward transfer out of the household wallet within four minutes of settlement, into an account also receiving from 397 other wallets. Case 0231 refers.",
    transferId: transferIdFor("run_delta_q3", 119),
    raisedAt: "2026-10-05T07:21:00Z",
    updatedAt: "2026-10-22T14:08:00Z",
    responses: [],
  },
  {
    id: "dsp_0005",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    participantId: "ptc_001102",
    participantName: participantAt("proj_ekuri", 1101).name,
    period: "2026-Q2",
    category: "not-received",
    body: "No payment was received for the second quarter.",
    state: "unsubstantiated",
    resolutionBasis:
      "The transfer settled on 14 July 2026 with session 000014261109142200001101 and was confirmed by the participant by SMS on 16 July 2026.",
    transferId: transferIdFor("run_2026q2", 1101),
    raisedAt: "2026-07-20T12:00:00Z",
    updatedAt: "2026-07-23T09:12:00Z",
    responses: [],
  },
];

/* ---- Signals, cases, exceptions ------------------------------------------- */

export const SIGNALS: Signal[] = [
  {
    id: "sig_0231",
    class: "onward-concentration",
    severity: "high",
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    period: "2026-Q3",
    accounts: 400,
    raisedAt: "2026-10-03T06:12:00Z",
    state: "attached",
    caseId: "case_0231",
    summary:
      "400 household wallets moved their full settlement into 3 accounts within 48 hours of the run.",
  },
  {
    id: "sig_0232",
    class: "velocity",
    severity: "medium",
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    period: "2026-Q3",
    accounts: 64,
    raisedAt: "2026-10-03T07:48:00Z",
    state: "open",
    caseId: null,
    summary: "64 wallets emptied within six minutes of settlement.",
  },
  {
    id: "sig_0233",
    class: "shared-device",
    severity: "medium",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    period: "2026-Q4",
    accounts: 19,
    raisedAt: "2026-11-02T10:22:00Z",
    state: "open",
    caseId: null,
    summary:
      "19 enrolments captured on one device within a window of eleven minutes.",
  },
  {
    id: "sig_0234",
    class: "dormant-reactivation",
    severity: "low",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    period: "2026-Q4",
    accounts: 7,
    raisedAt: "2026-11-05T13:40:00Z",
    state: "open",
    caseId: null,
    summary:
      "7 dormant accounts were reactivated in the week before the run opened.",
  },
  {
    id: "sig_0235",
    class: "round-tripping",
    severity: "high",
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    period: "2026-Q3",
    accounts: 12,
    raisedAt: "2026-10-04T09:05:00Z",
    state: "open",
    caseId: null,
    summary:
      "Funds returned to the disbursement account through two intermediaries within the same day.",
  },
];

export function accountGraph(signalId: string): AccountGraph {
  const population = signalId === "sig_0231" ? 400 : 64;
  const sampled = population > 220;
  const householdCount = sampled ? 220 : population;
  const nodes: AccountGraph["nodes"] = [];
  const edges: AccountGraph["edges"] = [];

  const concentrators = ["acc_concentrator_1", "acc_concentrator_2", "acc_concentrator_3"];
  concentrators.forEach((id, index) => {
    nodes.push({
      id,
      label: `Concentrating account ${index + 1}`,
      kind: "concentrator",
      amount: multiplyAmount("21400.00", Math.round(population / 3)),
    });
  });

  const intermediaries = ["acc_intermediary_1", "acc_intermediary_2"];
  intermediaries.forEach((id, index) => {
    nodes.push({
      id,
      label: `Intermediary account ${index + 1}`,
      kind: "intermediary",
      amount: multiplyAmount("21400.00", Math.round(population / 6)),
    });
    edges.push({
      from: id,
      to: concentrators[index % concentrators.length],
      amount: multiplyAmount("21400.00", Math.round(population / 6)),
      hop: 2,
      minutesAfterSettlement: 180 + index * 40,
    });
  });

  for (let index = 0; index < householdCount; index += 1) {
    const participant = participantAt("proj_delta", index);
    const id = `acc_household_${index}`;
    nodes.push({
      id,
      label: participant.name,
      kind: "household",
      amount: "21400.00",
      });
    const viaIntermediary = index % 7 === 0;
    edges.push({
      from: id,
      to: viaIntermediary
        ? intermediaries[index % intermediaries.length]
        : concentrators[index % concentrators.length],
      amount: "21400.00",
      hop: 1,
      minutesAfterSettlement: 4 + (index % 2880),
    });
  }

  return {
    nodes,
    edges,
    sampled,
    sampleSize: householdCount,
    populationSize: population,
  };
}

export const CASES: Case[] = [
  {
    id: "case_0231",
    signalIds: ["sig_0231", "sig_0232"],
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    severity: "high",
    state: "investigating",
    openedAt: "2026-10-03T08:00:00Z",
    actions: [
      {
        at: "2026-10-03T08:02:00Z",
        action: "freeze",
        note: "Three receiving accounts frozen pending documentation.",
        by: "Operations, Access Bank",
      },
      {
        at: "2026-10-04T11:30:00Z",
        action: "request documentation",
        note: "Benefit-sharing minutes and household consent forms requested from the developer.",
        by: "Operations, Access Bank",
      },
    ],
  },
  {
    id: "case_0198",
    signalIds: ["sig_0235"],
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    severity: "medium",
    state: "open",
    openedAt: "2026-10-04T09:30:00Z",
    actions: [],
  },
  {
    id: "case_0164",
    signalIds: [],
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    severity: "low",
    state: "unsubstantiated",
    openedAt: "2026-08-14T10:00:00Z",
    actions: [
      {
        at: "2026-08-20T16:12:00Z",
        action: "clear",
        note: "Onward movement matched a community savings group with documented membership.",
        by: "Operations, Access Bank",
      },
    ],
  },
];

export const EXCEPTIONS: VerificationException[] = [
  {
    id: "exc_0001",
    kind: "name-mismatch",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    participantRef: "ptc_000098",
    detail:
      "Enrolled as Ngozi Eyo; the account resolves to EYO MKPOUTO. The masked bank verification number does not agree either.",
    raisedAt: "2026-11-03T08:40:00Z",
    resolution: null,
  },
  {
    id: "exc_0002",
    kind: "tier-limit",
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    participantRef: "ptc_000211",
    detail:
      "Tier 1 wallet. The quarterly payment exceeds the tier's single-transfer limit.",
    raisedAt: "2026-11-04T09:12:00Z",
    resolution: null,
  },
  {
    id: "exc_0003",
    kind: "failed-check",
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    participantRef: "ptc_000407",
    detail: "Identity verification was unreachable at enrolment and has not been re-run.",
    raisedAt: "2026-10-28T14:02:00Z",
    resolution:
      "Re-run on 1 November 2026 and verified. The enrolment was admitted to the 2026-Q4 roster.",
  },
];

export const RECONCILIATIONS: Reconciliation[] = [];

/* Inbound funding against what households received against the charges borne.
   A mismatch is what the arithmetic produces, never a figure somebody typed. */
function computeReconciliation(): void {
  RECONCILIATIONS.length = 0;
  for (const project of PROJECTS) {
    for (const period of project.periods) {
      const periodRun = RUNS.find(
        (candidate) =>
          candidate.projectId === project.id &&
          candidate.period === period.period &&
          candidate.state !== "draft",
      );
      if (!periodRun) {
        continue;
      }
      const inbound = periodRun.fundingAmount;
      const outbound = period.amountToHouseholds;
      const charges = period.chargesBorne;
      const spent = addAmounts(outbound, charges);
      const balance = subtractAmounts(inbound, spent);
      const overspend = subtractAmounts(spent, inbound);
      const open = period.state === "open";
      RECONCILIATIONS.push({
        projectId: project.id,
        projectName: project.name,
        period: period.period,
        inbound,
        outbound,
        charges,
        balance,
        state: open ? "period-open" : overspend === "0.00" ? "reconciled" : "mismatch",
        delta: overspend,
        candidateCauses:
          overspend === "0.00"
            ? []
            : [
                "Transfers settled against a second funding account that has not been reported here.",
                "Charges were borne outside the funding transferred for this period.",
              ],
      });
    }
  }
}

/* ---- Geography, coarse buckets only --------------------------------------- */

export function geography(projectId: string): GeographyBucket[] {
  const random = mulberry32(projectId.length * 7919);
  const centre =
    projectId === "proj_hadejia"
      ? [12.26, 9.98]
      : projectId === "proj_delta"
        ? [4.32, 6.24]
        : [5.62, 8.46];
  return Array.from({ length: 18 }, (_, index) => ({
    h3: `87${(index + 11).toString(16)}a4d${index}ffff`,
    centroid: [
      Number((centre[0] + (random() - 0.5) * 0.28).toFixed(4)),
      Number((centre[1] + (random() - 0.5) * 0.28).toFixed(4)),
    ] as [number, number],
    households: 40 + Math.floor(random() * 180),
  }));
}


/* The fixture's figures are a function of its transfers, so they are computed
   once at load and again whenever the configured shares move. Nothing in the
   fixture holds a figure that the transfers behind it do not support. */
function recomputeFixture(): void {
  for (const existing of RUNS) {
    if (existing.rosterSize === 0) {
      continue;
    }
    const { counts, failures } = tally(existing.id, existing.projectId, existing.rosterSize);
    existing.counts = counts;
    existing.failures = failures;
  }
  computeCoverage();
  computeReconciliation();
}

recomputeFixture();
onSharesChanged(recomputeFixture);
