import type { ErrorCode } from "@/lib/api/contract";

/* Every error the contract can return, with the sentence a screen shows and
   the remediation beneath it. A screen switches on the code and never parses
   a message, but the message is real copy because the reader reads it. */

export const ERROR_COPY: Record<ErrorCode, { message: string; remediation: string }> = {
  FORBIDDEN: {
    message: "This account does not have access to that record.",
    remediation: "Ask an administrator on your organisation to grant access.",
  },
  RATE_LIMITED: {
    message: "Too many requests from this address.",
    remediation: "Wait sixty seconds and try again. Public surfaces are rate-limited per address.",
  },
  INVALID_REQUEST: {
    message: "The request was not in the shape the contract expects.",
    remediation: "Correct the highlighted field and submit again.",
  },
  NOT_FOUND: {
    message: "There is no record at this address.",
    remediation: "Check the identifier, or search the register.",
  },
  DUPLICATE_REQUEST: {
    message: "This request was already submitted with the same idempotency key.",
    remediation: "The original result stands. Nothing was submitted twice.",
  },
  IDENTITY_DUPLICATE: {
    message: "This identity is already enrolled in this project.",
    remediation: "A household may be enrolled once. Withdraw the first enrolment to replace it.",
  },
  BVN_MISMATCH: {
    message: "The bank verification number does not match the identity given.",
    remediation: "Re-capture the number with the household present.",
  },
  IDENTITY_UNREACHABLE: {
    message: "Identity verification could not be reached.",
    remediation: "The enrolment is queued and will verify when the service answers.",
  },
  NAME_MISMATCH: {
    message: "The account holder's name does not match the enrolled household.",
    remediation: "The enrolment proceeds and is flagged for review before the next run.",
  },
  NAME_ENQUIRY_EXPIRED: {
    message: "The name enquiry reference expired before the transfer was sent.",
    remediation: "Re-run the enquiry. A reference is valid for ten minutes.",
  },
  NAME_ENQUIRY_MISMATCH: {
    message: "The destination account does not match the one the enquiry resolved.",
    remediation: "Re-run the enquiry against the destination you intend to pay.",
  },
  BOUNDARY_OUTSIDE: {
    message: "The capture location is outside the project boundary.",
    remediation: "Record a reason. The enrolment proceeds and is flagged.",
  },
  GPS_UNAVAILABLE: {
    message: "No location fix was available at capture.",
    remediation: "The enrolment proceeds and is flagged for a boundary check on sync.",
  },
  CONSENT_MISSING: {
    message: "Consent has not been recorded for this household.",
    remediation: "Consent is required before an enrolment can be submitted.",
  },
  DEVICE_UNBOUND: {
    message: "This device is not bound to an agent account.",
    remediation: "Ask the project administrator to approve the binding request.",
  },
  REGISTRY_NOT_FOUND: {
    message: "No project with that identifier exists in the registry.",
    remediation: "Check the identifier on the registry's own project page.",
  },
  REGISTRY_UNREACHABLE: {
    message: "The registry did not answer.",
    remediation: "Enter the project details manually. The entry is queued for review.",
  },
  BOUNDARY_NOT_AVAILABLE: {
    message: "This registry does not expose project boundaries through an API.",
    remediation:
      "Upload the project's KML boundary file. Plan Vivo supplies it on request, and it is parsed into the project record on upload.",
  },
  PDD_UNREADABLE: {
    message: "The project design document could not be read.",
    remediation: "Upload a text-based PDF rather than a scan, under 40MB.",
  },
  PDD_NO_COMMITMENT: {
    message: "No benefit-sharing commitment was found in the document.",
    remediation: "Upload the document that contains the commitment, or enter it with its source.",
  },
  EXTRACTION_LOW_CONFIDENCE: {
    message: "The extracted commitment is below the confidence threshold.",
    remediation: "Check each field against the quoted sentence and correct what is wrong.",
  },
  MODEL_UNAVAILABLE: {
    message: "The extraction service did not answer.",
    remediation: "The document is queued. Extraction will run when the service answers.",
  },
  ROSTER_EMPTY: {
    message: "No households are enrolled for this period.",
    remediation: "Enrol households, or select a period with a roster.",
  },
  PERIOD_CLOSED: {
    message: "This period is closed and cannot be changed.",
    remediation: "A correction is issued as a new record in the period it was found.",
  },
  FUNDING_NOT_RECEIVED: {
    message: "No funding has arrived in the disbursement account.",
    remediation: "Transfer the funding amount to the account shown on the funding screen.",
  },
  FUNDING_INSUFFICIENT: {
    message: "The funding in the account is below the amount this run requires.",
    remediation: "Fund the difference, or proceed and record the shortfall in the attestation.",
  },
  FUNDING_EXCLUDES_CHARGES: {
    message: "The funding covers the household amounts but not the transfer charges.",
    remediation: "Add the estimated charges shown in the arithmetic panel.",
  },
  PREFLIGHT_EXCLUSIONS_REQUIRED: {
    message: "Pre-flight found households that cannot be paid in this run.",
    remediation: "Review each exclusion and confirm it before the run executes.",
  },
  ACCOUNT_NOT_FOUND: {
    message: "The destination account does not exist.",
    remediation: "Correct the account on the participant record and retry this failure class.",
  },
  ACCOUNT_DORMANT: {
    message: "The destination account is dormant.",
    remediation: "The household reactivates the account at any branch. Retry after that.",
  },
  ACCOUNT_RESTRICTED: {
    message: "The destination account is restricted.",
    remediation: "The restriction is the bank's. The household resolves it with the bank.",
  },
  BENEFICIARY_FROZEN: {
    message: "The destination account is frozen.",
    remediation: "The account is under a hold. Nothing can be paid to it until the hold lifts.",
  },
  INSUFFICIENT_FUNDS: {
    message: "The disbursement account does not hold enough to send this transfer.",
    remediation: "Fund the account and retry this failure class.",
  },
  LIMIT_EXCEEDED: {
    message: "The transfer exceeds the destination account's tier limit.",
    remediation: "The household upgrades the tier, or the payment is split across periods.",
  },
  BANK_UNAVAILABLE: {
    message: "The destination bank did not answer.",
    remediation: "Retry this failure class. Nothing was debited.",
  },
  TIMEOUT: {
    message: "The transfer timed out and its outcome is not yet known.",
    remediation: "Requery the transfer. Never resend: a resend is how a household is paid twice.",
  },
  TRANSFER_REVERSED: {
    message: "The transfer settled and was then reversed by the bank.",
    remediation: "The settlement stands in the record and the reversal is recorded as a correction.",
  },
  ANCHOR_PENDING: {
    message: "The attestation is computed and is waiting to anchor.",
    remediation: "The hash and the figures are final. The anchor reference appears when it lands.",
  },
  ANCHOR_UNREACHABLE: {
    message: "The anchoring network could not be reached.",
    remediation: "The hash and the proof still verify locally against the attestation.",
  },
  CHAIN_DISCONTINUITY: {
    message: "This attestation does not chain to the previous period.",
    remediation: "The break is recorded. Both records remain readable and neither was rewritten.",
  },
  PROOF_INVALID: {
    message: "The proof path in this bundle does not compute to the stated root.",
    remediation: "Request a fresh disclosure bundle from the developer.",
  },
  LEAF_NOT_IN_ROOT: {
    message: "The transfer in this bundle does not belong to the period it states.",
    remediation: "Check the period on the bundle against the attestation it cites.",
  },
  TOKEN_EXPIRED: {
    message: "This receipt link has expired.",
    remediation: "Reply RECEIPT to the payment notice to receive a new link.",
  },
  ALREADY_CONFIRMED: {
    message: "This payment was already confirmed.",
    remediation: "The confirmation stands with its original timestamp.",
  },
  DISPUTE_ALREADY_OPEN: {
    message: "A dispute is already open for this payment.",
    remediation: "The open dispute carries the earlier claim. It is still being checked.",
  },
  DISPUTE_RESOLUTION_BASIS_REQUIRED: {
    message: "A dispute cannot be closed without a resolution basis.",
    remediation: "A dispute closes on a participant confirmation or a reversal, not on an assertion.",
  },
  RECONCILIATION_MISMATCH: {
    message: "Inbound funding does not reconcile against outbound transfers for this period.",
    remediation: "The delta and its candidate causes are shown. Bank operations sees the same record.",
  },
  PARTICIPANT_DELETE_NOT_PERMITTED: {
    message: "A participant cannot be deleted.",
    remediation: "Removal is a status change with a reason, so the denominator cannot be edited away.",
  },
};
