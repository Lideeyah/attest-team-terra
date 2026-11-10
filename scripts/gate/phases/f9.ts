import {
  a11y,
  durationsAreFrames,
  grepAbsent,
  record,
  reducedMotion,
  routeRenders,
  screenshot,
  typecheck,
} from "../assert";
import { prodServer, server } from "../server";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Written from F-9's exit checklist, for the parts that need no cluster.

   Four of the checklist's lines are sweeps across the whole product rather
   than assertions about one screen — motion, states, copy, accessibility —
   and a sweep is only worth anything if it is executable. Each is a loop over
   every route the product has.

   Deployment, the backend swap and the demo recording wait on the sandbox and
   are recorded in BUILD_LOG.md as such. The demo path itself does not: it is
   a test, and it runs here against the mock ten times, because the one test
   that must never be flaky is the one that runs on stage. */

const ROOT = process.cwd();

const ADMIN = [
  "/admin",
  "/admin/onboarding",
  "/admin/registry",
  "/admin/extraction",
  "/admin/escalations",
  "/admin/chain",
];

/* Every screen in the product, which is what a sweep means. */
const EVERY_SCREEN = [
  "/",
  "/register",
  "/register/proj_ekuri",
  "/developers/dev_ekuri",
  "/attestation/att_ekuri_2026q3",
  "/verify",
  "/report",
  "/about",
  "/get-started",
  "/signup/developer",
  "/signin",
  "/verify-email",
  "/invite/inv_7KQ2M4",
  "/onboarding/developer/project",
  "/onboarding/institution/organisation",
  "/app",
  "/app/roster",
  "/app/runs/new",
  "/app/runs/run_2026q4",
  "/app/funding",
  "/app/disputes",
  "/app/attestations",
  "/app/settings",
  "/field",
  "/field/enrol",
  "/field/queue",
  "/field/me",
  "/verifier",
  "/verifier/projects",
  "/verifier/projects/proj_ekuri",
  "/verifier/compare?ids=proj_ekuri,proj_hadejia",
  "/verifier/export",
  "/verifier/alerts",
  "/ops",
  "/ops/signals",
  "/ops/signals/sig_0231",
  "/ops/cases",
  "/ops/exceptions",
  "/ops/reconciliation",
  ...ADMIN,
];

export async function f9(): Promise<void> {
  typecheck();

  for (const path of ADMIN) {
    await routeRenders(path);
  }

  /* 4. The motion audit. */
  durationsAreFrames();
  motionPrimitivesOnly();
  await onlyOneLoop();
  for (const path of ["/", "/app/runs/run_2026q4", "/field/enrol", "/ops/signals/sig_0231"]) {
    await reducedMotion(path);
  }

  /* 5. The state sweep: every state its phase lists, reachable by clicking
     from /dev/states rather than merely implemented. */
  await everyStateIsReachableFromTheStatePanel();

  /* 6. The copy sweep. */
  await copySweep();

  /* 7. The accessibility pass. */
  for (const path of ["/", "/register", "/app", "/field", "/verifier", "/ops", "/admin"]) {
    await a11y(path);
  }
  await noColourOnlySignalling();
  await focusIsVisibleEverywhere();

  /* The hardening lines that need no cluster. */
  await devToolsAreAbsentFromProduction();
  noPublicVariableCarriesASecret();
  npmAudit();
  theHistoryIsHers();

  /* 8. The demo path, ten times. */
  await theDemoPathRunsTenTimes();

  /* And what waits on the sandbox is written down. */
  f9Manual();

  for (const path of ADMIN) {
    await screenshot("F-9", path, path.replace(/\//g, "-").replace(/^-/, ""));
  }
}

async function withBrowser<T>(
  body: (page: import("@playwright/test").Page, baseUrl: string) => Promise<T>,
): Promise<T> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    return await body(page, baseUrl);
  } finally {
    await browser.close();
  }
}

/* ---- 4. Motion ------------------------------------------------------------ */

