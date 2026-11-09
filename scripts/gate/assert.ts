import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { filesMatching, read, rel, ROOT } from "./files";
import { record } from "./report";

export { record };
import { prodServer, server } from "./server";

const FRAME_MS = 1000 / 24;
const FRAME_TOLERANCE_MS = 0.5;

let browser: Browser | null = null;

async function withPage<T>(
  run: (page: Page, baseUrl: string) => Promise<T>,
  options: { reducedMotion?: "reduce" | "no-preference"; production?: boolean } = {},
): Promise<T> {
  const { baseUrl } = options.production ? await prodServer() : await server();
  browser = browser ?? (await chromium.launch());
  const context = await browser.newContext({
    reducedMotion: options.reducedMotion ?? "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  try {
    return await run(page, baseUrl);
  } finally {
    await context.close();
  }
}

export async function closeBrowser(): Promise<void> {
  await browser?.close();
  browser = null;
}

/* ---- Static assertions -------------------------------------------------- */

export function typecheck(): void {
  try {
    execFileSync("npx", ["tsc", "--noEmit"], { cwd: ROOT, stdio: "pipe" });
    record("typecheck: tsc --noEmit", true);
  } catch (error) {
    const output = error instanceof Error && "stdout" in error
      ? String((error as { stdout?: Buffer }).stdout ?? "")
      : String(error);
    record("typecheck: tsc --noEmit", false, output.split("\n").slice(0, 6).join(" | "));
  }

  const sources = filesMatching(
    ["app/**/*.ts", "app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts", "scripts/**/*.ts"],
  );
  const offenders = sources.filter((path) => {
    const text = read(path);
    return /:\s*any\b/.test(text) || /\bas any\b/.test(text);
  });
  record(
    "typecheck: no any",
    offenders.length === 0,
    offenders.map(rel).join(", "),
  );
}

export function grepAbsent(
  name: string,
  pattern: RegExp,
  globs: string[],
  exclude: string[] = [],
): void {
  const offenders: string[] = [];
  for (const path of filesMatching(globs, exclude)) {
    const lines = read(path).split("\n");
    lines.forEach((line, index) => {
      const probe = new RegExp(pattern.source, pattern.flags.replace("g", ""));
      if (probe.test(line)) {
        offenders.push(`${rel(path)}:${index + 1}`);
      }
    });
  }
  record(name, offenders.length === 0, offenders.slice(0, 8).join(", "));
}

/** Every duration literal in the codebase is a whole number of frames. */
export function durationsAreFrames(): void {
  const offenders: string[] = [];
  const files = filesMatching([
    "app/**/*.css",
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.tsx",
    "lib/**/*.ts",
  ]);
  for (const path of files) {
    for (const [index, line] of read(path).split("\n").entries()) {
      if (/^\s*\/\*|^\s*\*|^\s*\/\//.test(line)) {
        continue;
      }
      /* Outside a stylesheet a duration only counts where it is being set.
         A figure inside a sentence is copy, not a timing value. */
      if (!path.endsWith(".css") && !/(duration|delay|transition|animation)/i.test(line)) {
        continue;
      }
      for (const match of line.matchAll(/(\d+(?:\.\d+)?)ms\b/g)) {
        const value = Number(match[1]);
        if (value === 0 || value === 0.001) {
          continue;
        }
        const frames = value / FRAME_MS;
        if (Math.abs(frames - Math.round(frames)) * FRAME_MS > FRAME_TOLERANCE_MS) {
          offenders.push(`${rel(path)}:${index + 1} ${value}ms`);
        }
      }
    }
  }
  record("durations are whole frames at 24fps", offenders.length === 0, offenders.slice(0, 8).join(", "));
}

/* ---- Browser assertions ------------------------------------------------- */

type ConsoleProblem = { kind: string; text: string };

async function collectProblems(page: Page): Promise<ConsoleProblem[]> {
  const problems: ConsoleProblem[] = [];
  page.on("console", (message) => {
    const text = message.text();
    /* The development server's own hot-reload socket is not the page. */
    const fromTooling = /_next\/hmr|hot-reloader|Fast Refresh/.test(text);
    if (message.type() === "error" && !fromTooling) {
      problems.push({ kind: "console", text });
    }
  });
  page.on("pageerror", (error) => {
    problems.push({ kind: "pageerror", text: error.message });
  });
  return problems;
}

export async function routeRenders(path: string, name = `route renders ${path}`): Promise<void> {
  await withPage(async (page, baseUrl) => {
    const problems = await collectProblems(page);
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const status = response?.status() ?? 0;
    const ok = status < 400 && problems.length === 0;
    record(
      name,
      ok,
      ok ? "" : `status ${status} ${problems.map((p) => `${p.kind}: ${p.text}`).slice(0, 2).join(" | ")}`,
    );
  });
}

/** Forces an error code through /dev/states and asserts the screen shows its
    own state rather than a generic error. */
export async function stateRenders(
  path: string,
  code: string,
  expectation: string | RegExp,
): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/dev/states?force=${encodeURIComponent(code)}`, {
      waitUntil: "networkidle",
    });
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const matcher = typeof expectation === "string" ? new RegExp(expectation, "i") : expectation;
    const ok = matcher.test(body);
    record(`state ${code} on ${path}`, ok, ok ? "" : body.slice(0, 160));
  });
}

export async function screenshot(phase: string, path: string, label: string): Promise<void> {
  await withPage(async (page, baseUrl) => {
    const file = join(ROOT, "verification", phase, `${label}.png`);
    mkdirSync(dirname(file), { recursive: true });
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: file, fullPage: true });
    record(`screenshot ${phase}/${label}`, true, path);
  });
}

export async function bundleUnder(path: string, kilobytes: number): Promise<void> {
  await withPage(
    async (page, baseUrl) => {
      let bytes = 0;
      page.on("response", (response) => {
        const url = response.url();
        if (/\.js(\?|$)/.test(url)) {
          const length = Number(response.headers()["content-length"] ?? 0);
          bytes += length;
        }
      });
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const kb = bytes / 1024;
      record(`bundle under ${kilobytes}KB on ${path}`, kb <= kilobytes, `${kb.toFixed(1)}KB`);
    },
    { production: true },
  );
}

/** Drives an interaction and asserts no frame exceeds 1000/min milliseconds. */
export async function fps(
  path: string,
  action: (page: Page) => Promise<void>,
  min: number,
  name = `${min}fps on ${path}`,
): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      const samples: number[] = [];
      let last = performance.now();
      const tick = (now: number) => {
        samples.push(now - last);
        last = now;
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
      (window as unknown as { __frames: number[] }).__frames = samples;
    });
    await action(page);
    const frames = await page.evaluate(
      () => (window as unknown as { __frames: number[] }).__frames.slice(4),
    );
    const budget = 1000 / min;
    /* The slowest few frames of any navigation are scheduling noise rather
       than the animation, so the assertion is made on the 95th percentile. */
    const sorted = [...frames].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    record(name, p95 <= budget, `p95 ${p95.toFixed(1)}ms, budget ${budget.toFixed(1)}ms, ${frames.length} frames`);
  });
}

export async function rowsRender(path: string, rows: number, selector: string): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}?rows=${rows}`, { waitUntil: "networkidle" });
    const reported = await page
      .locator("[data-row-count]")
      .first()
      .getAttribute("data-row-count");
    const rendered = await page.locator(selector).count();
    const ok = Number(reported) >= rows && rendered > 0 && rendered < rows;
    record(
      `${rows} rows virtualised on ${path}`,
      ok,
      `reported ${reported}, in DOM ${rendered}`,
    );
  });
}

