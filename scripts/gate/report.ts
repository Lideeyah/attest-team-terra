/* The gate's own reporting. Every assertion prints its result and the runner
   exits non-zero if any failed. */

export type AssertionResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const results: AssertionResult[] = [];

export function record(name: string, passed: boolean, detail = ""): void {
  results.push({ name, passed, detail });
  const mark = passed ? "PASS" : "FAIL";
  process.stdout.write(`  ${mark}  ${name}${detail ? ` — ${detail}` : ""}\n`);
}

export function collected(): AssertionResult[] {
  return results;
}

export function failed(): AssertionResult[] {
  return results.filter((result) => !result.passed);
}
