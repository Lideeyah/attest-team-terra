import {
  a11y,
  forceCode,
  bundleUnder,
  elementAbsent,
  grepAbsent,
  record,
  routeRenders,
  screenshot,
  stateRenders,
  textAbsent,
  typecheck,
} from "../assert";
import { server } from "../server";

/* Written from F-3's exit checklist, before the public surfaces existed. */

const ROUTES = [
  "/register",
  "/register/proj_ekuri",
  "/developers/dev_ekuri",
  "/attestation/att_ekuri_2026q3",
  "/verify",
  "/report",
  "/receipt/rct_ngozi_eyo_2026q4",
];

/* Every state each screen's prompt lists, with the code that forces it and a
   phrase the screen must show when it does. A state is not delivered until it
   is reachable from /dev/states and says something true when it is. */
const STATES: { path: string; code: string; expect: RegExp }[] = [
  { path: "/register", code: "RATE_LIMITED", expect: /too many requests|rate/i },
  { path: "/register/proj_ekuri", code: "NOT_FOUND", expect: /no record at this address|not found/i },
  { path: "/attestation/att_ekuri_2026q3", code: "ANCHOR_PENDING", expect: /waiting to anchor|anchor pending/i },
  { path: "/attestation/att_ekuri_2026q3", code: "CHAIN_DISCONTINUITY", expect: /does not chain|discontinuity/i },
  { path: "/receipt/rct_ngozi_eyo_2026q4", code: "TOKEN_EXPIRED", expect: /expired/i },
  { path: "/receipt/rct_ngozi_eyo_2026q4", code: "ALREADY_CONFIRMED", expect: /already confirmed/i },
  { path: "/receipt/rct_ngozi_eyo_2026q4", code: "DISPUTE_ALREADY_OPEN", expect: /already open/i },
];

export async function f3(): Promise<void> {
  typecheck();

  for (const path of ROUTES) {
    await routeRenders(path);
  }

  for (const state of STATES) {
    await stateRenders(state.path, state.code, state.expect);
  }

  /* The report's own states are reached by filing one, because that is when
     it talks to the API at all. */
  await reportStates();

  /* A project with no closed period states its commitment and explicit zeros
     rather than an empty state: the denominator is the product. */
  await textOnPage(
    "/register/proj_oban",
    [/0 of \d/, /commitment/i],
    "a project with no closed period shows its commitment and explicit zeros",
  );

  /* Coverage is never a bare percentage. */
  await coverageCarriesItsDenominator();

  /* Single-transfer verification distinguishes a valid bundle, an invalid
     proof path and a leaf from another period. */
  await verifyModes();

  /* The receipt is built for a cheap phone on an intermittent connection. */
  await bundleUnder("/receipt/rct_ngozi_eyo_2026q4", 50);
  await noWebFonts("/receipt/rct_ngozi_eyo_2026q4");

  /* No household coordinate is obtainable from a public route, from the
     geography endpoint or from anything the map renders. */
  await noHouseholdCoordinates();

  /* Status is carried by stamps, and there is no success colour. */
  await elementAbsent(
    "/register",
    "[data-success-colour]",
    "no success colour on the register",
  );
  await textAbsent(
    "/register/proj_ekuri",
    /\b(compliant|trustworthy|high.risk|certified|good standing|verdict|score|grade|rating)\b/i,
    "the project page states no verdict about the project",
  );

  /* The register is profiled at the size it will reach. */
  await registerAtScale(500);

  grepAbsent(
    "no public surface renders a household coordinate",
    /participant\.(latitude|longitude)|coordinates\s*:/,
    ["app/(public)/**/*.tsx", "components/public/**/*.tsx"],
  );

  await a11y("/register");
  await a11y("/register/proj_ekuri");
  await a11y("/verify");
  await a11y("/receipt/rct_ngozi_eyo_2026q4");

  for (const path of ROUTES) {
    await screenshot("F-3", path, path.replace(/\//g, "-").replace(/^-/, "") || "register");
  }
}

async function textOnPage(
  path: string,
  patterns: RegExp[],
  name: string,
): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  await browser.close();
  const missing = patterns.filter((pattern) => !pattern.test(body));
  record(
    name,
    (response?.status() ?? 0) < 400 && missing.length === 0,
    missing.map((pattern) => pattern.source).join(", ") || body.slice(0, 100),
  );
}

/** Coverage is shown as "1,284 of 2,090" with the percentage secondary, never
    the percentage alone. */
async function coverageCarriesItsDenominator(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const offenders: string[] = [];
  for (const path of ["/register", "/register/proj_ekuri", "/developers/dev_ekuri"]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const found = JSON.parse(
      (await page.evaluate(
        `JSON.stringify(Array.from(document.querySelectorAll('[data-coverage]')).map(function (node) { return node.textContent.replace(/\\\\s+/g, " ").trim(); }))`,
      )) as string,
    ) as string[];
    if (found.length === 0) {
      offenders.push(`${path}: no coverage figure found`);
      continue;
    }
    for (const value of found) {
      if (!/\d[\d,]* of \d[\d,]*/.test(value)) {
        offenders.push(`${path}: "${value}"`);
      }
    }
  }
  await browser.close();
  record(
    "coverage is always shown with its denominator",
    offenders.length === 0,
    offenders.slice(0, 4).join(" | "),
  );
}

/** A valid bundle, an invalid proof path and a leaf from another period are
    each handled distinctly. */
async function verifyModes(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const outcomes: Record<string, string> = {};
  for (const [name, code] of [
    ["valid", ""],
    ["invalid proof", "PROOF_INVALID"],
    ["foreign leaf", "LEAF_NOT_IN_ROOT"],
    ["anchor unreachable", "ANCHOR_UNREACHABLE"],
  ] as [string, string][]) {
    await fetch(`${baseUrl}/api/dev/force`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: code || null, pathFragment: "/api/verify" }),
    });
    await page.goto(`${baseUrl}/verify`, { waitUntil: "networkidle" });
    await page.locator("[data-verify-bundle]").fill('{"leaf":"7b41d0c2f6a9e85310bb4c7d2e91f0a6c5d83b42e7f1908a6cd25b3e47f0912a"}');
    await page.locator("[data-verify-submit]").click();
    await page.waitForTimeout(500);
    outcomes[name] = (await page.locator("[data-verify-outcome]").innerText())
      .replace(/\s+/g, " ")
      .trim();
  }
  await fetch(`${baseUrl}/api/dev/force`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: null }),
  });
  await browser.close();

  const distinct = new Set(Object.values(outcomes)).size;
  record(
    "single-transfer verification handles each outcome distinctly",
    distinct === 4,
    Object.entries(outcomes).map(([name, text]) => `${name}: ${text.slice(0, 40)}`).join(" | "),
  );
}

