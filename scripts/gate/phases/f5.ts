import {
  a11y,
  elementAbsent,
  forceCode,
  markersPresent,
  record,
  routeRenders,
  screenshot,
  stateRenders,
  textAbsent,
  typecheck,
} from "../assert";
import { server } from "../server";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Written from F-5's exit checklist, before the console existed.

   The checklist:
   - every listed state reachable and correct
   - no delete control for a participant, and no code path calls the endpoint
   - no control that closes a dispute without a resolution basis
   - the roster virtualises 10,000 rows with no frame drop
   - run detail renders 500 concurrent transfers at 60fps
   - the stream reconnects after a drop without losing table state
   - the commitment arithmetic shows its full working, and a shortfall
     proceeds while being recorded */

const ROOT = process.cwd();

const RUN_LIVE = "/app/runs/run_2026q4";

const ROUTES = [
  "/app",
  "/app/roster",
  "/app/roster/ptc_000331",
  "/app/agents",
  "/app/agents/agt_0001",
  "/app/runs",
  "/app/runs/new",
  RUN_LIVE,
  "/app/runs/run_2026q1",
  "/app/funding",
  "/app/disputes",
  "/app/disputes/dsp_0001",
  "/app/attestations",
  "/app/settings",
];

/* The states each screen lists that are reached by a forced contract code. */
const FORCED: { path: string; code: string; expect: RegExp }[] = [
  { path: "/app", code: "FORBIDDEN", expect: /suspended|does not have access/i },
  { path: "/app/roster", code: "ROSTER_EMPTY", expect: /nobody is enrolled|no households/i },
  { path: "/app/runs/new", code: "ROSTER_EMPTY", expect: /nobody is enrolled|no households/i },
  { path: "/app/runs/new", code: "PERIOD_CLOSED", expect: /period is closed/i },
  { path: "/app/runs/new", code: "FUNDING_NOT_RECEIVED", expect: /no funding has arrived|not arrived/i },
  { path: "/app/runs/new", code: "FUNDING_INSUFFICIENT", expect: /less than the amount required|shortfall/i },
  {
    path: "/app/runs/new",
    code: "PREFLIGHT_EXCLUSIONS_REQUIRED",
    expect: /must be excluded|exclusions/i,
  },
  { path: "/app/funding", code: "RECONCILIATION_MISMATCH", expect: /does not reconcile|mismatch/i },
  { path: "/app/attestations", code: "ANCHOR_PENDING", expect: /not yet anchored|waiting to be anchored/i },
];

/* The states reached by arranging the fixture rather than by forcing a code.
   Each is a URL the console itself offers. */
const ARRANGED: { label: string; href: string; expect: RegExp }[] = [
  { label: "roster filtered", href: "/app/roster?status=flagged", expect: /flagged/i },
  {
    label: "roster filtered to nothing",
    href: "/app/roster?q=zzzzzz",
    expect: /no household matches/i,
  },
  { label: "import partially failed", href: "/app/roster?import=partial", expect: /rows failed/i },
  { label: "import in progress", href: "/app/roster?import=running", expect: /import is running/i },
  { label: "participant flagged", href: "/app/roster/ptc_000090", expect: /flag/i },
  { label: "participant excluded", href: "/app/roster/ptc_000174", expect: /excluded/i },
  { label: "participant removed", href: "/app/roster/ptc_000458", expect: /removed/i },
  { label: "participant duplicate-blocked", href: "/app/roster/ptc_000614", expect: /duplicate/i },
  { label: "participant disputed", href: "/app/roster/ptc_000332", expect: /dispute/i },
  { label: "agent above threshold", href: "/app/agents", expect: /above the threshold/i },
  { label: "agent suspended", href: "/app/agents/agt_0004", expect: /suspended/i },
  { label: "agent with no enrolments", href: "/app/agents/agt_0005", expect: /no enrolments yet/i },
  { label: "run draft", href: "/app/runs/run_draft", expect: /draft/i },
  { label: "run complete clean", href: "/app/runs/run_2026q1", expect: /complete/i },
  { label: "run complete with failures", href: "/app/runs/run_2026q3", expect: /failed|outstanding/i },
  { label: "attestation correction", href: "/app/attestations", expect: /correction/i },
  { label: "dispute awaiting participant", href: "/app/disputes/dsp_0002", expect: /awaiting the participant|responded/i },
  { label: "dispute escalated", href: "/app/disputes/dsp_0003", expect: /escalated/i },
  { label: "dispute substantiated", href: "/app/disputes/dsp_0006", expect: /substantiated/i },
  { label: "dispute unsubstantiated", href: "/app/disputes/dsp_0005", expect: /unsubstantiated/i },
  { label: "api key shown once", href: "/app/settings?tab=keys", expect: /shown once/i },
  { label: "notification preferences", href: "/app/settings?tab=notifications", expect: /notif/i },
];