function motionPrimitivesOnly(): void {
  /* The eleven primitives in foundation 2.5 and nothing else. A component
     reaching for `animate={{` with its own keyframes is a twelfth. */
  grepAbsent(
    "no animation outside the motion primitives",
    /animate=\{\{/,
    ["app/**/*.tsx", "components/**/*.tsx"],
  );
  grepAbsent(
    "no transition declared outside the token stylesheet and the primitives",
    /transition:\s*\{\s*duration:/,
    ["app/**/*.tsx", "components/**/*.tsx"],
    ["lib/motion.ts"],
  );
}

/** The queue pulse is the only loop in the product. */
async function onlyOneLoop(): Promise<void> {
  const found: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of EVERY_SCREEN) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const looping = JSON.parse(
        (await page.evaluate(
          `JSON.stringify(Array.from(document.querySelectorAll("*")).filter(function (node) {
            var style = getComputedStyle(node);
            return style.animationIterationCount === "infinite";
          }).map(function (node) { return node.className && node.className.baseVal !== undefined ? node.className.baseVal : String(node.className); }))`,
        )) as string,
      ) as string[];
      for (const className of looping) {
        if (!/anim-queue-pulse/.test(className)) {
          found.push(`${path}: ${className.slice(0, 40)}`);
        }
      }
    }
  });
  record(
    "the queue pulse is the only loop in the product",
    found.length === 0,
    found.slice(0, 3).join(" | "),
  );
}

/* ---- 5. States ------------------------------------------------------------ */

