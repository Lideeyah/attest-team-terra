import type {
  AccountGraph,
  Agent,
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

/* ---- Periods -------------------------------------------------------------- */

function ekuriPeriods(): PeriodSummary[] {
  const closed: PeriodSummary[] = [
    {
      period: "2026-Q1",
      state: "closed",
      enrolled: 1140,
      paid: 318,
      amountToHouseholds: multiplyAmount(AMOUNT_PER_HOUSEHOLD, 318),
      chargesBorne: "0.00",
      required: "18420000.00",
      shortfall: "11089100.00",
      closedAt: "2026-04-01T09:12:44Z",
      attestationId: "att_ekuri_2026q1",
      corrected: false,
    },
    {
      period: "2026-Q2",
      state: "closed-late",
      enrolled: 1612,
      paid: 902,
      amountToHouseholds: multiplyAmount(AMOUNT_PER_HOUSEHOLD, 902),
      chargesBorne: "2418.75",
      required: "27410000.00",
      shortfall: "6618900.00",
      closedAt: "2026-07-14T16:02:10Z",
      attestationId: "att_ekuri_2026q2",
      corrected: false,
    },
    {
      period: "2026-Q3",
      state: "closed",
      enrolled: 1904,
      paid: 1407,
      amountToHouseholds: multiplyAmount(AMOUNT_PER_HOUSEHOLD, 1407),
      chargesBorne: "3225.00",
      required: "35200000.00",
      shortfall: "2768650.00",
      closedAt: "2026-10-01T08:30:02Z",
      attestationId: "att_ekuri_2026q3",
      corrected: true,
    },
  ];
  const open: PeriodSummary = {
    period: "2026-Q4",
    state: "open",
    enrolled: 2090,
    paid: 1284,
    amountToHouseholds: multiplyAmount(AMOUNT_PER_HOUSEHOLD, 1284),
    chargesBorne: "1612.50",
    required: "48200000.00",
    shortfall: "18604800.00",
    closedAt: null,
    attestationId: null,
    corrected: false,
  };
  return [...closed, open];
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
      {
        period: "2026-Q2",
        state: "closed",
        enrolled: 720,
        paid: 720,
        amountToHouseholds: multiplyAmount("19400.00", 720),
        chargesBorne: "0.00",
        required: "13968000.00",
        shortfall: "0.00",
        closedAt: "2026-07-01T10:04:19Z",
        attestationId: "att_hadejia_2026q2",
        corrected: false,
      },
      {
        period: "2026-Q3",
        state: "closed",
        enrolled: 846,
        paid: 846,
        amountToHouseholds: multiplyAmount("19400.00", 846),
        chargesBorne: "0.00",
        required: "16412400.00",
        shortfall: "0.00",
        closedAt: "2026-10-01T09:41:55Z",
        attestationId: "att_hadejia_2026q3",
        corrected: false,
      },
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
      {
        period: "2026-Q3",
        state: "closed",
        enrolled: 1402,
        paid: 1308,
        amountToHouseholds: multiplyAmount("21400.00", 1308),
        chargesBorne: "14056.25",
        required: "29202800.00",
        shortfall: "1189600.00",
        closedAt: "2026-10-02T11:18:07Z",
        attestationId: "att_delta_2026q3",
        corrected: false,
      },
    ],
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
export function amountForIndex(index: number): string {
  const suffix = index % 1009;
  if (suffix === 11) {
    return "23050.01"; /* INSUFFICIENT_FUNDS */
  }
  if (suffix === 13) {
    return "23050.02"; /* TIMEOUT, then failed and reversed */
  }
  if (suffix === 17) {
    return "23050.03"; /* pending, then successful */
  }
  if (suffix === 19) {
    return "23050.04"; /* successful, then reversed about a minute later */
  }
  if (suffix === 23) {
    return "23050.05"; /* first webhook delivery withheld */
  }
  return AMOUNT_PER_HOUSEHOLD;
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

export function transferIdFor(runId: string, index: number): string {
  return `trf_${runId.slice(-6)}_${String(index + 1).padStart(5, "0")}`;
}

export function transferAt(runId: string, index: number, projectId: string): Transfer {
  const participant = participantAt(projectId, index);
  const random = mulberry32(index * 97 + runId.length);
  const roll = random();
  const interbank = index % 11 === 0;
  const state: Transfer["state"] =
    roll > 0.94
      ? "failed"
      : roll > 0.9
        ? "unconfirmed"
        : roll > 0.885
          ? "reversed"
          : "settled";
  const failureClass =
    state === "failed"
      ? FAILURE_CLASSES[index % FAILURE_CLASSES.length]
      : null;
  const amount = amountForIndex(index);
  const charge = chargeFor(amount, interbank ? "interbank" : "intrabank");
  const queuedAt = new Date(Date.UTC(2026, 10, 9, 13, 20, 0) + index * 2300).toISOString();

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
    sessionId:
      state === "settled" || state === "unconfirmed" || state === "reversed"
        ? `0000142611091422${String(index).padStart(6, "0")}`
        : null,
    queuedAt,
    settledAt:
      state === "failed"
        ? null
        : new Date(Date.parse(queuedAt) + 4200).toISOString(),
    confirmedAt:
      state === "settled" && index % 5 !== 0
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

export const RUNS: Run[] = [
  {
    id: "run_2026q1",
    projectId: "proj_ekuri",
    period: "2026-Q1",
    state: "complete",
    rosterSize: 1140,
    declaredGross: "30700000.00",
    fundingAmount: "18420000.00",
    createdAt: "2026-03-28T08:00:00Z",
    executedAt: "2026-03-30T09:02:00Z",
    counts: { queued: 0, in_flight: 0, settled: 318, failed: 702, reversed: 4, unconfirmed: 116 },
    failures: [
      { class: "ACCOUNT_NOT_FOUND", count: 402 },
      { class: "ACCOUNT_DORMANT", count: 180 },
      { class: "LIMIT_EXCEEDED", count: 64 },
      { class: "TIMEOUT", count: 38 },
      { class: "INSUFFICIENT_FUNDS", count: 18 },
    ],
  },
  {
    id: "run_2026q2",
    projectId: "proj_ekuri",
    period: "2026-Q2",
    state: "complete",
    rosterSize: 1612,
    declaredGross: "45683333.33",
    fundingAmount: "27410000.00",
    createdAt: "2026-07-10T08:00:00Z",
    executedAt: "2026-07-12T11:20:00Z",
    counts: { queued: 0, in_flight: 0, settled: 902, failed: 560, reversed: 7, unconfirmed: 143 },
    failures: [
      { class: "ACCOUNT_NOT_FOUND", count: 288 },
      { class: "ACCOUNT_DORMANT", count: 152 },
      { class: "LIMIT_EXCEEDED", count: 71 },
      { class: "TIMEOUT", count: 34 },
      { class: "INSUFFICIENT_FUNDS", count: 15 },
    ],
  },
  {
    id: "run_2026q3",
    projectId: "proj_ekuri",
    period: "2026-Q3",
    state: "complete",
    rosterSize: 1904,
    declaredGross: "58666666.67",
    fundingAmount: "35200000.00",
    createdAt: "2026-09-28T08:00:00Z",
    executedAt: "2026-09-29T10:14:02Z",
    counts: { queued: 0, in_flight: 0, settled: 1407, failed: 318, reversed: 12, unconfirmed: 167 },
    failures: [
      { class: "ACCOUNT_NOT_FOUND", count: 104 },
      { class: "ACCOUNT_DORMANT", count: 88 },
      { class: "LIMIT_EXCEEDED", count: 61 },
      { class: "TIMEOUT", count: 42 },
      { class: "INSUFFICIENT_FUNDS", count: 23 },
    ],
  },
  {
    id: "run_2026q4",
    projectId: "proj_ekuri",
    period: "2026-Q4",
    state: "executing",
    rosterSize: 2090,
    declaredGross: "80333333.33",
    fundingAmount: "31400000.00",
    createdAt: "2026-11-09T12:40:00Z",
    executedAt: "2026-11-09T13:20:00Z",
    counts: { queued: 412, in_flight: 36, settled: 1284, failed: 221, reversed: 9, unconfirmed: 128 },
    failures: [
      { class: "ACCOUNT_NOT_FOUND", count: 78 },
      { class: "ACCOUNT_DORMANT", count: 54 },
      { class: "LIMIT_EXCEEDED", count: 41 },
      { class: "TIMEOUT", count: 33 },
      { class: "INSUFFICIENT_FUNDS", count: 15 },
    ],
  },
  {
    id: "run_draft",
    projectId: "proj_ekuri",
    period: "2026-Q4",
    state: "draft",
    rosterSize: 0,
    declaredGross: "0.00",
    fundingAmount: "0.00",
    createdAt: "2026-11-09T15:02:00Z",
    executedAt: null,
    counts: { queued: 0, in_flight: 0, settled: 0, failed: 0, reversed: 0, unconfirmed: 0 },
    failures: [],
  },
];

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
    confirmationRate: project?.confirmationRate ?? 0,
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
    transferId: transferIdFor("run_2026q3", 119),
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

export const RECONCILIATIONS: Reconciliation[] = [
  {
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    period: "2026-Q3",
    inbound: "35200000.00",
    outbound: "32431350.00",
    charges: "3225.00",
    balance: "2765425.00",
    state: "reconciled",
    delta: "0.00",
    candidateCauses: [],
  },
  {
    projectId: "proj_delta",
    projectName: "Akassa Mangrove Carbon Project",
    period: "2026-Q3",
    inbound: "28013200.00",
    outbound: "27991200.00",
    charges: "14056.25",
    balance: "7943.75",
    state: "mismatch",
    delta: "14056.25",
    candidateCauses: [
      "Charges borne by the project were funded from a second account.",
      "Two reversals settled after the reconciliation window closed.",
    ],
  },
  {
    projectId: "proj_ekuri",
    projectName: "Ekuri Community Forest Carbon Project",
    period: "2026-Q4",
    inbound: "31400000.00",
    outbound: "29596200.00",
    charges: "1612.50",
    balance: "1802187.50",
    state: "period-open",
    delta: "0.00",
    candidateCauses: [],
  },
];

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
