import { createHash } from "node:crypto";

/* A Merkle path, computed rather than asserted. The disclosure bundle an
   auditor receives folds its leaf up this path to the period's root; if it
   does not fold to that root it proves nothing, and that is the difference
   between an invalid proof and a leaf from another period. */

export function hashPair(left: string, right: string): string {
  const [a, b] = left <= right ? [left, right] : [right, left];
  return createHash("sha256").update(`${a}${b}`).digest("hex");
}

export function foldProof(leaf: string, proof: string[]): string {
  return proof.reduce((node, sibling) => hashPair(node, sibling), leaf);
}

/** The path from one leaf to the root of a set. */
export function proofFor(leaves: string[], index: number): string[] {
  let level = [...leaves];
  let position = index;
  const path: string[] = [];

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      if (i === position || i + 1 === position) {
        path.push(i === position ? right : left);
        position = next.length;
      }
      next.push(hashPair(left, right));
    }
    level = next;
  }

  return path;
}

export function rootOf(leaves: string[]): string {
  if (leaves.length === 0) {
    return createHash("sha256").update("").digest("hex");
  }
  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(hashPair(level[i], level[i + 1] ?? level[i]));
    }
    level = next;
  }
  return level[0];
}

/** A transfer's leaf: the facts the auditor is allowed to see about it. */
export function leafFor(transfer: {
  id: string;
  amount: string;
  sessionId: string | null;
  settledAt: string | null;
}): string {
  return createHash("sha256")
    .update(`${transfer.id}|${transfer.amount}|${transfer.sessionId ?? ""}|${transfer.settledAt ?? ""}`)
    .digest("hex");
}
