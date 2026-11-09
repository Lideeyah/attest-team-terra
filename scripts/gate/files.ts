import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const IGNORED = new Set([
  "node_modules",
  ".next",
  ".git",
  "verification",
  "test-results",
  "playwright-report",
]);

export const ROOT = process.cwd();

export function walk(directory: string = ROOT): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (IGNORED.has(entry)) {
      continue;
    }
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full));
    } else {
      found.push(full);
    }
  }
  return found;
}

function matches(path: string, globs: string[]): boolean {
  const relativePath = relative(ROOT, path);
  return globs.some((glob) => {
    const pattern = glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "::ANY::")
      .replace(/\*/g, "[^/]*")
      .replace(/::ANY::/g, ".*");
    return new RegExp(`^${pattern}$`).test(relativePath);
  });
}

export function filesMatching(globs: string[], exclude: string[] = []): string[] {
  return walk().filter(
    (path) => matches(path, globs) && !matches(path, exclude),
  );
}

export function read(path: string): string {
  return readFileSync(path, "utf8");
}

export function rel(path: string): string {
  return relative(ROOT, path);
}
