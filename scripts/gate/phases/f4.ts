import {
  a11y,
  elementAbsent,
  forceCode,
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
import { ERROR_CODES } from "../../../lib/api/contract";
import { CODE_HEADING } from "../../../lib/copy/codes";

/* Written from F-4's exit checklist, before the screens existed, and extended
   after the phase's independent verification found fourteen things the gate
   had not been asked to look at. */

const ROOT = process.cwd();

const ROUTES = [
  "/get-started",
  "/signup/developer",
  "/signup/institution",
  "/signin",
  "/signin/reset",
  "/verify-email",
  "/invite/inv_7KQ2M4",
  "/onboarding/developer/project",
  "/onboarding/developer/verify",
  "/onboarding/developer/commitment",
  "/onboarding/developer/account",
  "/onboarding/developer/live",
  "/onboarding/institution/organisation",
  "/onboarding/institution/watchlist",
];

/* Every rejection and expiry path the prompt lists. */
const STATES: { path: string; code: string; expect: RegExp }[] = [
  { path: "/signup/developer", code: "DUPLICATE_REQUEST", expect: /already/i },
  { path: "/invite/inv_7KQ2M4", code: "TOKEN_EXPIRED", expect: /expired/i },
  { path: "/invite/inv_7KQ2M4", code: "FORBIDDEN", expect: /revoked|does not have access/i },
  { path: "/invite/inv_7KQ2M4", code: "BVN_MISMATCH", expect: /does not match the identity/i },
  { path: "/invite/inv_7KQ2M4", code: "DEVICE_UNBOUND", expect: /device/i },
  { path: "/onboarding/developer/commitment", code: "PDD_UNREADABLE", expect: /could not be read/i },
  { path: "/onboarding/developer/commitment", code: "PDD_NO_COMMITMENT", expect: /no benefit-sharing commitment/i },
  { path: "/onboarding/developer/commitment", code: "EXTRACTION_LOW_CONFIDENCE", expect: /below the confidence threshold/i },
  { path: "/onboarding/developer/commitment", code: "MODEL_UNAVAILABLE", expect: /did not answer|queued/i },
];

/* The states that are reached by opening a URL the product itself offers,
   each of which the state panel also lists. */
const REACHED: { label: string; href: string; expect: RegExp }[] = [
  { label: "invitation expired", href: "/invite/inv_expired_4M2K", expect: /has expired/i },
  { label: "invitation already redeemed", href: "/invite/inv_redeemed_8QT1", expect: /already redeemed/i },
  { label: "invitation revoked", href: "/invite/inv_revoked_3PX9", expect: /was revoked/i },
  {
    label: "identity verification pending",
    href: "/invite/inv_7KQ2M4?state=identity-pending",
    expect: /checking who you are|not used up/i,
  },
  {
    label: "identity mismatch, under the prompt's own name",
    href: "/invite/inv_7KQ2M4?state=error&code=IDENTITY_MISMATCH",
    expect: /does not match the identity/i,
  },
  { label: "device bound", href: "/invite/inv_7KQ2M4?state=bound", expect: /bound to you/i },
  { label: "verification complete", href: "/verify-email?token=vrf_live_0041", expect: /is verified/i },
  { label: "verification link expired", href: "/verify-email?token=vrf_expired_0041", expect: /has expired/i },
  {
    label: "a new verification link sent",
    href: "/verify-email?state=sent&email=a%40b.ng",
    expect: /on its way/i,
  },
  {
    label: "unverified email with a resend",
    href: "/signin?state=unverified&email=a%40b.ng",
    expect: /has not been verified/i,
  },
  {
    label: "session expired returning the reader to where they were",
    href: "/signin?state=expired&next=%2Fapp%2Froster",
    expect: /session ended while you were working/i,
  },
  {
    label: "KYB rejected with the reason and the path forward",
    href: "/onboarding/developer/account?state=rejected",
    expect: /refused the verification/i,
  },
  {
    label: "the registry unreachable, with manual entry",
    href: "/onboarding/developer/project?state=error&code=REGISTRY_UNREACHABLE",
    expect: /by hand/i,
  },
];

export async function f4(): Promise<void> {
  typecheck();

  for (const path of ROUTES) {
    await routeRenders(path);
  }

  for (const state of STATES) {
    await stateRenders(state.path, state.code, state.expect);
  }

  await reachedStates();

  /* The wizard's rejections are reached by submitting, because that is when a
     step talks to the API at all. */
  await wizardRejections();

  /* Role selection offers three paths and no way into bank operations or
     platform admin, which are provisioned rather than self-served. */
  await rolesOffered();
  await textAbsent(
    "/get-started",
    /\b(bank operations|platform admin|administrator console)\b/i,
    "role selection offers no path to bank operations or platform admin",
  );
  await elementAbsent(
    "/get-started",
    'a[href*="/ops"], a[href*="/admin"]',
    "role selection links to neither operations nor admin",
  );

  /* The wizard keeps what was entered when the reader goes back, and resumes
     where it was left. */
  await backKeepsWhatWasEntered();
  await accountStepKeepsItsFields();
  await wizardResumes();
  await goingBackDoesNotRewind();

  /* A correction is submitted with its reason, the original stays readable,
     and it is still there after a reload. */
  await correctionKeepsTheOriginal();
  await correctionSurvivesAReload();

  /* The commitment step has the document the extraction reads, and every
     field it produced is correctable. */
  await pddUploadExists();
  await everyExtractedFieldIsCorrectable();

  /* Step five is the project's real public page, and the project is the one
     the wizard created. */
  await stepFiveIsTheRealRoute();

  /* The session ending mid-task is issued by the product, not only typed. */
  await sessionExpiryIsIssued();

  /* Register, sign in and get started are each one tap from the first screen
     at phone width: one link cannot go to two places. */
  await mastheadAtPhoneWidth();

  /* Wizard progress carries the route transition. */
  routeTransitionInAuth();

  /* Every contract code has words for a reader, and no screen shows a code
     where a heading goes. */
  everyCodeHasAHeading();
  await noCodeIsShownToAReader([
    "/invite/inv_7KQ2M4?state=error&code=NAME_MISMATCH",
    "/onboarding/developer/verify?state=error&code=FORBIDDEN",
    "/onboarding/developer/account?state=error&code=FORBIDDEN",
    "/onboarding/developer/commitment?state=error&code=PDD_UNREADABLE",
    "/signup/developer?state=error&code=DUPLICATE_REQUEST",
    "/verify-email?token=vrf_expired_0041",
  ]);

  /* The brand is appended once, by the root template. */
  titlesDoNotDoubleTheBrand();

  /* One footer per page. */
  for (const path of ["/attestation/att_ekuri_2026q3", "/developers/dev_ekuri", "/register"]) {
    await oneFooter(path);
  }

  /* The state panel indexes F-4's states, so they are reachable by clicking
     rather than by typing a URL. */
  statePanelIndexesF4();

  await a11y("/get-started");
  await a11y("/signup/developer");
  await a11y("/onboarding/developer/commitment");
  await a11y("/verify-email");

  for (const path of ROUTES) {
    await screenshot("F-4", path, path.replace(/\//g, "-").replace(/^-/, ""));
  }
  for (const state of REACHED) {
    await screenshot("F-4", state.href, `state-${state.label.replace(/[^a-z0-9]+/gi, "-")}`);
  }
}

/* The shared-axis transition keeps the outgoing screen mounted while the new
   one arrives, so for a moment both carry the same fields. Waiting for one is
   what a reader does too. */
async function settled(
  page: import("@playwright/test").Page,
  selector: string,
): Promise<import("@playwright/test").Locator> {
  await page
    .waitForFunction(
      (query) => document.querySelectorAll(query).length === 1,
      selector,
      { timeout: 15_000 },
    )
    .catch(() => undefined);
  return page.locator(selector).last();
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

async function reachedStates(): Promise<void> {
  const broken: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const state of REACHED) {
      await page.goto(`${baseUrl}${state.href}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      if (!state.expect.test(body)) {
        broken.push(`${state.label}: ${body.slice(0, 80)}`);
      }
    }
  });
  record(
    "every state F-4 lists is reachable and says what it is",
    broken.length === 0,
    broken.join(" | "),
  );
}

async function rolesOffered(): Promise<void> {
  const { paths, body } = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/get-started`, { waitUntil: "networkidle" });
    const found = JSON.parse(
      (await page.evaluate(
        `JSON.stringify(Array.from(document.querySelectorAll("[data-role]")).map(function (node) { return node.getAttribute("data-role"); }))`,
      )) as string,
    ) as string[];
    return {
      paths: found,
      body: (await page.locator("body").innerText()).replace(/\s+/g, " "),
    };
  });
  record(
    "role selection presents three paths and says households do not sign up",
    paths.length === 3 &&
      paths.includes("developer") &&
      paths.includes("institution") &&
      paths.includes("agent") &&
      /household/i.test(body),
    paths.join(", "),
  );
}

async function backKeepsWhatWasEntered(): Promise<void> {
  const kept = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/onboarding/developer/project`, { waitUntil: "networkidle" });
    await (await settled(page, "[data-registry-id]")).fill("GS-10342");
    await page.locator('button[type="submit"]:visible').first().click();
    await page.waitForURL(/verify/, { timeout: 15_000 }).catch(() => undefined);
    await page.goBack();
    await page.waitForLoadState("networkidle");
    return (await settled(page, "[data-registry-id]")).inputValue();
  });
  record("going back keeps what was entered", kept === "GS-10342", `field reads "${kept}"`);
}

/** The account step bounced on its own validation and came back empty. */
async function accountStepKeepsItsFields(): Promise<void> {
  const fields = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/onboarding/developer/account`, { waitUntil: "networkidle" });
    await (await settled(page, "[data-registration]")).fill("RC 1");
    await (await settled(page, "[data-account-name]")).fill("EKURI INITIATIVE LIMITED DISBURSEMENT");
    await page.locator('button[type="submit"]:visible').first().click();
    await page.waitForURL(/state=invalid/, { timeout: 15_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle");
    return {
      registration: await (await settled(page, "[data-registration]")).inputValue(),
      accountName: await (await settled(page, "[data-account-name]")).inputValue(),
    };
  });
  record(
    "a refusal on the account step keeps both fields",
    fields.registration === "RC 1" &&
      fields.accountName === "EKURI INITIATIVE LIMITED DISBURSEMENT",
    JSON.stringify(fields),
  );
}

async function wizardResumes(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/onboarding/developer/project`, { waitUntil: "networkidle" });
  await (await settled(page, "[data-registry-id]")).fill("GS-10342");
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForURL(/verify/, { timeout: 15_000 }).catch(() => undefined);

  /* A new page in the same session, days later as far as the wizard knows. */
  const resumed = await context.newPage();
  await resumed.goto(`${baseUrl}/onboarding/developer`, { waitUntil: "networkidle" });
  const url = resumed.url();
  const body = (await resumed.locator("body").innerText()).replace(/\s+/g, " ");
  await browser.close();
  record(
    "the wizard resumes where it was left, and says that is what it is doing",
    /verify/.test(url) && /picking up where you left off/i.test(body),
    `${url} ${body.slice(0, 80)}`,
  );
}

/** Looking back at step one must not discard the steps after it. */
async function goingBackDoesNotRewind(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  /* Walk to the account step. */
  await page.goto(`${baseUrl}/onboarding/developer/project`, { waitUntil: "networkidle" });
  await (await settled(page, "[data-registry-id]")).fill("GS-10342");
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForURL(/verify/, { timeout: 15_000 }).catch(() => undefined);
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForURL(/commitment/, { timeout: 15_000 }).catch(() => undefined);
  await page.locator('button[type="submit"]:visible').last().click();
  await page.waitForURL(/account/, { timeout: 15_000 }).catch(() => undefined);

  /* Go back to step one and submit it again. */
  await page.goto(`${baseUrl}/onboarding/developer/project`, { waitUntil: "networkidle" });
  const states = JSON.parse(
    (await page.evaluate(
      `JSON.stringify(Array.from(document.querySelectorAll(".step")).map(function (node) { return node.getAttribute("data-state"); }))`,
    )) as string,
  ) as string[];
  await (await settled(page, "[data-registry-id]")).fill("GS-10342");
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForURL(/verify/, { timeout: 15_000 }).catch(() => undefined);

  const resumed = await context.newPage();
  await resumed.goto(`${baseUrl}/onboarding/developer`, { waitUntil: "networkidle" });
  const url = resumed.url();
  await browser.close();

  record(
    "a step already reached stays open from an earlier step",
    states.filter((state) => state === "open").length >= 2,
    states.join(", "),
  );
  record(
    "looking back at step one does not rewind the saved position",
    /account|commitment|live/.test(url),
    url,
  );
}

async function correctionKeepsTheOriginal(): Promise<void> {
  const body = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/onboarding/developer/commitment`, { waitUntil: "networkidle" });
    await (await settled(page, "[data-commitment-percentage]")).fill("55");
    await (await settled(page, "[data-correction-reason]")).fill(
      "Page 44 states sixty percent of net revenue; the extraction read the forty-year average.",
    );
    await (await settled(page, "[data-correction-submit]")).click();
    await page.waitForTimeout(1500);
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  record(
    "a correction is logged with its reason and the original stays readable",
    /originally read/i.test(body) && /60/.test(body) && /forty-year average/i.test(body),
    body.slice(0, 160),
  );
}

