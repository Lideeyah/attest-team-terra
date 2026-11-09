/* Reference data for the component and motion reference at /dev/kitchen-sink.
   Figures are consistent with one another: Ekuri Forest Initiative enrols
   2,090 households against a 60 percent Plan Vivo commitment of ₦48.2m, has
   funded ₦31.4m, and has settled 1,284 transfers for the open period. */

export const PROJECT = {
  id: "proj_ekuri_forest",
  name: "Ekuri Forest Initiative",
  registry: "Plan Vivo",
  registryId: "PV-NG-0417",
  state: "Cross River",
  localGovernment: "Akamkpa",
  methodology: "Plan Vivo Standard v5.0, avoided deforestation",
  period: "2026-Q4",
  enrolled: 2090,
  paid: 1284,
  requiredKobo: 4_820_000_000,
  fundedKobo: 3_140_000_000,
  shortfallKobo: 1_680_000_000,
  attestationHash:
    "9f2c41ab7e0d5386c14f90b2ad77e5610c8f3b24d9ea17458b06cf2e3d71a845",
} as const;

export type TransferRow = {
  id: string;
  participant: string;
  community: string;
  amountKobo: number;
  sessionId: string;
  at: string;
  state: "settled" | "unconfirmed" | "failed" | "in-flight";
};

export const TRANSFERS: TransferRow[] = [
  {
    id: "trf_8841",
    participant: "Adaeze Okonkwo",
    community: "Old Ekuri",
    amountKobo: 2_305_000,
    sessionId: "000014261109142207104883",
    at: "2026-11-09T13:22:07Z",
    state: "settled",
  },
  {
    id: "trf_8842",
    participant: "Ebong Asuquo",
    community: "New Ekuri",
    amountKobo: 2_305_000,
    sessionId: "000014261109142231104884",
    at: "2026-11-09T13:22:31Z",
    state: "settled",
  },
  {
    id: "trf_8843",
    participant: "Ngozi Eyo",
    community: "Okokori",
    amountKobo: 2_305_000,
    sessionId: "000014261109142258104885",
    at: "2026-11-09T13:22:58Z",
    state: "unconfirmed",
  },
  {
    id: "trf_8844",
    participant: "Musa Abdullahi",
    community: "Iko Esai",
    amountKobo: 2_305_000,
    sessionId: "000014261109142314104886",
    at: "2026-11-09T13:23:14Z",
    state: "failed",
  },
  {
    id: "trf_8845",
    participant: "Blessing Udoh",
    community: "Old Ekuri",
    amountKobo: 2_305_000,
    sessionId: "000014261109142340104887",
    at: "2026-11-09T13:23:40Z",
    state: "in-flight",
  },
];

export const SIGNAL_LINES = [
  {
    id: "sig_line_1",
    at: "2026-11-09T13:21:02Z",
    text: "graph.walk proj_ekuri_forest depth=2",
    meta: "412 nodes · 61ms",
  },
  {
    id: "sig_line_2",
    at: "2026-11-09T13:21:03Z",
    text: "onward.flow wallet_30418 → wallet_30418_agent",
    meta: "4 transfers · 38ms",
  },
  {
    id: "sig_line_3",
    at: "2026-11-09T13:21:05Z",
    text: "signal.raised collection_pattern agent_ag_0094",
    meta: "confidence 0.71 · 22ms",
  },
  {
    id: "sig_line_4",
    at: "2026-11-09T13:21:09Z",
    text: "case.opened case_0231 assigned ops.review",
    meta: "1 record · 17ms",
  },
];

export const COVERAGE_SERIES = [
  { label: "2025-Q4", paid: 0, enrolled: 0 },
  { label: "2026-Q1", paid: 318, enrolled: 1140 },
  { label: "2026-Q2", paid: 902, enrolled: 1612 },
  { label: "2026-Q3", paid: 1407, enrolled: 1904 },
  { label: "2026-Q4", paid: 1284, enrolled: 2090 },
];

export const COMMITMENT_QUOTATION =
  "At least sixty percent of net revenue from the sale of Plan Vivo Certificates shall be distributed to participating households in the Ekuri community, quarterly, in the year following issuance.";

export const COMMITMENT_SOURCE = "Project design document, page 44";