/* The five failure classes the prompt names, as the contract's own codes. */
const FAILURE_CLASSES = [
  "ACCOUNT_NOT_FOUND",
  "ACCOUNT_DORMANT",
  "LIMIT_EXCEEDED",
  "TIMEOUT",
  "INSUFFICIENT_FUNDS",
];

export async function f5(): Promise<void> {
  typecheck();

  for (const path of ROUTES) {
    await routeRenders(path);
  }

  for (const state of FORCED) {
    await stateRenders(state.path, state.code, state.expect);
  }

  await arrangedStates();
  await preFirstEnrolment();
  await suspendedProject();

  /* A participant is never deleted. The removal is a status change with a
     reason, because the attack on a coverage denominator is to delete the
     households you did not pay. */
  await noDeleteControl();
  noCodePathDeletes();

  /* A dispute closes on a participant confirmation or a reversal. The console
     offers nothing that would close one on the developer's assertion. */
  await noDisputeClosure();

  /* The roster at production scale. */
  await rosterVirtualises(10_000);

  /* The live run under load, which is the screen somebody watches. */
  await liveRunHoldsFrames(500);
  await streamReconnectsWithoutLosingRows();
  await markersPresent(
    RUN_LIVE,
    "data-failure-class",
    FAILURE_CLASSES,
    "each failure class is rendered distinctly with its own remediation",
  );

  /* The arithmetic shows its working, and a shortfall proceeds. */
  await arithmeticShowsItsWorking();
  await shortfallProceedsAndIsRecorded();

  /* The period indicator the prompt puts at the top of the rail on every
     screen. */
  await periodIndicatorEverywhere();

  /* Patch item 10: money is never abbreviated where a figure is audited. */
  for (const path of ["/app", "/app/funding", "/app/attestations", RUN_LIVE]) {
    await textAbsent(
      path,
      /₦\s?\d+(\.\d+)?\s?[kKmMbB]\b/,
      `money is not abbreviated on ${path}`,
    );
  }

  /* Patch item 9: the import format is stated where the operator uploads. */
  importFormatIsStated();

  /* What F-5's independent verification found, each asserted rather than
     fixed and hoped for. */
  await transfersAreGenuinelyInFlight();
  await figuresAgreeAcrossScreens();
  await preflightCanPassAndBlocks();
  await suspensionReachesTheRunBuilder();
  await recordsAreScopedToThisProject();
  await noEnumReachesAReader();
  await aMismatchShowsTheRecord();
  await theClosingStatesAreReachable();
  consoleEndpointsRefuseWhatTheySay();
  noDeleteCallExists();

  await a11y("/app");
  await a11y("/app/roster");
  await a11y("/app/runs/new");
  await a11y(RUN_LIVE);
  await a11y("/app/settings");

  for (const path of ROUTES) {
    await screenshot("F-5", path, path.replace(/\//g, "-").replace(/^-/, ""));
  }
  for (const state of ARRANGED) {
    await screenshot("F-5", state.href, `state-${state.label.replace(/\s+/g, "-")}`);
  }
}

/* ---- what the verification found ------------------------------------------ */

/** The stream resolved every transfer in the tick that queued it, so nothing
    was ever in flight and the pulse could not render. */
async function transfersAreGenuinelyInFlight(): Promise<void> {
  await configureStream({ transfers: 300, rate: 60 });
  const seen = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${RUN_LIVE}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-transfer-row]", { timeout: 30_000 });
    let inFlight = 0;
    let pulses = 0;
    for (let sample = 0; sample < 25; sample += 1) {
      await page.waitForTimeout(200);
      inFlight = Math.max(
        inFlight,
        await page.locator('[data-transfer-row][data-state="in_flight"]').count(),
      );
      pulses = Math.max(pulses, await page.locator(".anim-queue-pulse").count());
    }
    return { inFlight, pulses };
  });
  await configureStream({ transfers: 40, rate: 8 });
  record(
    "transfers are concurrently in flight, and the queue pulse renders on them",
    seen.inFlight > 0 && seen.pulses > 0,
    `${seen.inFlight} rows in flight, ${seen.pulses} pulsing`,
  );
}

