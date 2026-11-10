/* The gate. `npm run gate -- F-0` runs one phase's assertions, prints each
   result and exits non-zero if any failed. Phases are written before the code
   they gate. */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeBrowser } from "./gate/assert";
import { failed, collected } from "./gate/report";
import { stopAll } from "./gate/server";
import { f0 } from "./gate/phases/f0";
import { f1 } from "./gate/phases/f1";
import { f2 } from "./gate/phases/f2";
import { f3 } from "./gate/phases/f3";
import { f4 } from "./gate/phases/f4";
import { f5 } from "./gate/phases/f5";
import { f6 } from "./gate/phases/f6";
import { f7 } from "./gate/phases/f7";
import { f8 } from "./gate/phases/f8";

const PHASES: Record<string, () => Promise<void>> = {
  "F-0": f0,
  "F-1": f1,
  "F-2": f2,
  "F-3": f3,
  "F-4": f4,
  "F-5": f5,
  "F-6": f6,
  "F-7": f7,
  "F-8": f8,
};

async function main(): Promise<void> {
  const phase = process.argv[2];
  if (!phase || !(phase in PHASES)) {
    process.stdout.write(
      `usage: npm run gate -- <phase>\nknown phases: ${Object.keys(PHASES).join(", ")}\n`,
    );
    process.exit(2);
  }

  process.stdout.write(`\nGATE ${phase}\n`);
  const started = Date.now();
  try {
    await PHASES[phase]();
  } catch (error) {
    process.stdout.write(`  FAIL  gate threw — ${String(error)}\n`);
    process.exitCode = 1;
  } finally {
    await closeBrowser();
    stopAll();
  }

  const failures = failed();
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const summary = `${collected().length - failures.length} passed, ${failures.length} failed in ${seconds}s`;
  process.stdout.write(`\n${summary}\n`);

  /* The result is written beside the phase's screenshots so the contact sheet
     can show it without re-running anything. */
  const directory = join(process.cwd(), "verification", phase);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "gate.txt"),
    `${collected()
      .map((result) => `${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
      .join("\n")}\n${summary}\n`,
  );
  if (failures.length > 0) {
    process.exitCode = 1;
  }
  process.exit(process.exitCode ?? 0);
}

void main();