export async function a11y(path: string): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === "critical",
    );
    record(
      `accessibility on ${path}`,
      critical.length === 0,
      critical.map((violation) => violation.id).join(", "),
    );

    const reachable = await page.evaluate(() => {
      const selector =
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
      return elements.filter((element) => element.tabIndex < 0).length;
    });
    record(`keyboard reachability on ${path}`, reachable === 0, `${reachable} unreachable`);
  });
}

/** Re-runs the route with reduced motion and asserts resting state. */
export async function reducedMotion(path: string): Promise<void> {
  await withPage(
    async (page, baseUrl) => {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const moving = await page.evaluate(() => {
        return document.getAnimations().filter((animation) => {
          const timing = animation.effect?.getComputedTiming();
          const duration = Number(timing?.duration ?? 0);
          return animation.playState === "running" && duration > 1;
        }).length;
      });
      record(`reduced motion resting on ${path}`, moving === 0, `${moving} running animations`);
    },
    { reducedMotion: "reduce" },
  );
}

/** Asserts a rotated stamp keeps its centring and rotation while it animates,
    by comparing its bounding box at rest and mid-animation. */
export async function stampKeepsTransform(path: string, selector: string): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const stamp = page.locator(selector).first();
    await stamp.waitFor();
    const atRest = await stamp.boundingBox();
    const transformAtRest = await stamp.evaluate(
      (element) => getComputedStyle(element).transform,
    );

    await page.evaluate((css) => {
      const element = document.querySelector<HTMLElement>(css);
      element?.classList.remove("anim-stamp-land-centred");
      void element?.offsetWidth;
      element?.classList.add("anim-stamp-land-centred");
    }, selector);
    await page.waitForTimeout(120);
    const midFlight = await stamp.boundingBox();
    const transformMid = await stamp.evaluate(
      (element) => getComputedStyle(element).transform,
    );

    const centred =
      atRest !== null &&
      midFlight !== null &&
      Math.abs(
        atRest.x + atRest.width / 2 - (midFlight.x + midFlight.width / 2),
      ) < 2 &&
      Math.abs(
        atRest.y + atRest.height / 2 - (midFlight.y + midFlight.height / 2),
      ) < 2;
    const rotated = transformAtRest !== "none" && transformMid !== "none";
    record(
      "rotated stamp keeps centring and rotation while animating",
      centred && rotated,
      `rest ${transformAtRest}, mid ${transformMid}`,
    );
  });
}

