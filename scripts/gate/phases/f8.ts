import {
  a11y,
  forceCode,
  record,
  routeRenders,
  screenshot,
  textAbsent,
  typecheck,
} from "../assert";
import { server } from "../server";

/* Written from F-8's exit checklist, before the operations console existed.

   The checklist:
   - the account graph renders the 400-node sweep legibly and performantly
   - all five signal classes render distinctly
   - the sampled state is stated on screen when the endpoint samples
   - every listed state reachable

   And the rule that runs under the whole phase: raw signal evidence appears
   nowhere but here. The public register and the verifier portal publish a
   count; this console is the only place the accounts behind it are drawn. */

const ROUTES = [
  "/ops",
  "/ops/signals",
  "/ops/signals/sig_0231",
  "/ops/cases",
  "/ops/exceptions",
  "/ops/reconciliation",
];

const CLASSES = [
  "onward-concentration",
  "velocity",
  "shared-device",
  "dormant-reactivation",
  "round-tripping",
];

const STATES: { label: string; href: string; expect: RegExp }[] = [
  { label: "signals filtered by class", href: "/ops/signals?class=velocity", expect: /velocity|money moving/i },
  { label: "signals filtered by severity", href: "/ops/signals?severity=high", expect: /signal/i },
  { label: "signals, none open", href: "/ops/signals?state=none", expect: /no signal/i },
  { label: "a signal already on a case", href: "/ops/signals?state=attached", expect: /case/i },
  { label: "cases", href: "/ops/cases", expect: /case/i },
  { label: "an action waiting for authorisation", href: "/ops/cases?action=pending", expect: /authoris/i },
  { label: "an action refused", href: "/ops/cases?action=refused", expect: /does not have access|refused/i },
  { label: "exceptions", href: "/ops/exceptions", expect: /exception/i },
  { label: "exceptions, none", href: "/ops/exceptions?state=none", expect: /no verification exception/i },
  { label: "reconciliation", href: "/ops/reconciliation", expect: /reconcil/i },
  { label: "a period not yet closed", href: "/ops/reconciliation", expect: /period open|not yet closed/i },
  { label: "the graph still loading", href: "/ops/signals/sig_0231?graph=loading", expect: /drawing|loading/i },
  { label: "no onward movement yet", href: "/ops/signals/sig_0231?graph=none", expect: /no onward movement/i },
  { label: "onward movement entirely ordinary", href: "/ops/signals/sig_0231?graph=ordinary", expect: /nothing concentrat|ordinary/i },
];