/** The home screen counted a closed period's failures into the open one. */
async function figuresAgreeAcrossScreens(): Promise<void> {
  const figures = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    const home = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const failures = /([\d,]+) transfers failed/.exec(home)?.[1] ?? "";
    await page.goto(`${baseUrl}${RUN_LIVE}`, { waitUntil: "networkidle" });
    const run = await page.locator('[data-count="failed"]').first().innerText();
    return { failures, run: run.replace(/\s+/g, " ") };
  });
  const onTheRun = figures.run.split(" of ")[0];
  record(
    "the home screen's failure count is the run's own",
    figures.failures === "" || figures.failures === onTheRun,
    `home ${figures.failures}, run ${figures.run}`,
  );
}

/** Pre-flight always failed, and the next step executed anyway. */
async function preflightCanPassAndBlocks(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/app/runs/new?step=confirm`, { waitUntil: "networkidle" });
    const blockedBefore = await page.locator("[data-execute-blocked]").count();

    await page.goto(`${baseUrl}/app/runs/new?step=preflight`, { waitUntil: "networkidle" });
    const controls = await page.locator("[data-exclude]").count();
    for (let round = 0; round < 6; round += 1) {
      const next = page.locator("[data-exclude]").first();
      if ((await next.count()) === 0) {
        break;
      }
      const id = (await next.getAttribute("data-exclude")) ?? "";
      await page.locator(`[data-exclusion-reason="${id}"]`).fill(
        "The account resolves to another holder and the household is correcting it at the branch.",
      );
      await next.click();
      await page.waitForTimeout(600);
    }
    const passed = await page.locator('[data-preflight="passed"]').count();

    await page.goto(`${baseUrl}/app/runs/new?step=confirm`, { waitUntil: "networkidle" });
    const blockedAfter = await page.locator("[data-execute-blocked]").count();
    const execute = await page.locator("[data-execute]").count();
    return { blockedBefore, controls, passed, blockedAfter, execute };
  });

  record(
    "pre-flight offers a control for each exclusion it found",
    outcome.controls > 0,
    `${outcome.controls} controls`,
  );
  record(
    "a run does not execute while pre-flight has not passed",
    outcome.blockedBefore > 0,
    `${outcome.blockedBefore} blocks before, ${outcome.execute} execute controls after`,
  );
  record(
    "pre-flight passes once every exclusion is recorded with a reason",
    outcome.passed > 0 && outcome.blockedAfter === 0 && outcome.execute > 0,
    `passed ${outcome.passed}, blocked after ${outcome.blockedAfter}`,
  );
}

/** Home said no run could be created; the builder offered to execute one. */
async function suspensionReachesTheRunBuilder(): Promise<void> {
  const { baseUrl } = await server();
  const status = async (value: string | null) => {
    await fetch(`${baseUrl}/api/dev/project-status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "proj_ekuri", status: value }),
    });
  };
  await status("suspended");
  const outcome = await withBrowser(async (page) => {
    await page.goto(`${baseUrl}/app/runs/new?step=confirm`, { waitUntil: "networkidle" });
    return {
      blocked: await page.locator("[data-run-blocked]").count(),
      execute: await page.locator("[data-execute]").count(),
    };
  });
  await status(null);
  record(
    "a suspended project cannot create a run from the builder either",
    outcome.blocked > 0 && outcome.execute === 0,
    `${outcome.blocked} notices, ${outcome.execute} execute controls`,
  );
}

/** Another project's dispute and run rendered inside this console. */
async function recordsAreScopedToThisProject(): Promise<void> {
  const statuses = await withBrowser(async (page, baseUrl) => {
    const read = async (path: string) => {
      const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      return { status: response?.status() ?? 0, body };
    };
    return {
      dispute: await read("/app/disputes/dsp_0004"),
      run: await read("/app/runs/run_delta_q3"),
    };
  });
  const refused = (outcome: { body: string }) =>
    /does not have access|not found/i.test(outcome.body) &&
    !/Akassa|Mangrove/i.test(outcome.body);
  record(
    "a record belonging to another project is not readable in this console",
    refused(statuses.dispute) && refused(statuses.run),
    `${statuses.dispute.body.slice(0, 60)} | ${statuses.run.body.slice(0, 60)}`,
  );
}

