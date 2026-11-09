/* Developer tooling and the mock server must not exist in a production build,
   not merely be route-guarded. Each tree below is copied into the application
   only when its condition holds, and removed otherwise, so the deployed bundle
   has no such route at all.

   ATTEST_DEV_TOOLS=1   includes /dev and /api/dev
   ATTEST_API_MODE=live excludes the mock server and the inbound hook mock */

import { cpSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();

const devTools =
  process.env.ATTEST_DEV_TOOLS === "1" ||
  process.env.npm_lifecycle_event === "predev";

const mockApi = process.env.ATTEST_API_MODE !== "live";

const TREES = [
  { from: join(root, "dev-tools", "dev"), to: join(root, "app", "dev"), when: devTools },
  { from: join(root, "dev-tools", "api-dev"), to: join(root, "app", "api", "dev"), when: devTools },
  {
    from: join(root, "dev-tools", "api-mock", "api"),
    to: join(root, "app", "api", "[[...path]]"),
    when: mockApi,
    inner: "[[...path]]",
  },
  {
    from: join(root, "dev-tools", "api-mock", "hooks"),
    to: join(root, "app", "hooks"),
    when: mockApi,
  },
];

for (const tree of TREES) {
  rmSync(tree.to, { recursive: true, force: true });
  if (!tree.when) {
    continue;
  }
  const source = tree.inner ? join(tree.from, tree.inner) : tree.from;
  if (existsSync(source)) {
    cpSync(source, tree.to, { recursive: true });
  }
}

/* Next writes a route validator from the route tree. Removing a route without
   clearing it leaves the validator importing a file that no longer exists. */
for (const stale of [join(root, ".next", "types"), join(root, ".next", "dev", "types")]) {
  rmSync(stale, { recursive: true, force: true });
}

/* The route types are generated from the route tree this script just changed,
   so they are rebuilt here rather than left stale for the next typecheck. */
spawnSync("npx", ["next", "typegen"], { cwd: root, stdio: "ignore" });

process.stdout.write(
  `developer tooling ${devTools ? "included" : "excluded"}, mock server ${
    mockApi ? "included" : "excluded"
  }\n`,
);
