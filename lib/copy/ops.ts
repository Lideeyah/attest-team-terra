import type { Case, Signal, VerificationException } from "@/lib/api/contract";

/* The bank operations console's words.

   This console describes accounts and the movement between them. It does not
   describe people: a signal is a pattern, a case is an investigation, and
   neither is a finding about anybody until the case says so and says on what
   basis. Raw evidence appears nowhere else in the product — the register and
   the verifier portal publish a count — so the words here are the only place
   the pattern is spelled out, and they are written for the person who has to
   act on it. */

export const OPS_COPY = {
  surface: "Bank operations",
  nothingOpen:
    "Nothing is open. No signal has been raised this period, no case is being investigated and every project reconciles.",
  evidenceStaysHere:
    "The accounts behind a signal are drawn here and nowhere else. What the register publishes is a count.",
} as const;

export const SIGNAL_COPY: Record<
  Signal["class"],
  { heading: string; what: string }
> = {
  "onward-concentration": {
    heading: "Money moving on into a few accounts",
    what: "Household wallets transferring out within hours of settlement, into a small number of receiving accounts. This is what paying yourself through households that do not exist looks like from inside a bank.",
  },
  velocity: {
    heading: "Money moving straight back out",
    what: "Wallets emptied within minutes of settlement, faster than a household in a village with one agent could reasonably withdraw.",
  },
  "shared-device": {
    heading: "One device behind many enrolments",
    what: "Enrolments captured on the same device beyond what one agent's day accounts for. A shared phone is ordinary; a shared phone across communities is not.",
  },
  "dormant-reactivation": {
    heading: "Accounts woken up to receive",
    what: "Accounts dormant for a long time, reactivated shortly before a run, and dormant again after it.",
  },
  "round-tripping": {
    heading: "Money returning where it came from",
    what: "Funds settling to households and arriving back at an account connected to the funding one.",
  },
};

export const SEVERITY_COPY: Record<Signal["severity"], string> = {
  high: "Looked at first",
  medium: "Looked at this week",
  low: "Looked at in order",
};

export const CASE_COPY: Record<Case["state"], string> = {
  open: "Open, not yet picked up",
  investigating: "Being investigated",
  substantiated: "Substantiated",
  unsubstantiated: "Unsubstantiated",
  closed: "Closed",
};

export const ACTION_COPY: Record<string, { label: string; consequence: string }> = {
  freeze: {
    label: "Freeze the receiving accounts",
    consequence:
      "The accounts stop receiving and stop paying out. Households are not frozen; the accounts the money moved into are.",
  },
  documentation: {
    label: "Request documentation",
    consequence:
      "The project is asked for the enrolment evidence behind the accounts in question, with a date by which to produce it.",
  },
  escalate: {
    label: "Escalate",
    consequence:
      "The case goes to the bank's financial crime desk, which decides what is reported and to whom.",
  },
  clear: {
    label: "Clear",
    consequence:
      "The case closes as unsubstantiated. What was found stays on the record, because clearing a case is a finding too.",
  },
};

export const EXCEPTION_COPY: Record<VerificationException["kind"], string> = {
  "failed-check": "The identity check did not pass",
  "name-mismatch": "The account resolves to a different name",
  "tier-limit": "The wallet's limit is below the payment",
};

export const GRAPH_COPY = {
  sampled: (shown: number, population: number) =>
    `Showing ${shown.toLocaleString("en-NG")} of ${population.toLocaleString("en-NG")} accounts. The rest move the same way; the drawing is sampled so it can be read.`,
  whole: (population: number) =>
    `Showing all ${population.toLocaleString("en-NG")} accounts.`,
  window: (hours: number) =>
    `Every movement here happened within ${hours} hours of the transfer settling.`,
  description: (accounts: number, concentrators: number, hours: number) =>
    `${accounts} household wallets, and the ${concentrators} accounts their money moved into within ${hours} hours.`,
  concentrator: "An account the money moved into.",
  intermediary: "An account the money passed through.",
  household: "A household wallet the project paid.",
  tap: "Tap an account to see what moved through it.",
  loading: "Drawing the accounts",
  none: "No onward movement yet. The money settled and has not moved since, which is what an ordinary period looks like.",
  ordinary:
    "Nothing concentrates. The money moved on the way money ordinarily moves: to different places, at different times, in different amounts.",
} as const;

export const RECONCILIATION_COPY = {
  heading: "Reconciliation",
  reconciled: "Inbound funding, outbound transfers and the balance agree.",
  mismatch:
    "The inbound total does not match the transfers recorded against it. The delta and what could account for it are below; neither the project nor the bank closes this alone.",
  open: "The period is open. It reconciles when it closes.",
  awaiting: "Awaiting settlement data from the bank for this period.",
} as const;
