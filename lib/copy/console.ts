import type { ErrorCode, NotificationEvent, RunState } from "@/lib/api/contract";

/* The developer console's words. Foundation 1.7: name the constraint and the
   arithmetic, no verdict about the project, every figure with its
   denominator, no exclamation mark and no apology. */

export const CONSOLE_COPY = {
  periodLabel: "Open period",
  daysToClose: (days: number) =>
    days === 1 ? "1 day to close" : `${days} days to close`,
  closed: "Closed",
  actionsHeading: "What blocks the next payment",
  actionsEmpty: "Nothing is blocking the next payment.",
  preFirstEnrolment:
    "Nobody is enrolled yet. Coverage is a fraction of the households on the roster, so it has no denominator until the first enrolment is synced.",
  suspended:
    "This project is suspended. The record stays readable and no distribution can be created while it is.",
} as const;

/** The home screen's action list, ordered by what blocks the next payment. */
export const ACTION_COPY = {
  funding: (shortfall: string) =>
    `Funding is short by ${shortfall}. A distribution proceeds on what is funded and the shortfall is recorded in the attestation.`,
  exclusions: (count: number) =>
    `${count} enrolments must be excluded or resolved before payments can start.`,
  disputes: (count: number) =>
    `${count} reports are open. A report closes on a participant confirmation or a reversal.`,
  flags: (count: number) => `${count} enrolments carry a flag and have not been reviewed.`,
  failures: (count: number) =>
    `${count} transfers failed and have not been retried or requeried.`,
  closing: (days: number) =>
    `The period closes in ${days} days. Figures are sealed at close and a correction after that publishes a second record.`,
  reconciliation:
    "The account does not reconcile against the transfers recorded for this period.",
} as const;

/* The words a reader sees for a transfer's state and a wallet's. The enum is
   the contract's spelling, not a reader's. */
export const TRANSFER_STATE_LABEL: Record<string, string> = {
  queued: "Queued",
  in_flight: "Processing",
  settled: "Paid",
  failed: "Failed",
  reversed: "Returned after payment",
  unconfirmed: "Paid; receipt not confirmed",
};

export const WALLET_STATE_LABEL: Record<string, string> = {
  active: "Active",
  dormant: "Dormant",
  restricted: "Restricted",
  unopened: "Not opened",
};

export const PARTICIPANT_STATE_LABEL: Record<string, string> = {
  suspended: "Suspended",
  active: "Active",
  flagged: "Flagged",
  excluded: "Excluded from the current distribution",
  disputed: "Disputed",
  "duplicate-blocked": "Blocked as a duplicate",
  removed: "Removed from the roster",
};

export const RUN_STATE_LABEL: Record<RunState, string> = {
  draft: "Draft",
  "awaiting-funding": "Awaiting funding",
  funded: "Funded",
  "preflight-running": "Checking payment readiness",
  "preflight-failed": "Payment checks need attention",
  executing: "Payments in progress",
  "partially-complete": "Partially complete",
  complete: "Complete",
  cancelled: "Cancelled",
  failed: "Failed",
};

/* The five failure classes F-5 names, under the contract's own codes. The
   prompt's TRANSFER_* names are an earlier draft of the same five. */
export const FAILURE_CLASSES: ErrorCode[] = [
  "ACCOUNT_NOT_FOUND",
  "ACCOUNT_DORMANT",
  "LIMIT_EXCEEDED",
  "TIMEOUT",
  "INSUFFICIENT_FUNDS",
];

export const FAILURE_COPY: Record<
  string,
  { heading: string; remediation: string; retryable: boolean }
> = {
  ACCOUNT_NOT_FOUND: {
    heading: "The account number did not resolve",
    remediation:
      "Correct the account number on the household's record, then retry this class. Retrying without a correction fails the same way.",
    retryable: false,
  },
  ACCOUNT_DORMANT: {
    heading: "The account is dormant",
    remediation:
      "The household reactivates the account at any branch of the bank. The transfer can be retried once they have.",
    retryable: true,
  },
  LIMIT_EXCEEDED: {
    heading: "The payment exceeds the wallet's limit",
    remediation:
      "A tier 1 wallet holds ₦300,000.00 and takes ₦50,000.00 in a day. Either the household upgrades the wallet or the payment is split across the period.",
    retryable: true,
  },
  TIMEOUT: {
    heading: "The bank did not answer in time",
    remediation:
      "Requery rather than retry. A requery reads the transfer's state and never resends it, so a settled transfer is not paid twice.",
    retryable: false,
  },
  INSUFFICIENT_FUNDS: {
    heading: "The disbursement account was short",
    remediation:
      "Fund the account, then retry this class. The amount outstanding is the sum of the transfers in it.",
    retryable: true,
  },
};