/** The receipt route requests no web font at all. */
async function noWebFonts(path: string): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fonts: string[] = [];
  page.on("response", (response) => {
    if (/\.(woff2?|ttf|otf)(\?|$)/.test(response.url())) {
      fonts.push(response.url());
    }
  });
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  const family = (await page.evaluate(
    "getComputedStyle(document.body).fontFamily",
  )) as string;
  await browser.close();
  record(
    "the receipt requests no web font and uses the system stack",
    fonts.length === 0 && !/Courier Prime|Newsreader|Cabinet/.test(family),
    `${fonts.length} fonts, family ${family.slice(0, 60)}`,
  );
}

/** Neither the rendered page nor the endpoint behind it exposes a household's
    location. The geography endpoint returns coarse buckets, and a bucket
    holding one household would be a coordinate by another name. */
async function noHouseholdCoordinates(): Promise<void> {
  const { baseUrl } = await server();
  const response = await fetch(`${baseUrl}/api/public/projects/proj_ekuri/geography`);
  const payload = (await response.json()) as {
    data?: { buckets?: { households: number }[]; resolution?: number };
  };
  const buckets = payload.data?.buckets ?? [];
  const singles = buckets.filter((bucket) => bucket.households <= 1).length;
  record(
    "the geography endpoint returns coarse buckets, never a household",
    buckets.length > 0 && singles === 0 && (payload.data?.resolution ?? 99) <= 8,
    `${buckets.length} buckets, ${singles} holding one household, resolution ${String(payload.data?.resolution)}`,
  );
}


/** The index stays quick at the size the register will reach: the page states
    the whole count and renders a page of it. */
async function registerAtScale(rows: number): Promise<void> {
  const { baseUrl } = await server();
  await fetch(`${baseUrl}/api/dev/register-size`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows }),
  });

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const started = Date.now();
  await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
  const elapsed = Date.now() - started;
  const reported = Number(
    (await page.locator("[data-row-count]").first().getAttribute("data-row-count")) ?? 0,
  );
  const rendered = await page.locator(".table tbody tr").count();
  await browser.close();

  await fetch(`${baseUrl}/api/dev/register-size`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows: null }),
  });

  record(
    `the register states ${rows} projects and renders a page of them`,
    reported >= rows && rendered > 0 && rendered < rows && elapsed < 4000,
    `reported ${reported}, rendered ${rendered}, ${elapsed}ms`,
  );
}


/** Filing a report reaches its states: it is submitted, or it is refused with
    a reason the reader can act on. */
async function reportStates(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();

  const outcomes: { name: string; ok: boolean; text: string }[] = [];
  for (const [name, code, expect] of [
    ["submitted", "", /what happens now|recorded/i],
    ["RATE_LIMITED", "RATE_LIMITED", /too many reports/i],
    ["NOT_FOUND", "NOT_FOUND", /not on the register|no record/i],
  ] as [string, string, RegExp][]) {
    await forceCode(code || null, "/api/disputes");
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/report`, { waitUntil: "networkidle" });
    await page.locator('input[name="category"]').first().check();
    await page.locator('button[type="submit"]').click();
    /* The action redirects on the client, so the result is the new URL rather
       than the end of the request that produced it. */
    await page.waitForURL(/state=/, { timeout: 15_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle");
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    outcomes.push({ name, ok: expect.test(text), text: text.slice(0, 120) });
    await page.close();
  }
  await forceCode(null);
  await browser.close();

  const broken = outcomes.filter((outcome) => !outcome.ok);
  record(
    "filing a report reaches each of its states",
    broken.length === 0,
    broken.map((outcome) => `${outcome.name}: ${outcome.text}`).join(" | "),
  );
}