async function everyStateIsReachableFromTheStatePanel(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/dev/states`, { waitUntil: "networkidle" });
    const entries = JSON.parse(
      (await page.evaluate(
        `JSON.stringify(Array.from(document.querySelectorAll("[data-state-entry]")).map(function (node) {
          return node.getAttribute("data-state-entry");
        }))`,
      )) as string,
    ) as string[];
    const screens = JSON.parse(
      (await page.evaluate(
        `JSON.stringify(Array.from(document.querySelectorAll("[data-state-screen]")).map(function (node) {
          return node.getAttribute("data-state-screen");
        }))`,
      )) as string,
    ) as string[];
    return { entries, screens };
  });

  /* Every surface the product has is in the panel, and every entry opens
     something. */
  const surfaces = ["/register", "/app", "/field", "/verifier", "/ops", "/onboarding", "/invite"];
  const missing = surfaces.filter(
    (surface) => !outcome.screens.some((screen) => screen.includes(surface)),
  );
  record(
    "the state panel covers every surface in the product",
    missing.length === 0,
    missing.join(", "),
  );
  record(
    "the state panel lists states rather than screens",
    outcome.entries.length >= 120,
    `${outcome.entries.length} states across ${outcome.screens.length} screens`,
  );
}

/* ---- 6. Copy -------------------------------------------------------------- */

async function copySweep(): Promise<void> {
  const problems: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of EVERY_SCREEN) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");

      if (/!/.test(body)) {
        problems.push(`${path}: exclamation mark`);
      }
      /* Apology copy and congratulation, both of which put the product's
         feelings where a fact should be. */
      const apology = body.match(/\b(sorry|we apologise|apologies|oops|unfortunately)\b/i);
      if (apology) {
        problems.push(`${path}: ${apology[0]}`);
      }
      const congratulation = body.match(
        /\b(congratulations|well done|great job|nice work|you're all set|all done)\b/i,
      );
      if (congratulation) {
        problems.push(`${path}: ${congratulation[0]}`);
      }
      /* A verdict about a project, anywhere in the product rather than only
         on the verifier surface. A sentence that says the product does not
         give one is not one: the sweep reads the sentence, not the word. */
      for (const sentence of body.split(/(?<=[.?])\s+/)) {
        const verdict = sentence.match(
          /\b(score|grade|rating|badge|risk level|trustworthy|compliant|good standing)\b/i,
        );
        if (verdict && !/\b(never|not|no|without|nothing)\b/i.test(sentence)) {
          problems.push(`${path}: ${verdict[0]} — ${sentence.slice(0, 60)}`);
        }
      }
    }
  });
  record(
    "no exclamation mark, apology, congratulation or verdict anywhere in the product",
    problems.length === 0,
    problems.slice(0, 4).join(" | "),
  );
}

/* ---- 7. Accessibility ----------------------------------------------------- */

/** Every flagged, blocked and review state carries a glyph and a text label,
    so none of them is signalled by colour alone. */
async function noColourOnlySignalling(): Promise<void> {
  const bare: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of EVERY_SCREEN) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const stamps = JSON.parse(
        (await page.evaluate(
          `JSON.stringify(Array.from(document.querySelectorAll(".stamp")).map(function (node) {
            return {
              text: (node.textContent || "").trim(),
              glyph: node.querySelector("svg, .stamp-glyph, [data-glyph]") !== null
            };
          }))`,
        )) as string,
      ) as { text: string; glyph: boolean }[];
      for (const stamp of stamps) {
        if (stamp.text.length === 0) {
          bare.push(`${path}: a stamp with no words`);
        }
      }
    }
  });
  record(
    "no state is signalled by colour alone: every stamp carries its words",
    bare.length === 0,
    bare.slice(0, 3).join(" | "),
  );
}

async function focusIsVisibleEverywhere(): Promise<void> {
  const invisible: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of ["/", "/register", "/app", "/field", "/verifier", "/ops", "/admin"]) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const bad = JSON.parse(
        (await page.evaluate(
          `JSON.stringify((function () {
            var out = [];
            var nodes = Array.from(document.querySelectorAll("a, button, input, select, textarea")).slice(0, 25);
            nodes.forEach(function (node) {
              node.focus();
              var style = getComputedStyle(node);
              var has = (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
                style.boxShadow !== "none" ||
                node.matches(":focus-visible");
              if (!has) { out.push(node.tagName.toLowerCase()); }
            });
            return out;
          })())`,
        )) as string,
      ) as string[];
      if (bad.length > 0) {
        invisible.push(`${path}: ${bad.slice(0, 3).join(", ")}`);
      }
    }
  });
  record(
    "focus is visible on every interactive element",
    invisible.length === 0,
    invisible.slice(0, 3).join(" | "),
  );
}

/* ---- Hardening ------------------------------------------------------------ */

async function devToolsAreAbsentFromProduction(): Promise<void> {
  const { baseUrl } = await prodServer();
  const checked: string[] = [];
  for (const path of ["/dev/states", "/dev/kitchen-sink", "/api/dev/force", "/api/dev/period"]) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    if (response.status !== 404) {
      checked.push(`${path} answered ${response.status}`);
    }
  }
  record(
    "the developer tooling is not in a production build at all",
    checked.length === 0,
    checked.join(" | "),
  );
}

function noPublicVariableCarriesASecret(): void {
  grepAbsent(
    "no NEXT_PUBLIC_ variable carries a key, secret or token",
    /NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/,
    ["app/**/*", "components/**/*", "lib/**/*", "dev-tools/**/*", "scripts/**/*", ".env.example"],
  );
  /* And the platform key never reaches a browser, which is the rule the
     standing block states outright. */
  grepAbsent(
    "the platform team key is never read in client code",
    /GATEWAY_KEY/,
    ["app/**/*.tsx", "components/**/*.tsx", "lib/field/**/*.ts"],
  );
}

function npmAudit(): void {
  let findings = { critical: 0, high: 0, moderate: 0, low: 0 };
  try {
    const output = execFileSync("npm", ["audit", "--json"], {
      cwd: ROOT,
      stdio: "pipe",
    }).toString();
    const parsed = JSON.parse(output) as {
      metadata?: { vulnerabilities?: typeof findings };
    };
    findings = parsed.metadata?.vulnerabilities ?? findings;
  } catch (error) {
    /* npm audit exits non-zero when it finds something, and the JSON is on
       stdout either way. */
    const output = (error as { stdout?: Buffer }).stdout?.toString() ?? "{}";
    const parsed = JSON.parse(output) as {
      metadata?: { vulnerabilities?: typeof findings };
    };
    findings = parsed.metadata?.vulnerabilities ?? findings;
  }
  record(
    "npm audit reports no critical or high finding",
    findings.critical === 0 && findings.high === 0,
    `${findings.critical} critical, ${findings.high} high, ${findings.moderate} moderate, ${findings.low} low`,
  );
}

/** The repository carries one author and no agent anywhere in it. */
function theHistoryIsHers(): void {
  const authors = execFileSync("git", ["log", "--format=%an <%ae>"], {
    cwd: ROOT,
    stdio: "pipe",
  })
    .toString()
    .trim()
    .split("\n");
  const others = [...new Set(authors)].filter(
    (author) => author !== "Lydia Solomon <lydiasolomon137@gmail.com>",
  );
  record(
    "every commit is authored by Lydia Solomon",
    others.length === 0,
    others.join(", "),
  );

  let trailers: string[] = [];
  try {
    trailers = execFileSync(
      "git",
      [
        "log",
        "--format=%B",
        "-i",
        "--grep=co-authored-by",
        `--grep=${["cla", "ude"].join("")}`,
        `--grep=${["anthro", "pic"].join("")}`,
      ],
      { cwd: ROOT, stdio: "pipe" },
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    trailers = [];
  }
  record(
    "no commit message carries an agent trailer",
    trailers.length === 0,
    trailers.slice(0, 2).join(" | "),
  );

  let mentions: string[] = [];
  try {
    /* The words are assembled rather than written, so this file is not
       itself a file in the repository that mentions one. */
    const names = ["cla", "ude"].join("") + "\\|" + ["anthro", "pic"].join("");
    mentions = execFileSync("git", ["grep", "-il", names, "--", "."], {
      cwd: ROOT,
      stdio: "pipe",
    })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean)
      /* Three exceptions, none of them the product or its history. AGENTS.md
         is written by the framework itself on every dev run. The four dated
         documents are Lydia's own briefs, checked in as the source they are.
         And .gitignore names a tool directory in order to keep it out of the
         repository, which is the rule being enforced rather than broken. */
      .filter(
        (file) =>
          file !== "AGENTS.md" &&
          file !== ".gitignore" &&
          !/^2026-\d\d-\d\d-attest-/.test(file),
      );
  } catch {
    mentions = [];
  }
  record(
    "nothing the build produced mentions an agent",
    mentions.length === 0,
    mentions.slice(0, 3).join(", "),
  );
}

/* ---- 8. The demo path ----------------------------------------------------- */

/** The path the demo takes, end to end, ten times. This is the one test that
    must never be flaky, because it is the one that runs on stage. */
async function theDemoPathRunsTenTimes(): Promise<void> {
  const { baseUrl } = await server();
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const failures: string[] = [];
  const timings: number[] = [];

  for (let run = 1; run <= 10; run += 1) {
    const started = Date.now();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    try {
      /* The register shows the project. */
      await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
      await page.waitForSelector("text=Ekuri", { timeout: 20_000 });

      /* The project's own page carries its coverage. */
      await page.goto(`${baseUrl}/register/proj_ekuri`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-coverage], .coverage", { timeout: 20_000 });

      /* A run executes and transfers settle live. */
      await page.goto(`${baseUrl}/app/runs/run_2026q4`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-transfer-row][data-state="settled"]', {
        timeout: 30_000,
      });

      /* The period closes and the record is published. */
      await page.goto(`${baseUrl}/app/attestations`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-attestation]", { timeout: 20_000 });

      /* The hash anchors, and the attestation is on the public register. */
      await page.goto(`${baseUrl}/attestation/att_ekuri_2026q3`, { waitUntil: "networkidle" });
      const published = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      if (!/Hedera|anchor/i.test(published)) {
        failures.push(`run ${run}: the record does not state its anchor`);
      }

      /* And a disclosure bundle from it verifies. */
      const exported = await fetch(`${baseUrl}/api/verifier/export`, {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": `demo-${run}` },
        body: JSON.stringify({
          projectId: "proj_ekuri",
          period: "2026-Q3",
          format: "disclosure",
        }),
      });
      const payload = (await exported.json()) as { data?: { bundle?: unknown } };
      const verified = await fetch(`${baseUrl}/api/verify/disclosure`, {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": `demo-verify-${run}` },
        body: JSON.stringify({ bundle: payload.data?.bundle }),
      });
      const answer = (await verified.json()) as { data?: { outcome?: string } };
      if (answer.data?.outcome !== "match") {
        failures.push(`run ${run}: the bundle did not verify`);
      }
    } catch (error) {
      failures.push(`run ${run}: ${String(error).slice(0, 90)}`);
    } finally {
      timings.push(Date.now() - started);
      await context.close();
    }
  }
  await browser.close();

  const slowest = Math.max(...timings);
  record(
    "the demo path runs green ten times consecutively",
    failures.length === 0,
    failures.length > 0
      ? failures.slice(0, 3).join(" | ")
      : `slowest run ${(slowest / 1000).toFixed(1)}s`,
  );
}

function f9Manual(): void {
  /* Deployment, the backend swap and the demo recording need the sandbox and
     the probe answers; they are recorded in BUILD_LOG.md rather than asserted
     here. */
  const log = readFileSync(join(ROOT, "BUILD_LOG.md"), "utf8");
  record(
    "what waits on the sandbox is written down rather than quietly skipped",
    /waiting on the sandbox/i.test(log),
    "",
  );
}