export const ROSTER_COPY = {
  heading: "Roster",
  denominator: (shown: number, total: number) =>
    `${shown} of ${total} households`,
  empty:
    "Nobody is enrolled yet. Enrolments arrive from the field app, so the first rows appear when an agent syncs.",
  filteredEmpty:
    "No household matches this filter. The roster itself is not empty.",
  noDeletion:
    "A household is never deleted. Removal is a status change and carries a reason, because the denominator of coverage is the roster.",
  flagsHeading: "Flags",
} as const;

export const PARTICIPANT_COPY = {
  evidence: "Enrolment evidence",
  identityNote:
    "An identity number is held as a hash and its last four digits. There is nothing here to edit.",
  phoneCorrection: "Correct the phone number",
  phoneReason: "Why it is being corrected",
  statusChange: "Change this household's status",
  statusReason: "Why the status is changing",
  disputedNote:
    "A payment to this household is reported. The report is below, and it closes on the household's confirmation or on a reversal.",
  removedNote: (reason: string, date: string) =>
    `Removed on ${date}. ${reason}`,
  excludedNote: (reason: string) => `Excluded from the current distribution. ${reason}`,
} as const;

export const DISPUTE_COPY = {
  heading: "Reports",
  basis:
    "A report closes on a participant confirmation or on a reversal. There is no control here that closes one on this account's own account of it.",
  respond: "Respond to this report",
  responseLogged: "The response is logged against the report and the household sees it.",
  awaitingParticipant:
    "The response has been sent. The report stays open until the participant confirms or the transfer is reversed.",
  escalated:
    "This report is with the platform. The project cannot act on it while it is.",
} as const;

export const SETTINGS_COPY = {
  usersHeading: "Users and roles",
  lastAdmin:
    "You are the only administrator. Another administrator has to be added before this role can change.",
  keysHeading: "API keys",
  keyShownOnce:
    "This key is shown once. It is not held anywhere after this panel closes, so record it now.",
  keyMasked:
    "A key is shown once, at creation. Only its prefix is held afterwards, here or on the server, so a key that was not recorded is replaced rather than recovered.",
  webhooksHeading: "Webhook endpoints",
  notificationsHeading: "Notifications",
  notificationsNote:
    "Each event is sent to this account's email. Every one is on until it is turned off here. There is no inbox: the figures on the home screen are the record.",
} as const;

export const NOTIFICATION_LABEL: Record<NotificationEvent, string> = {
  "dispute.opened": "A household reports a payment",
  "run.complete": "A distribution finishes with transfers outstanding",
  "funding.received": "Funding arrives in the disbursement account",
  "period.closing": "A period closes within seven days",
  "reconciliation.mismatch": "A period does not reconcile",
};

export const ATTESTATION_COPY = {
  heading: "Attestations",
  none:
    "No period has closed yet. An attestation is published when a period closes and its figures are sealed.",
  correction:
    "This period was corrected. Both records stay published and the correction states what changed.",
  anchorPending:
    "The figures are sealed and the record is published. The anchor reference arrives when the batch lands.",
  disclosure: "Generate a disclosure bundle for one transfer",
  disclosureNote:
    "A bundle carries one leaf, its proof path and the root reference. It proves one payment belongs to the period without revealing any other household.",
} as const;

export const FUNDING_COPY = {
  heading: "Funding",
  none:
    "No funding has arrived for this period. The account number below is the one to pay into.",
  overfunded: (balance: string) =>
    `${balance} remains in the account and carries forward to the next period.`,
  mismatch:
    "The inbound total does not match the transfers recorded against it. This is flagged to bank operations as well as here, and neither side closes it alone.",
} as const;

export const RUN_COPY = {
  newHeading: "New distribution",
  arithmeticHeading: "What this distribution requires",
  arithmeticNote:
    "Every term is shown, because the amount a household is owed is a consequence of the agreement and the total project income rather than a figure anybody types.",
  shortfall: (amount: string) =>
    `Funding is ${amount} short of what this distribution requires. The distribution proceeds and the shortfall is recorded in the period's attestation, where it stays published.`,
  noShortfall: "Funding covers the amount required and the estimated charges.",
  execute: "Start this distribution",
  executeNote:
    "This submits one bulk transfer. Nothing here can be unsent once it is submitted.",
  preflightPassed: "Pre-flight passed. No enrolment is excluded.",
  requery:
    "Requery reads the transfer's state at the bank. It never resends, so nothing can be paid twice.",
  streamDropped:
    "The connection to the distribution was lost. Reconnecting. The rows below are the last state received and nothing has been discarded.",
} as const;

export const AGENT_COPY = {
  heading: "Agents",
  aboveThreshold:
    "A flag rate above the threshold is stated rather than hidden, because the enrolments behind it are what coverage is computed from.",
  noEnrolments: "No enrolments yet. The invite has been sent and the device is not bound.",
  suspended: "Suspended. Existing enrolments stand; no new enrolment is accepted.",
} as const;
