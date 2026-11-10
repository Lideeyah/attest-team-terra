import type { ErrorCode } from "@/lib/api/contract";

/* What a reader is told when a code comes back. The code itself is never a
   heading: it means nothing to somebody reading a register, and §1.7 asks for
   the constraint and the arithmetic rather than a symbol. */

export const CODE_HEADING: Partial<Record<ErrorCode, string>> = {
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
  TIMEOUT: "The request did not complete",
  BANK_UNAVAILABLE: "The bank did not answer",
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
