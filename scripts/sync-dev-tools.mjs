/* Developer tooling must not exist in the production build, not merely be
   route-guarded. These trees are copied into the app only when
   ATTEST_DEV_TOOLS is set, or when the development server starts. Any other
   run removes them, so a production bundle has no such route. */

import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const TREES = [
  { from: join(root, "dev-tools", "dev"), to: join(root, "app", "dev") },
  { from: join(root, "dev-tools", "api-dev"), to: join(root, "app", "api", "dev") },
];

const wanted =
  process.env.ATTEST_DEV_TOOLS === "1" ||
  process.env.npm_lifecycle_event === "predev";

for (const tree of TREES) {
  rmSync(tree.to, { recursive: true, force: true });
  if (wanted && existsSync(tree.from)) {
    cpSync(tree.from, tree.to, { recursive: true });
  }
}

process.stdout.write(
  wanted
    ? "developer tooling included at /dev and /api/dev\n"
    : "developer tooling excluded from this build\n",
);