export async function f8(): Promise<void> {
  typecheck();

  for (const path of ROUTES) {
    await routeRenders(path);
  }

  await listedStates();

  /* The five classes, each with its own words. A class rendered as its own
     enum, or five classes sharing one sentence, would make the queue a list
     of identical rows. */
  await everyClassRendersDistinctly();

  /* The graph: four hundred wallets sweeping into three accounts. */
  await theGraphRendersTheSweep();
  await theGraphHoldsItsFramesWhilePanning();
  await samplingIsStatedWhenItHappens();

  /* Severity is a bank's own triage, not a verdict about a project. */
  await textAbsent(
    "/ops/signals",
    /\b(guilty|fraudster|criminal|scam|dishonest|corrupt)\b/i,
    "the signals queue describes accounts and patterns, not people",
  );

  /* A refused action is the authorisation answering, not the console
     deciding. */
  await anActionCanBeRefused();

  await a11y("/ops");
  await a11y("/ops/signals");
  await a11y("/ops/cases");

  for (const path of ROUTES) {
    await screenshot("F-8", path, path.replace(/\//g, "-").replace(/^-/, ""));
  }
  for (const state of STATES) {
    await screenshot("F-8", state.href, `state-${state.label.replace(/[^a-z0-9]+/gi, "-")}`);
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

async function listedStates(): Promise<void> {
  const broken: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const state of STATES) {
      await page.goto(`${baseUrl}${state.href}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      if (!state.expect.test(body)) {
        broken.push(`${state.label}: ${body.slice(0, 80)}`);
      }
    }
  });
  record(
    "every state the operations console lists is reachable and says what it is",
    broken.length === 0,
    broken.join(" | "),
  );
}

async function everyClassRendersDistinctly(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ops/signals`, { waitUntil: "networkidle" });
    const rendered = JSON.parse(
      (await page.evaluate(
        `JSON.stringify(Array.from(document.querySelectorAll("[data-signal-class]")).map(function (node) {
          return [node.getAttribute("data-signal-class"), (node.textContent || "").replace(/\\s+/g, " ").trim()];
        }))`,
      )) as string,
    ) as [string, string][];
    return rendered;
  });

  const seen = new Map(outcome);
  const missing = CLASSES.filter((signalClass) => !seen.has(signalClass));
  /* Distinct means each says something the others do not: five rows sharing
     one sentence is one row five times. */
  const sentences = new Set(
    [...seen.values()].map((text) => text.slice(0, 120)),
  );
  record(
    "all five signal classes render, each with its own words",
    missing.length === 0 && sentences.size === seen.size && seen.size >= 5,
    missing.length > 0 ? `missing ${missing.join(", ")}` : `${seen.size} classes, ${sentences.size} distinct`,
  );
  /* And none of them is shown as the contract's own spelling. */
  const raw = [...seen.values()].filter((text) => /[a-z]+-[a-z]+/.test(text));
  record(
    "no signal class is shown to a reader as its contract name",
    raw.length === 0,
    raw.slice(0, 2).join(" | "),
  );
}

async function theGraphRendersTheSweep(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ops/signals/sig_0231`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-graph-node]", { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const nodes = await page.locator("[data-graph-node]").count();
    const edges = await page.locator("[data-graph-edge]").count();
    const concentrators = await page.locator('[data-graph-node][data-kind="concentrator"]').count();
    /* Legible means the nodes are not all on top of one another. */
    const spread = (await page.evaluate(
      `(function () {
        var nodes = Array.from(document.querySelectorAll("[data-graph-node]"));
        if (nodes.length === 0) { return 0; }
        var xs = nodes.map(function (node) { return node.getBoundingClientRect().x; });
        var ys = nodes.map(function (node) { return node.getBoundingClientRect().y; });
        return Math.min(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
      })()`,
    )) as number;
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return { nodes, edges, concentrators, spread, body };
  });

  /* The endpoint samples a population of four hundred down to two hundred
     and twenty, which is the contract's own behaviour and is stated on the
     screen; the assertion is that what it does draw is the sweep. */
  record(
    "the account graph draws the sweep: hundreds of wallets into a few accounts",
    outcome.nodes >= 200 && outcome.edges >= 200 && outcome.concentrators > 0,
    `${outcome.nodes} nodes, ${outcome.edges} edges, ${outcome.concentrators} concentrating`,
  );
  record(
    "the graph is legible rather than a single blot",
    outcome.spread > 200,
    `${Math.round(outcome.spread)}px across`,
  );
  record(
    "the graph states the amounts and the window it covers",
    /₦/.test(outcome.body) && /hour|within/i.test(outcome.body),
    outcome.body.slice(0, 140),
  );
}

async function theGraphHoldsItsFramesWhilePanning(): Promise<void> {
  const measured = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ops/signals/sig_0231`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-graph-node]", { timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.evaluate(`
      (function () {
        window.__frames = [];
        var last = performance.now();
        function tick(now) { window.__frames.push(now - last); last = now; requestAnimationFrame(tick); }
        requestAnimationFrame(tick);
      })();
    `);
    const surface = page.locator("[data-graph]").first();
    const box = await surface.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      for (let step = 0; step < 30; step += 1) {
        await page.mouse.move(
          box.x + box.width / 2 + step * 6,
          box.y + box.height / 2 + step * 3,
        );
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
    }
    const frames = (await page.evaluate("window.__frames.slice(4)")) as number[];
    const sorted = [...frames].sort((a, b) => a - b);
    return { p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, frames: frames.length };
  });
  record(
    "the graph holds 60fps while it is panned",
    measured.p95 <= 1000 / 60 + 1,
    `p95 ${measured.p95.toFixed(1)}ms over ${measured.frames} frames`,
  );
}

async function samplingIsStatedWhenItHappens(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ops/signals/sig_0231`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-graph-node]", { timeout: 30_000 });
    const sampled = await page.locator("[data-sampled]").first().getAttribute("data-sampled");
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return { sampled, body };
  });
  const says = /showing [\d,]+ of [\d,]+|sampled/i.test(outcome.body);
  record(
    "a sampled graph says it is sampled, and says of how many",
    outcome.sampled === "false" ? !/sampled/i.test(outcome.body) : says,
    `sampled=${outcome.sampled} · ${outcome.body.slice(0, 120)}`,
  );
}

async function anActionCanBeRefused(): Promise<void> {
  await forceCode("FORBIDDEN", "/api/ops/cases");
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ops/cases`, { waitUntil: "networkidle" });
    const control = page.locator("[data-case-action]").first();
    if ((await control.count()) > 0) {
      await control.click();
      await page.waitForTimeout(1200);
    }
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  await forceCode(null);
  record(
    "an action this account may not take is refused and says so",
    /does not have access|not authorised|refused/i.test(outcome),
    outcome.slice(0, 140),
  );
}