/** A household's payment read REVERSED, and a wallet read dormant. */
async function noEnumReachesAReader(): Promise<void> {
  const found: string[] = [];
  const enums = [
    "in_flight",
    "duplicate-blocked",
    "awaiting-participant",
    "developer-responded",
    "preflight-failed",
    "partially-complete",
  ];
  await withBrowser(async (page, baseUrl) => {
    for (const path of [
      "/app/roster/ptc_000174",
      "/app/roster/ptc_000614",
      "/app/roster",
      "/app/runs",
      "/app/disputes",
      "/app/disputes/dsp_0002",
      RUN_LIVE,
    ]) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      for (const token of enums) {
        if (body.includes(token)) {
          found.push(`${path}: ${token}`);
        }
      }
      /* A stamp's own capitals are the stylesheet's, not a code's: the test
         is the contract's spelling, which carries an underscore or a hyphen
         no sentence does. */
      for (const token of ["IN_FLIGHT", "NOT_PERMITTED", "LOW_CONFIDENCE"]) {
        if (body.includes(token)) {
          found.push(`${path}: ${token}`);
        }
      }
    }
  });
  record(
    "no contract enum is shown to a reader in the console",
    found.length === 0,
    found.join(" | "),
  );
}

/** The mismatch collapsed the screen it was about. */
async function aMismatchShowsTheRecord(): Promise<void> {
  await forceCode("RECONCILIATION_MISMATCH", "/api/projects");
  const body = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/app/funding`, { waitUntil: "networkidle" });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  await forceCode(null);
  record(
    "a period that does not reconcile still shows the account and the figures",
    /does not reconcile/i.test(body) &&
      /account number/i.test(body) &&
      /₦/.test(body),
    body.slice(0, 160),
  );
}

/** Neither period state could be reached: the clock was the only way in. */
async function theClosingStatesAreReachable(): Promise<void> {
  const { baseUrl } = await server();
  const period = async (change: Record<string, unknown>) => {
    await fetch(`${baseUrl}/api/dev/period`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "proj_ekuri", ...change }),
    });
  };

  await period({ closesOn: "2026-11-12T23:59:59Z" });
  const closing = await withBrowser(async (page) => {
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });

  await period({ closesOn: null, state: "closed" });
  const closed = await withBrowser(async (page) => {
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  await period({ closesOn: null, state: null });

  record(
    "a period closing within 72 hours is marked",
    /closes (today|tomorrow|in [123] days)/i.test(closing) && /closing/i.test(closing),
    closing.slice(0, 160),
  );
  record(
    "a closed period says so",
    /is closed/i.test(closed),
    closed.slice(0, 120),
  );
}

/** The console's own endpoints claimed refusals they did not make. */
function consoleEndpointsRefuseWhatTheySay(): void {
  const router = readFileSync(join(ROOT, "lib/mock/router.ts"), "utf8");
  const checks: [string, boolean][] = [
    ["an invited user is held, so a second invite is a duplicate", /CONSOLE_USERS\.push\(user\)/.test(router)],
    ["a key's secret is its own", /randomHex\(32\)/.test(router)],
    ["an unknown project is not answered with another project's users", /if \(!projectById\(segments\[2\]\)\) \{\n        return notFound\(\);/.test(router)],
    ["the last administrator is told what the constraint is", /function lastAdmin/.test(router)],
    ["a scheme is matched case-insensitively", /\^https:\\\/\\\/\/i/.test(router)],
  ];
  const broken = checks.filter(([, passed]) => !passed).map(([name]) => name);
  record(
    "the console's own endpoints refuse what they say they refuse",
    broken.length === 0,
    broken.join(" | "),
  );
}

/** The typed client offered the one call the product must never make. */
function noDeleteCallExists(): void {
  const client = readFileSync(join(ROOT, "lib/api/client.ts"), "utf8");
  record(
    "the typed client carries no participant delete call at all",
    !/deleteParticipant/.test(client),
    "",
  );
}

/* ---- the assertions the helpers do not cover ------------------------------ */

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

async function arrangedStates(): Promise<void> {
  const broken: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const state of ARRANGED) {
      await page.goto(`${baseUrl}${state.href}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      if (!state.expect.test(body)) {
        broken.push(`${state.label}: ${body.slice(0, 80)}`);
      }
    }
  });
  record(
    "every state the console lists is reachable and says what it is",
    broken.length === 0,
    broken.join(" | "),
  );
}

