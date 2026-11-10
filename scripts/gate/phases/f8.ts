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

  /* What F-8's independent verification found. */
  await anActionChangesTheCase();
  await aRefusedReadIsNotAZero();
  await theBalanceAgreesWithItsOwnArithmetic();
  await theGraphsFiguresAddUp();
  await theGraphIsTheSignalsOwn();
  await nothingOpenIsReachable();

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

/* The console said "Recorded — the case closes as unsubstantiated" while the
   card above it still read "Being investigated", and the note the dialog
   insisted on was discarded. */
async function anActionChangesTheCase(): Promise<void> {
  const note =
    "Cleared after the enrolment records accounted for every one of the accounts.";
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ops/cases`, { waitUntil: "networkidle" });
    const before = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    await page.locator('[data-case-action="clear"]').first().click();
    await page.locator("[data-case-note]").fill(note);
    await page.locator("[data-case-confirm]").click();
    await page.waitForTimeout(2500);
    const after = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return { before, after };
  });

  record(
    "an action changes the case it was taken on",
    /being investigated/i.test(outcome.before) &&
      /unsubstantiated/i.test(outcome.after),
    outcome.after.slice(0, 160),
  );
  record(
    "the note the action required is on the case record",
    outcome.after.includes("accounted for every one of the accounts"),
    outcome.after.slice(0, 160),
  );

  /* And the server refuses an action it does not have, or one with no
     reason: a console that can post anything is not a record. */
  const { baseUrl } = await server();
  const bad = await fetch(`${baseUrl}/api/ops/cases/case_0231/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "detonate", note }),
  });
  const noReason = await fetch(`${baseUrl}/api/ops/cases/case_0231/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "documentation" }),
  });
  record(
    "an action that is not an action, and one with no reason, are both refused",
    bad.status >= 400 && noReason.status >= 400,
    `${bad.status} and ${noReason.status}`,
  );
}

/* A 403 rendered as "no case is open" is the worst available failure on a
   console about suspected fraud. */
async function aRefusedReadIsNotAZero(): Promise<void> {
  await forceCode("FORBIDDEN", "/api/ops/cases");
  const body = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ops`, { waitUntil: "networkidle" });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  await forceCode(null);
  record(
    "a read that was refused is said to be refused, not counted as zero",
    /could not be read|does not have access/i.test(body) &&
      !/no case is open/i.test(body),
    body.slice(0, 160),
  );
}

/* Inbound minus outbound minus charges, against the balance printed beside
   them. They were not the same number. */
async function theBalanceAgreesWithItsOwnArithmetic(): Promise<void> {
  const { baseUrl } = await server();
  const payload = (await (await fetch(`${baseUrl}/api/ops/reconciliation`)).json()) as {
    data?: {
      period: string;
      inbound: string;
      outbound: string;
      charges: string;
      balance: string;
      delta: string;
      state: string;
    }[];
  };
  const wrong = (payload.data ?? []).filter((row) => {
    const computed =
      Number(row.inbound) - Number(row.outbound) - Number(row.charges);
    return Math.abs(computed - Number(row.balance)) > 0.01;
  });
  record(
    "every reconciliation row's balance is its own arithmetic",
    wrong.length === 0,
    wrong
      .slice(0, 2)
      .map((row) => `${row.period}: ${row.inbound}−${row.outbound}−${row.charges} ≠ ${row.balance}`)
      .join(" | "),
  );
}

/* The money total on the drawing belonged to neither the sample drawn nor
   the population named. */
async function theGraphsFiguresAddUp(): Promise<void> {
  const { baseUrl } = await server();
  const graph = (await (await fetch(`${baseUrl}/api/ops/signals/sig_0231/graph`)).json()) as {
    data?: {
      nodes: { id: string; kind: string; amount: string }[];
      edges: { to: string; amount: string }[];
      sampleSize: number;
      populationSize: number;
    };
  };
  const data = graph.data;
  if (!data) {
    record("the graph's figures add up", false, "no graph");
    return;
  }
  const concentrators = data.nodes.filter((node) => node.kind === "concentrator");
  const stated = concentrators.reduce((sum, node) => sum + Number(node.amount), 0);
  const reaching = data.edges
    .filter((edge) => concentrators.some((node) => node.id === edge.to))
    .reduce((sum, edge) => sum + Number(edge.amount), 0);

  const body = await withBrowser(async (page, baseUrl2) => {
    await page.goto(`${baseUrl2}/ops/signals/sig_0231`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-graph-node]", { timeout: 30_000 });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });

  record(
    "each account's amount is what the drawing shows reaching it",
    Math.abs(stated - reaching) < 0.01,
    `${stated} stated, ${reaching} reaching`,
  );
  record(
    "the legend says how many wallets are drawn, of how many the period paid",
    body.includes(`${data.sampleSize.toLocaleString("en-NG")} of ${data.populationSize.toLocaleString("en-NG")}`),
    body.slice(0, 160),
  );
  record(
    "the movements are on the screen with their amounts and their timing",
    /after it settled/i.test(body) && /first hop/i.test(body),
    body.slice(0, 160),
  );
}

/* A concentration graph was served for every signal, including a
   shared-device one whose own account count the page printed beside it. */
async function theGraphIsTheSignalsOwn(): Promise<void> {
  const { baseUrl } = await server();
  const broken: string[] = [];
  for (const id of ["sig_0231", "sig_0233", "sig_0234"]) {
    const signal = (await (await fetch(`${baseUrl}/api/ops/signals/${id}`)).json()) as {
      data?: { accounts: number };
    };
    const graph = (await (await fetch(`${baseUrl}/api/ops/signals/${id}/graph`)).json()) as {
      data?: { populationSize: number };
    };
    if (signal.data?.accounts !== graph.data?.populationSize) {
      broken.push(
        `${id}: ${signal.data?.accounts} accounts, graph of ${graph.data?.populationSize}`,
      );
    }
  }
  record(
    "a signal's graph is about the accounts that signal names",
    broken.length === 0,
    broken.join(" | "),
  );
}

/* "Nothing open" is the first state the phase lists and there was no way to
   reach it. */
async function nothingOpenIsReachable(): Promise<void> {
  const { baseUrl } = await server();
  const empty = async (value: boolean) => {
    await fetch(`${baseUrl}/api/dev/ops-empty`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ empty: value }),
    });
  };
  await empty(true);
  const body = await withBrowser(async (page) => {
    await page.goto(`${baseUrl}/ops`, { waitUntil: "networkidle" });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  await empty(false);
  record(
    "nothing open is reachable, and says so",
    /nothing is open/i.test(body),
    body.slice(0, 140),
  );
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
