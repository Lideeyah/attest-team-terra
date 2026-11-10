import { readFileSync } from "node:fs";
import { join } from "node:path";

/* The two values the platform wants as JavaScript rather than as CSS: the
   browser chrome's colour and the installed app's background. Both are in the
   token stylesheet like every other value in the product, and both are read
   from it here rather than restated — a hex literal in a layout is how a
   design system quietly acquires a second source of truth.

   Server-only: this reads a file, and nothing on a phone has to. */

const TOKENS = join(process.cwd(), "app/styles/tokens.css");

let cached: Map<string, string> | null = null;

function tokens(): Map<string, string> {
  if (cached) {
    return cached;
  }
  const text = readFileSync(TOKENS, "utf8");
  const found = new Map<string, string>();
  for (const match of text.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    found.set(match[1], match[2].trim());
  }
  cached = found;
  return found;
}

export function token(name: string, fallback: string): string {
  return tokens().get(name) ?? fallback;
}