/* The home screen before anybody is enrolled, arranged by emptying the
   roster rather than by pointing at a different project. */
async function preFirstEnrolment(): Promise<void> {
  const { baseUrl } = await server();
  const size = async (rows: number | null) => {
    await fetch(`${baseUrl}/api/dev/roster-size`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "proj_ekuri", rows }),
    });
  };
  await size(0);
  const body = await withBrowser(async (page) => {
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  await size(null);
  record(
    "home before the first enrolment says so rather than reading as zero coverage",
    /nobody is enrolled yet/i.test(body),
    body.slice(0, 160),
  );
}

/* A suspended project still has a record to read, and the console says it is
   suspended rather than refusing to open. */
async function suspendedProject(): Promise<void> {
  const { baseUrl } = await server();
  const status = async (value: string | null) => {
    await fetch(`${baseUrl}/api/dev/project-status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "proj_ekuri", status: value }),
    });
  };
  await status("suspended");
  const body = await withBrowser(async (page) => {
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  await status(null);
  record(
    "a suspended project says so and still shows its figures",
    /suspended/i.test(body) && /coverage/i.test(body),
    body.slice(0, 160),
  );
}

async function noDeleteControl(): Promise<void> {
  for (const path of ["/app/roster", "/app/roster/ptc_000331"]) {
    await elementAbsent(
      path,
      '[data-delete], [data-action="delete"], button[name="delete"], form[action*="delete"]',
      `no delete control on ${path}`,
    );
    await textAbsent(
      path,
      /\b(delete|remove permanently|erase)\b/i,
      `${path} offers no deletion, only a status change`,
    );
  }
}

function noCodePathDeletes(): void {
  /* Nothing in the product may call the endpoint, and git grep exits
     non-zero when there is nothing to find, which is the answer we want. */
  let output: string[] = [];
  try {
    output = execFileSync(
      "git",
      ["grep", "-n", "deleteParticipant", "--", "app", "components", "lib", "dev-tools"],
      { cwd: ROOT, stdio: "pipe" },
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    output = [];
  }
  /* The client carries the call and one test asserts that it is refused.
     Nothing else may reach it. */
  const callers = output.filter(
    (line) =>
      !line.startsWith("lib/api/client.ts:") &&
      !line.startsWith("lib/api/client.test.ts:"),
  );
  record(
    "no code path calls the participant delete endpoint",
    callers.length === 0,
    callers.join(" | "),
  );
}

async function noDisputeClosure(): Promise<void> {
  await elementAbsent(
    "/app/disputes/dsp_0001",
    '[data-close-dispute], [data-action="close"], button[name="close"], [data-action="resolve"]',
    "the console offers no control that would close a dispute",
  );
  await textAbsent(
    "/app/disputes/dsp_0001",
    /\b(close this dispute|mark (as )?resolved|dismiss(ing)? the dispute|reject the dispute)\b/i,
    "no copy offers to close a dispute on the developer's assertion",
  );

  const files = execFileSync(
    "git",
    ["grep", "-ln", "dispute", "--", "app", "components"],
    { cwd: ROOT, stdio: "pipe" },
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  const offending = files.filter((file) =>
    /state:\s*"(substantiated|unsubstantiated|closed)"/.test(
      readFileSync(join(ROOT, file), "utf8"),
    ),
  );
  record(
    "no screen sets a dispute's resolution itself",
    offending.length === 0,
    offending.join(", "),
  );
}

async function rosterVirtualises(rows: number): Promise<void> {
  const { baseUrl } = await server();
  await fetch(`${baseUrl}/api/dev/roster-size`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: "proj_ekuri", rows }),
  });

  const measured = await withBrowser(async (page) => {
    await page.goto(`${baseUrl}/app/roster`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-roster-row]", { timeout: 30_000 });
    const reported = await page
      .locator("[data-row-count]")
      .first()
      .getAttribute("data-row-count");
    const inDom = await page.locator("[data-roster-row]").count();

    /* Scrolled, with the frame intervals sampled, because virtualisation that
       drops frames while it recycles is not virtualisation. */
    await page.evaluate(`
      (function () {
        window.__frames = [];
        var last = performance.now();
        function tick(now) { window.__frames.push(now - last); last = now; requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      })();
    `);
    const scroller = page.locator("[data-roster-scroll]").first();
    for (let step = 0; step < 24; step += 1) {
      await scroller.evaluate((node, amount) => {
        node.scrollTop += amount;
      }, 1800);
      await page.waitForTimeout(50);
    }
    const frames = (await page.evaluate("window.__frames.slice(4)")) as number[];
    const sorted = [...frames].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    return { reported: Number(reported), inDom, p95, frames: frames.length };
  });

  await fetch(`${baseUrl}/api/dev/roster-size`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: "proj_ekuri", rows: null }),
  });

  record(
    `the roster virtualises ${rows} rows`,
    measured.reported >= rows && measured.inDom > 0 && measured.inDom < rows,
    `reported ${measured.reported}, in the DOM ${measured.inDom}`,
  );
  record(
    `the roster holds 60fps while scrolling ${rows} rows`,
    measured.p95 <= 1000 / 60 + 1,
    `p95 ${measured.p95.toFixed(1)}ms over ${measured.frames} frames`,
  );
}

async function configureStream(next: Record<string, number>): Promise<void> {
  const { baseUrl } = await server();
  await fetch(`${baseUrl}/api/dev/stream-config`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(next),
  });
}

async function liveRunHoldsFrames(transfers: number): Promise<void> {
  await configureStream({ transfers, rate: 400 });
  const measured = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${RUN_LIVE}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-transfer-row]", { timeout: 30_000 });
    await page.evaluate(`
      (function () {
        window.__frames = [];
        var last = performance.now();
        function tick(now) { window.__frames.push(now - last); last = now; requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      })();
    `);
    /* Long enough for the configured transfers to arrive at the configured
       rate, so the measurement is taken under the load it claims. */
    await page.waitForTimeout(4000);
    const frames = (await page.evaluate("window.__frames.slice(4)")) as number[];
    const inFlight = await page.locator('[data-transfer-row][data-state="in_flight"]').count();
    const rows = await page.locator("[data-transfer-row]").count();
    const sorted = [...frames].sort((a, b) => a - b);
    return {
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      frames: frames.length,
      inFlight,
      rows,
    };
  });
  await configureStream({ transfers: 40, rate: 8 });
  record(
    `run detail holds 60fps with ${transfers} transfers arriving`,
    measured.p95 <= 1000 / 60 + 1 && measured.rows > 0,
    `p95 ${measured.p95.toFixed(1)}ms over ${measured.frames} frames, ${measured.rows} rows, ${measured.inFlight} in flight`,
  );
}

async function streamReconnectsWithoutLosingRows(): Promise<void> {
  await configureStream({ transfers: 120, rate: 40 });
  const measured = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${RUN_LIVE}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-transfer-row][data-state="settled"]', { timeout: 30_000 });
    await page.waitForTimeout(1200);
    const before = await page.locator("[data-transfer-row]").count();
    const settledBefore = await page
      .locator('[data-transfer-row][data-state="settled"]')
      .count();

    /* The forced code drops the connection rather than answering, so the
       reconnecting state is reached the way a dropped connection reaches it. */
    await forceCode("TIMEOUT", "/api/runs/run_2026q4/stream");
    await page.waitForTimeout(1500);
    const noticed = /reconnect/i.test(
      (await page.locator("body").innerText()).replace(/\s+/g, " "),
    );
    const during = await page.locator("[data-transfer-row]").count();
    const settledDuring = await page
      .locator('[data-transfer-row][data-state="settled"]')
      .count();

    await forceCode(null);
    await page.waitForTimeout(2500);
    const after = await page.locator("[data-transfer-row]").count();
    const reconnected = !/reconnect/i.test(
      (await page.locator("body").innerText()).replace(/\s+/g, " "),
    );
    return {
      before,
      during,
      after,
      settledBefore,
      settledDuring,
      noticed,
      reconnected,
    };
  });
  await configureStream({ transfers: 40, rate: 8 });

  record(
    "the stream says it is reconnecting rather than failing silently",
    measured.noticed,
    `${measured.before} rows before, ${measured.during} during`,
  );
  record(
    "the table keeps its state across a dropped stream",
    measured.during >= measured.before &&
      measured.settledDuring >= measured.settledBefore &&
      measured.after >= measured.during,
    `${measured.before} → ${measured.during} → ${measured.after} rows, settled ${measured.settledBefore} → ${measured.settledDuring}`,
  );
  record(
    "the stream resumes once the connection returns",
    measured.reconnected,
    "",
  );
}

async function arithmeticShowsItsWorking(): Promise<void> {
  await markersPresent(
    "/app/runs/new?step=arithmetic",
    "data-arithmetic",
    [
      "commitmentPct",
      "declaredGross",
      "required",
      "estimatedCharges",
      "totalNeeded",
      "funded",
      "shortfall",
    ],
    "the commitment arithmetic shows every term of its working",
  );

  /* Every term read back and the arithmetic checked, so the panel is not
     seven labels over numbers that do not add up. */
  const figures = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/app/runs/new?step=arithmetic`, { waitUntil: "networkidle" });
    return JSON.parse(
      (await page.evaluate(
        `JSON.stringify(Object.fromEntries(Array.from(document.querySelectorAll("[data-arithmetic]")).map(function (node) {
          return [node.getAttribute("data-arithmetic"), node.getAttribute("data-value")];
        })))`,
      )) as string,
    ) as Record<string, string>;
  });

  const value = (key: string): number => Number(figures[key] ?? "NaN");
  const required = (value("declaredGross") * value("commitmentPct")) / 100;
  const totalNeeded = value("required") + value("estimatedCharges");
  const shortfall = Math.max(0, value("totalNeeded") - value("funded"));
  const close = (a: number, b: number) => Math.abs(a - b) < 0.02;
  record(
    "the arithmetic adds up",
    close(required, value("required")) &&
      close(totalNeeded, value("totalNeeded")) &&
      close(shortfall, value("shortfall")),
    JSON.stringify(figures),
  );
}

async function shortfallProceedsAndIsRecorded(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/app/runs/new?step=confirm&funding=short`, {
      waitUntil: "networkidle",
    });
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    /* What blocks a run is pre-flight, never the shortfall: a run short of
       what the commitment requires proceeds and records the shortfall. */
    const blocker =
      (await page.locator("[data-execute-blocked]").count()) > 0
        ? await page.locator("[data-execute-blocked]").first().getAttribute("data-execute-blocked")
        : null;
    return { body, blocked: blocker === "shortfall" };
  });

  record(
    "a shortfall is named with its figure and the consequence stated",
    /shortfall/i.test(outcome.body) &&
      /₦[\d,]+\.\d{2}/.test(outcome.body) &&
      /attestation/i.test(outcome.body),
    outcome.body.slice(0, 200),
  );
  record(
    "a shortfall does not block the run",
    !outcome.blocked,
    outcome.blocked ? "the execute control is absent or disabled" : "",
  );
}

async function periodIndicatorEverywhere(): Promise<void> {
  const missing: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of ROUTES) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const indicator = page.locator("[data-period-indicator]").first();
      const present = (await indicator.count()) > 0;
      const text = present ? await indicator.innerText() : "";
      if (!present || !/days to close/i.test(text.replace(/\s+/g, " "))) {
        missing.push(path);
      }
    }
  });
  record(
    "the period and days to close sit at the top of the rail on every screen",
    missing.length === 0,
    missing.join(", "),
  );
}

function importFormatIsStated(): void {
  const text = readFileSync(join(ROOT, "lib/copy/import.ts"), "utf8");
  const columns = [
    "first_name",
    "last_name",
    "date_of_birth",
    "phone",
    "identity_type",
    "identity_number",
    "account_number",
    "bank_code",
    "community",
    "enrolled_by",
  ];
  const missing = columns.filter((column) => !text.includes(column));
  record(
    "the import format is the one the patch specifies, and the failure download appends its two columns",
    missing.length === 0 &&
      text.includes("error_code") &&
      text.includes("error_message"),
    missing.join(", "),
  );
}
