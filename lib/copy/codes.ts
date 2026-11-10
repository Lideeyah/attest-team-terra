import type { ErrorCode } from "@/lib/api/contract";

/* What a reader is told when a code comes back. The code itself is never a
   heading: it means nothing to somebody reading a register, and §1.7 asks for
   the constraint and the arithmetic rather than a symbol. */

/* Every code the contract carries has a heading written for a reader. A code
   with no heading would reach a screen as itself, which means nothing to
   somebody reading a register. The list is total rather than partial so a code
   added to the contract fails the typecheck here until it has words. */
export const CODE_HEADING: Record<ErrorCode, string> = {
  RATE_LIMITED: "Too many requests from this address",
  NOT_FOUND: "There is no record at this address",
  FORBIDDEN: "This account does not have access to that record",
  ANCHOR_PENDING: "This record is waiting to anchor",
  ANCHOR_UNREACHABLE: "The anchoring network could not be reached",
  CHAIN_DISCONTINUITY: "This record does not chain to the period before it",
  PROOF_INVALID: "The proof path does not compute to the stated root",
  LEAF_NOT_IN_ROOT: "That transfer does not belong to the period it names",
  TOKEN_EXPIRED: "This link has expired",
  ALREADY_CONFIRMED: "This payment was already confirmed",
  DISPUTE_ALREADY_OPEN: "A report is already open for this payment",
  REGISTRY_NOT_FOUND: "No project with that identifier",
  REGISTRY_UNREACHABLE: "The registry did not answer",
  BOUNDARY_NOT_AVAILABLE: "The registry does not publish this project's boundary",
  TIMEOUT: "The request did not complete",
  BANK_UNAVAILABLE: "The bank did not answer",

  INVALID_REQUEST: "Something in that request was not understood",
  DUPLICATE_REQUEST: "That has already been sent",
  IDENTITY_DUPLICATE: "That verification number is already enrolled",
  BVN_MISMATCH: "That number does not match the name given",
  IDENTITY_UNREACHABLE: "Identity verification could not be reached",
  NAME_MISMATCH: "The account resolves to a different name",
  NAME_ENQUIRY_EXPIRED: "The account check is too old to rely on",
  NAME_ENQUIRY_MISMATCH: "The account resolves to a different holder",
  BOUNDARY_OUTSIDE: "This enrolment is outside the project boundary",
  GPS_UNAVAILABLE: "The location could not be captured",
  CONSENT_MISSING: "Consent was not recorded",
  DEVICE_UNBOUND: "This device is not bound to an agent",
  PDD_UNREADABLE: "The document could not be read",
  PDD_NO_COMMITMENT: "No benefit-sharing commitment was found in it",
  EXTRACTION_LOW_CONFIDENCE: "The extraction is below the confidence threshold",
  MODEL_UNAVAILABLE: "The extraction service did not answer",
  ROSTER_EMPTY: "Nobody is enrolled on this project",
  PERIOD_CLOSED: "That period is closed",
  FUNDING_NOT_RECEIVED: "No funding has arrived for this period",
  FUNDING_INSUFFICIENT: "Funding is less than the amount required",
  FUNDING_EXCLUDES_CHARGES: "Funding covers the payments but not the charges",
  PREFLIGHT_EXCLUSIONS_REQUIRED: "Enrolments must be excluded before this run executes",
  ACCOUNT_NOT_FOUND: "The account number did not resolve",
  ACCOUNT_DORMANT: "The account is dormant",
  ACCOUNT_RESTRICTED: "The account is restricted",
  BENEFICIARY_FROZEN: "The beneficiary account is frozen",
  INSUFFICIENT_FUNDS: "The disbursement account was short",
  LIMIT_EXCEEDED: "The payment exceeds the wallet's limit",
  TRANSFER_REVERSED: "This transfer was reversed after it settled",
  RECONCILIATION_MISMATCH: "This period does not reconcile",
  PARTICIPANT_DELETE_NOT_PERMITTED: "A household is not deleted",
  DISPUTE_RESOLUTION_BASIS_REQUIRED: "A report closes on a basis, not an assertion",
};

export function headingFor(code: ErrorCode, fallback: string): string {
  return CODE_HEADING[code] ?? fallback;
}

/** An anchor that has not landed, or a chain that does not join, is a fact
    about the record rather than a failure to show it. */
export function isAboutTheRecord(code: ErrorCode): boolean {
  return (
    code === "ANCHOR_PENDING" ||
    code === "ANCHOR_UNREACHABLE" ||
    code === "CHAIN_DISCONTINUITY"
  );
}