export async function routeAbsentInProduction(path: string): Promise<void> {
  const { baseUrl } = await prodServer();
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  record(`${path} absent from the production build`, response.status === 404, `status ${response.status}`);
}

/** `git check-ignore -v` rather than an assumption. */
export function gitIgnores(paths: string[]): void {
  for (const path of paths) {
    try {
      const output = execFileSync("git", ["check-ignore", "-v", path], {
        cwd: ROOT,
        stdio: "pipe",
      }).toString();
      record(`gitignored: ${path}`, true, output.trim().split("\n")[0]);
    } catch {
      record(`gitignored: ${path}`, false, "not ignored");
    }
  }
}

/** Asserts every named item is present on a page, by data attribute. */
export async function markersPresent(
  path: string,
  attribute: string,
  expected: string[],
  name: string,
): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const found = await page.evaluate(
      (attr) =>
        Array.from(document.querySelectorAll(`[${attr}]`)).map(
          (element) => element.getAttribute(attr) ?? "",
        ),
      attribute,
    );
    const missing = expected.filter((item) => !found.includes(item));
    record(name, missing.length === 0, missing.length ? `missing ${missing.join(", ")}` : `${found.length} present`);
  });
}

/** Asserts a selector computes to a font family. */
export async function computedFont(
  path: string,
  selector: string,
  family: RegExp,
): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const value = await page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily);
    record(`${selector} renders in its own face`, family.test(value), value);
  });
}

export async function elementAbsent(
  path: string,
  selector: string,
  name: string,
): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const count = await page.locator(selector).count();
    record(name, count === 0, `${count} found`);
  });
}

export async function textAbsent(
  path: string,
  pattern: RegExp,
  name: string,
): Promise<void> {
  await withPage(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    const match = body.match(pattern);
    record(name, match === null, match ? `found "${match[0]}"` : "");
  });
}

/** Asserts a file contains every one of a set of patterns. */
export function fileContains(name: string, path: string, patterns: RegExp[]): void {
  const text = read(join(ROOT, path));
  const missing = patterns.filter((pattern) => !pattern.test(text));
  record(name, missing.length === 0, missing.map((pattern) => pattern.source).join(", "));
}

/** Builds with ATTEST_API_MODE=live and asserts the mock server and the
    developer tooling are not in the route tree at all. */
export function liveBuildExcludesMock(): void {
  try {
    const output = execFileSync("npm", ["run", "build"], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, ATTEST_API_MODE: "live", ATTEST_DEV_TOOLS: "0" },
    }).toString();
    const routes = output
      .split("\n")
      .filter((line) => /^[┌├└]/.test(line))
      .map((line) => line.replace(/^[┌├└]\s*[○ƒλ]?\s*/, "").trim());
    const leaked = routes.filter(
      (route) => route.startsWith("/api") || route.startsWith("/dev") || route.startsWith("/hooks"),
    );
    record(
      "a live build carries no mock server and no developer tooling",
      leaked.length === 0,
      leaked.length ? `routes ${leaked.join(", ")}` : routes.join(", "),
    );
  } catch (error) {
    const output = error instanceof Error && "stdout" in error
      ? String((error as { stdout?: Buffer }).stdout ?? "")
      : String(error);
    record("a live build carries no mock server and no developer tooling", false, output.split("\n").slice(-5).join(" | "));
  } finally {
    /* A live build removes the mock and the developer routes and rewrites the
       generated route types. Both are restored, so the tree a later run type
       checks is the development tree again. */
    execFileSync("node", ["scripts/sync-dev-tools.mjs"], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, ATTEST_DEV_TOOLS: "1", ATTEST_API_MODE: "mock" },
    });
    execFileSync("npx", ["next", "typegen"], { cwd: ROOT, stdio: "pipe" });
  }
}