/** The correction lived in a query parameter, so a reload lost it. */
async function correctionSurvivesAReload(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/onboarding/developer/commitment`, { waitUntil: "networkidle" });
  await (await settled(page, "[data-commitment-percentage]")).fill("45");
  await (await settled(page, "[data-correction-reason]")).fill(
    "Page 44 states forty-five percent of net revenue after the 2026 amendment.",
  );
  await (await settled(page, "[data-correction-submit]")).click();
  await page.waitForTimeout(1500);

  /* The plain URL, as a reader returning to the step would open it. */
  await page.goto(`${baseUrl}/onboarding/developer/commitment`, { waitUntil: "networkidle" });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const corrections = await page.locator("[data-corrections]").count();
  await browser.close();

  record(
    "the correction and its original are still there after a reload",
    corrections > 0 && /originally read/i.test(body) && /2026 amendment/i.test(body),
    body.slice(0, 200),
  );
}

async function pddUploadExists(): Promise<void> {
  const count = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/onboarding/developer/commitment`, { waitUntil: "networkidle" });
    return page.locator('[data-pdd-input][type="file"]').count();
  });
  record(
    "the commitment step takes the document the extraction reads",
    count === 1,
    `${count} file inputs`,
  );
}

async function everyExtractedFieldIsCorrectable(): Promise<void> {
  const options = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/onboarding/developer/commitment`, { waitUntil: "networkidle" });
    return JSON.parse(
      (await page.evaluate(
        `JSON.stringify(Array.from(document.querySelectorAll("[data-correction-field] option")).map(function (node) { return node.value; }))`,
      )) as string,
    ) as string[];
  });
  record(
    "every field the extraction produced is correctable",
    ["percentage", "basis", "cadence", "beneficiary"].every((field) =>
      options.includes(field),
    ),
    options.join(", "),
  );
}

async function stepFiveIsTheRealRoute(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  /* Walk the wizard so the project it framed is the one it created. */
  await page.goto(`${baseUrl}/onboarding/developer/project`, { waitUntil: "networkidle" });
  await (await settled(page, "[data-registry-id]")).fill("GS-10342");
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForURL(/verify/, { timeout: 15_000 }).catch(() => undefined);
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForURL(/commitment/, { timeout: 15_000 }).catch(() => undefined);

  await page.goto(`${baseUrl}/onboarding/developer/live`, { waitUntil: "networkidle" });
  const framed = (await page.evaluate(
    `(function () {
      var frame = document.querySelector("[data-public-page] iframe");
      return frame ? frame.getAttribute("src") : "";
    })()`,
  )) as string;
  const named = (await page.locator("[data-project]").first().getAttribute("data-project")) ?? "";
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  await browser.close();

  record(
    "step five shows the project's real public page at zero",
    /\/register\//.test(framed) && /0 of 0|0 households/i.test(body),
    `${framed} ${body.slice(0, 120)}`,
  );
  record(
    "step five frames the project the wizard created, not a fallback",
    framed.includes(named) && named === "proj_ekuri",
    `framed ${framed}, wizard ${named}`,
  );
}

/** Nothing issued the expired session, so the state existed only if typed. */
async function sessionExpiryIsIssued(): Promise<void> {
  await forceCode("FORBIDDEN", "/api/auth/session");
  const url = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    return page.url();
  });
  await forceCode(null);
  record(
    "a session that has ended sends the reader to sign in with where they were",
    /\/signin\?/.test(url) && /state=expired/.test(url) && /next=/.test(url),
    url,
  );
}

async function mastheadAtPhoneWidth(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const targets = JSON.parse(
    (await page.evaluate(
      `JSON.stringify(Array.from(document.querySelectorAll("[data-shell='public-masthead'] a")).filter(function (node) {
        var box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }).map(function (node) { return node.getAttribute("href"); }))`,
    )) as string,
  ) as string[];
  await browser.close();
  record(
    "register, sign in and get started are each reachable at 390px",
    ["/register", "/signin", "/get-started"].every((href) => targets.includes(href)),
    targets.join(", "),
  );
}

function routeTransitionInAuth(): void {
  const layout = readFileSync(join(ROOT, "app/(auth)/layout.tsx"), "utf8");
  record(
    "wizard progress carries the route transition",
    /RouteTransition/.test(layout),
    "",
  );
}

/* The code itself means nothing to a reader. An eyebrow in capitals is not a
   code, so the test is the contract's own list rather than a shape. */
async function noCodeIsShownToAReader(paths: string[]): Promise<void> {
  const shown: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of paths) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      for (const code of ERROR_CODES) {
        if (body.includes(code)) {
          shown.push(`${path.split("?")[0]}: ${code}`);
        }
      }
    }
  });
  record(
    "no contract code is shown to a reader on any F-4 surface",
    shown.length === 0,
    shown.join(" | "),
  );
}

function everyCodeHasAHeading(): void {
  const missing = ERROR_CODES.filter((code) => !CODE_HEADING[code]);
  record(
    `every one of the ${ERROR_CODES.length} contract codes has words for a reader`,
    missing.length === 0,
    missing.join(", "),
  );
}

function titlesDoNotDoubleTheBrand(): void {
  let hits: string[] = [];
  try {
    hits = execFileSync(
      "git",
      ["grep", "-n", "title: \"[^\"]*Attest\"", "--", "app", "dev-tools"],
      { cwd: ROOT, stdio: "pipe" },
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean)
      /* The root layout owns the brand and the template that appends it, and
         the installed field app is named rather than titled: "Attest" under
         an icon on a home screen is the app's name, not a page's. */
      .filter(
        (line) =>
          !line.startsWith("app/layout.tsx:") && !line.includes("appleWebApp"),
      );
  } catch {
    hits = [];
  }
  record(
    "no page appends the brand the root template already appends",
    hits.length === 0,
    hits.join(" | "),
  );
}

async function oneFooter(path: string): Promise<void> {
  const count = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    return page.locator(".public-footer").count();
  });
  record(`one footer on ${path}`, count === 1, `${count} footers`);
}

function statePanelIndexesF4(): void {
  const index = readFileSync(join(ROOT, "dev-tools/dev/states/stateIndex.ts"), "utf8");
  const needed = [
    "/onboarding/developer",
    "/invite/[code]",
    "/get-started",
    "/verify-email",
    "KYB rejected",
    "Identity verification pending",
    "Session expired",
  ];
  const missing = needed.filter((item) => !index.includes(item));
  record(
    "the state panel indexes F-4's states",
    missing.length === 0,
    missing.join(", "),
  );
}

/** A step's rejection paths, reached by filling it in and submitting. */
async function wizardRejections(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();

  const cases: {
    name: string;
    path: string;
    code: string;
    fragment: string;
    fill: [string, string][];
    expect: RegExp;
  }[] = [
    {
      name: "REGISTRY_NOT_FOUND",
      path: "/onboarding/developer/project",
      code: "REGISTRY_NOT_FOUND",
      fragment: "/api/projects/lookup",
      fill: [["[data-registry-id]", "GS-00000"]],
      expect: /no project with that identifier/i,
    },
    {
      name: "REGISTRY_UNREACHABLE",
      path: "/onboarding/developer/project",
      code: "REGISTRY_UNREACHABLE",
      fragment: "/api/projects/lookup",
      fill: [["[data-registry-id]", "GS-10342"]],
      expect: /did not answer|by hand|manual/i,
    },
    {
      name: "FORBIDDEN",
      path: "/onboarding/developer/account",
      code: "FORBIDDEN",
      fragment: "/api/projects/",
      fill: [
        ["[data-registration]", "RC 1043882"],
        ["[data-account-name]", "EKURI INITIATIVE LIMITED"],
      ],
      expect: /does not have access/i,
    },
  ];

  const broken: string[] = [];
  for (const probe of cases) {
    await forceCode(probe.code, probe.fragment);
    const page = await browser.newPage();
    await page.goto(`${baseUrl}${probe.path}`, { waitUntil: "networkidle" });
    for (const [selector, value] of probe.fill) {
      await (await settled(page, selector)).fill(value);
    }
    await page.locator('button[type="submit"]:visible').first().click();
    await page.waitForURL(/code=/, { timeout: 15_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle");
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    if (!probe.expect.test(body)) {
      broken.push(`${probe.name}: ${body.slice(0, 90)}`);
    }
    await page.close();
  }
  await forceCode(null);
  await browser.close();

  record(
    "each step states its own rejection rather than a generic failure",
    broken.length === 0,
    broken.join(" | "),
  );
}
