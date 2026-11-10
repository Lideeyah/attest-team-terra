/* The verifier portal's words.

   One rule governs this entire surface and it is a product decision rather
   than a styling one: it presents facts and never a verdict. No scores, no
   grades, no ratings, no risk labels, no traffic lights, no "compliant" and
   no "reliable". A figure is shown with the figure it should be read against
   and the reader draws the conclusion, because the moment Attest draws it,
   Attest is in the ratings business and every project has an incentive to
   manage the rating rather than pay the households. */

export const VERIFIER_COPY = {
  surface: "Verifier portal",
  factsNotVerdicts:
    "Every figure here is computed from transfers that cleared a bank. Nothing on this surface ranks a project or says whether one is doing well: the figures are the record, and what they mean is yours to decide.",
  watchlistEmpty:
    "Nothing on your watchlist yet. Add a project and its period closes, reports and corrections appear here as they happen.",
  nothingChanged:
    "Nothing has changed on your watchlist since you last looked. No period closed, no correction was issued and no report was raised.",
  recentCloses: "Periods closed recently",
  recentDisputes: "Reports raised recently",
  alertsFired: "Alerts that fired",
} as const;

export const PROJECTS_COPY = {
  heading: "Projects",
  lede: "Every project that has published a period. Search by name, operator or registry identifier.",
  filteredEmpty:
    "No project matches this search. The register itself is not empty, and a project that has closed no period is on it too.",
  watch: "Add to watchlist",
  unwatch: "Remove from watchlist",
  watching: "On your watchlist",
} as const;

export const DETAIL_COPY = {
  transfers: "Transfers by period",
  confirmations: "Confirmation rates",
  confirmationNote:
    "A confirmation is a household saying the money arrived. Settlement and acknowledgement are separate facts and both are shown: a period can settle in full and be acknowledged by half.",
  againstHistory:
    "This period's confirmation rate beside the project's own history. Both figures are stated and neither is interpreted here.",
  disputes: "Reports and how each was resolved",
  disputeBasis:
    "A report closes on a participant's confirmation or on a reversal, and the basis is published with it. A report the project simply denies stays open.",
  signals: "Signals by class",
  signalNote:
    "A signal is a pattern the bank's own monitoring raised about accounts, not a finding about the project. Signals are counted here and investigated by bank operations.",
  agents: "Agent flag rates, in aggregate",
  agentNote:
    "Flag rates are shown across the project's agents and never against a named person on this surface.",
  enrolment: "Where households are enrolled",
  noPii:
    "No household appears on this surface at any granularity. The endpoints behind it do return household detail to the project that owns it, and this surface renders none of it: enrolment is published in cells about a kilometre across, and a report is published as its category and its basis.",
} as const;

export const COMPARE_COPY = {
  heading: "Compare",
  nothing: "Choose two or three projects to compare.",
  note: "Projects are compared only on periods they both closed. A figure from one period beside a figure from another would be a comparison of calendars.",
  incomparable: (names: string[]) =>
    `${names.join(" and ")} have no period in common, so there is nothing to compare them on. A project that has closed no period has published no figures.`,
  columns: {
    coverage: "Households paid, of households enrolled",
    confirmation: "Households that confirmed, of households paid",
    disputes: "Reports raised, of households paid",
    shortfall: "Shortfall against the commitment",
  },
} as const;

export const EXPORT_COPY = {
  heading: "Export",
  nothing: "Choose a project and a period to export.",
  formats: {
    disclosure:
      "A disclosure bundle for one transfer: the transfer's own facts, its leaf, the path to the period's root and the root's reference. It proves that one payment belongs to that period and reveals no other household.",
    csv: "Every published figure for the period, as a file.",
    record: "The period's attestation as it is published, with its hash and anchor reference.",
  },
  generating: "Generating",
  ready: "Ready. Paste it into the public verifier and it folds to the period's root.",
  failed:
    "The export was not generated. Nothing was produced and nothing was charged against your key.",
  keyOnce:
    "This key is shown once. It is not held anywhere after this panel closes, so record it now.",
  verifyHere: "Check it on the public verifier",
} as const;

export const ALERT_COPY = {
  heading: "Alerts",
  none: "No alert is configured. An alert tells you when a record changes; it never tells you what to think about it.",
  conditions: {
    "coverage-below": "Coverage falls below a figure I choose",
    "dispute-raised": "A household reports a payment",
    "period-closed-late": "A period closes after its own close date",
    "correction-issued": "A correction is published for a closed period",
  },
  fired: (at: string) => `Fired ${at}`,
  firedNote:
    "An alert links the record that fired it. Read the record rather than the alert.",
} as const;
