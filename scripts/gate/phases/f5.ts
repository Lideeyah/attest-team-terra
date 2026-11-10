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
  { label: "run complete clean", href: "/app/runs/run_hadejia_q2", expect: /complete/i },
  { label: "run complete with failures", href: "/app/runs/run_2026q3", expect: /failed|outstanding/i },
  { label: "attestation correction", href: "/app/attestations", expect: /correction/i },
  { label: "dispute awaiting participant", href: "/app/disputes/dsp_0002", expect: /awaiting the participant|responded/i },
  { label: "dispute escalated", href: "/app/disputes/dsp_0003", expect: /escalated/i },
  { label: "dispute substantiated", href: "/app/disputes/dsp_0004", expect: /substantiated/i },
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
  /* The client carries the refused call so the refusal is loud rather than a
     silent absence. Nothing else may reach it. */
  const output = execFileSync(
    "git",
    ["grep", "-n", "deleteParticipant", "--", "app", "components", "lib", "dev-tools"],
    { cwd: ROOT, stdio: "pipe" },
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
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
    const execute = page.locator("[data-execute]");
    const blocked = (await execute.count()) === 0 || (await execute.first().isDisabled());
    return { body, blocked };
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
