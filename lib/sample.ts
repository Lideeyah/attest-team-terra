import {
  AGENTS,
  PROJECTS,
  RUNS,
  attestationsFor,
  runTransfers,
} from "@/lib/mock/seed";
import type { Transfer } from "@/lib/api/contract";

/* The component and motion reference reads the mock's own seed, so a figure
   on /dev/kitchen-sink is the figure the product serves. Nothing here is a
   second set of numbers. */

export const PROJECT = PROJECTS[0];

export const OPEN_PERIOD =
  PROJECT.periods.find((period) => period.state === "open") ?? PROJECT.periods[0];

export const CLOSED_PERIOD =
  PROJECT.periods.filter((period) => period.state !== "open").at(-1) ?? PROJECT.periods[0];

export const OPEN_RUN = RUNS.find((run) => run.id === "run_2026q4") ?? RUNS[0];

export const ATTESTATION =
  attestationsFor(PROJECT.id).at(-1) ?? attestationsFor(PROJECT.id)[0];

/** Five rows of the open run, one in each state the table has to show. */
export const TRANSFERS: Transfer[] = (() => {
  const rows = runTransfers(OPEN_RUN.id, PROJECT.id, 400);
  const pick = (state: Transfer["state"]) =>
    rows.find((row) => row.state === state);
  const chosen = [
    pick("settled"),
    pick("unconfirmed"),
    pick("failed"),
    pick("reversed"),
    rows.find((row) => row.state === "settled" && row.rail === "interbank"),
  ].filter((row): row is Transfer => row !== undefined);
  return chosen;
})();

export const AGENT_ABOVE_THRESHOLD =
  AGENTS.find((agent) => agent.aboveFlagThreshold) ?? AGENTS[0];

export const COVERAGE_SERIES = PROJECT.periods.map((period) => ({
  label: period.period,
  paid: period.paid,
  enrolled: period.enrolled,
}));

export const COMMITMENT_QUOTATION = PROJECT.commitment.sourceQuote;

export const COMMITMENT_SOURCE = `Project design document, page ${PROJECT.commitment.page}`;

export const SIGNAL_LINES = [
  {
    id: "sig_line_1",
    at: "2026-11-09T13:21:02Z",
    text: "graph.walk proj_delta depth=2",
    meta: "412 nodes · 61ms",
  },
  {
    id: "sig_line_2",
    at: "2026-11-09T13:21:03Z",
    text: "onward.flow wallet_30418 → acc_concentrator_1",
    meta: "4 transfers · 38ms",
  },
  {
    id: "sig_line_3",
    at: "2026-11-09T13:21:05Z",
    text: "signal.raised onward_concentration sig_0231",
    meta: "400 accounts · 22ms",
  },
  {
    id: "sig_line_4",
    at: "2026-11-09T13:21:09Z",
    text: "case.opened case_0231 assigned ops.review",
    meta: "1 record · 17ms",
  },
];

/** Twelve rows for the ledger movement, each a household, an amount and a
    timestamp. They are the open run's own transfers. */
export const LEDGER_ROWS = runTransfers(OPEN_RUN.id, PROJECT.id, 12);

/** The figures the landing page states, with the source attributed beneath
    them. These are the published figures the problem rests on, not Attest's
    own data. */
export const EVIDENCE = {
  enrolled: 21_658,
  paid: 7_375,
  coveragePercent: 34,
  source:
    "Farm Africa benefit-sharing disclosure, 2024. Households enrolled in the programme against households recorded as paid.",
};


/** The register as the landing page shows it: every project's latest closed
    period, with its figures computed rather than typed. */
export const REGISTER_ROWS = PROJECTS.map((project) => {
  const period =
    project.periods.filter((candidate) => candidate.state !== "open").at(-1) ??
    project.periods[0];
  return {
    id: project.id,
    name: project.name,
    period: period.period,
    paid: period.paid,
    enrolled: period.enrolled,
    attestationId: period.attestationId ?? project.id,
  };
});
