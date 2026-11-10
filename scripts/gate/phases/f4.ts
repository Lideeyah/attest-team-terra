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

/* Written from F-4's exit checklist, before the screens existed. */

const ROUTES = [
  "/get-started",
  "/signup/developer",
  "/signup/institution",
  "/signin",
  "/signin/reset",
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

export async function f4(): Promise<void> {
  typecheck();

  for (const path of ROUTES) {
    await routeRenders(path);
  }

  for (const state of STATES) {
    await stateRenders(state.path, state.code, state.expect);
  }

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
  await wizardResumes();

  /* A correction is submitted with its reason and the original stays
     readable. */
  await correctionKeepsTheOriginal();

  /* Step five is the project's real public page, not a picture of one. */
  await stepFiveIsTheRealRoute();

  await a11y("/get-started");
  await a11y("/signup/developer");
  await a11y("/onboarding/developer/commitment");

  for (const path of ROUTES) {
    await screenshot("F-4", path, path.replace(/\//g, "-").replace(/^-/, ""));
  }
}

async function rolesOffered(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/get-started`, { waitUntil: "networkidle" });
  const paths = JSON.parse(
    (await page.evaluate(
      `JSON.stringify(Array.from(document.querySelectorAll("[data-role]")).map(function (node) { return node.getAttribute("data-role"); }))`,
    )) as string,
  ) as string[];
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  await browser.close();
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
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/onboarding/developer/project`, { waitUntil: "networkidle" });
  await page.locator("[data-registry-id]").fill("GS-10342");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/verify/, { timeout: 15_000 }).catch(() => undefined);
  await page.goBack();
  await page.waitForLoadState("networkidle");
  const kept = await page.locator("[data-registry-id]").inputValue();
  await browser.close();
  record(
    "going back keeps what was entered",
    kept === "GS-10342",
    `field reads "${kept}"`,
  );
}

async function wizardResumes(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/onboarding/developer/project`, { waitUntil: "networkidle" });
  await page.locator("[data-registry-id]").fill("GS-10342");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/verify/, { timeout: 15_000 }).catch(() => undefined);

  /* A new page in the same session, days later as far as the wizard knows. */
  const resumed = await context.newPage();
  await resumed.goto(`${baseUrl}/onboarding/developer`, { waitUntil: "networkidle" });
  const url = resumed.url();
  const body = (await resumed.locator("body").innerText()).replace(/\s+/g, " ");
  await browser.close();
  record(
    "the wizard resumes where it was left",
    /verify/.test(url) || /resume|where you left/i.test(body),
    `${url} ${body.slice(0, 80)}`,
  );
}

async function correctionKeepsTheOriginal(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/onboarding/developer/commitment`, { waitUntil: "networkidle" });

  await page.locator("[data-commitment-percentage]").fill("55");
  await page.locator("[data-correction-reason]").fill(
    "Page 44 states sixty percent of net revenue; the extraction read the forty-year average.",
  );
  await page.locator("[data-correction-submit]").click();
  await page.waitForTimeout(1200);
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  await browser.close();
  record(
    "a correction is logged with its reason and the original stays readable",
    /originally read|original/i.test(body) && /sixty percent|60/i.test(body),
    body.slice(0, 160),
  );
}

async function stepFiveIsTheRealRoute(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/onboarding/developer/live`, { waitUntil: "networkidle" });
  const framed = (await page.evaluate(
    `(function () {
      var frame = document.querySelector("[data-public-page] iframe");
      return frame ? frame.getAttribute("src") : "";
    })()`,
  )) as string;
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  await browser.close();
  record(
    "step five shows the project's real public page at zero",
    /\/register\//.test(framed) && /0 of 0|0 households/i.test(body),
    `${framed} ${body.slice(0, 120)}`,
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
      fill: [["#registration", "RC 1043882"]],
      expect: /does not have access/i,
    },
  ];

  const broken: string[] = [];
  for (const probe of cases) {
    await forceCode(probe.code, probe.fragment);
    const page = await browser.newPage();
    await page.goto(`${baseUrl}${probe.path}`, { waitUntil: "networkidle" });
    for (const [selector, value] of probe.fill) {
      await page.locator(selector).fill(value);
    }
    await page.locator('button[type="submit"]').first().click();
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
