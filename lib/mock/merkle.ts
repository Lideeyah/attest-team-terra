import { createHash } from "node:crypto";

/* A Merkle path, computed rather than asserted. The disclosure bundle an
   auditor receives folds its leaf up this path to the period's root; if it
   does not fold to that root it proves nothing, and that is the difference
   between an invalid proof and a leaf from another period. */

/* Leaves and internal nodes are hashed in separate domains, and a bundle
   carries the facts its leaf is computed from rather than the leaf alone. Both
   are needed: without the domains an internal node can be passed off as a
   leaf one level up, and without the facts the period's own published root
   folds to itself through an empty path and verifies as a payment. */
const LEAF_DOMAIN = "attest-leaf-v1";
const NODE_DOMAIN = "attest-node-v1";

export function hashPair(left: string, right: string): string {
  const [a, b] = left <= right ? [left, right] : [right, left];
  return createHash("sha256").update(`${NODE_DOMAIN}|${a}|${b}`).digest("hex");
}

/** The number of levels between a leaf and the root of a set of this size, so
    a proof of the wrong length is refused rather than folded. */
export function depthOf(count: number): number {
  let level = Math.max(1, count);
  let depth = 0;
  while (level > 1) {
    level = Math.ceil(level / 2);
    depth += 1;
  }
  return depth;
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
    return createHash("sha256").update(`${NODE_DOMAIN}|empty`).digest("hex");
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
    .update(
      `${LEAF_DOMAIN}|${transfer.id}|${transfer.amount}|${transfer.sessionId ?? ""}|${transfer.settledAt ?? ""}`,
    )
    .digest("hex");
}
