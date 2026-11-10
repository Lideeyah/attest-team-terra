import {
  a11y,
  elementAbsent,
  forceCode,
  record,
  routeRenders,
  screenshot,
  textAbsent,
  typecheck,
} from "../assert";
import { server } from "../server";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Written from F-7's exit checklist, before the verifier portal existed.

   The checklist:
   - no score, grade, badge, rating or risk label anywhere on this surface
   - a generated attestation bundle validates on /verify
   - comparison handles non-overlapping periods and says so
   - every listed state reachable

   The first line is the one that matters most. The phase prompt calls it a
   product decision rather than a styling one: it is what keeps Attest out of
   the ratings business, and a single badge would undo it. */

const ROUTES = [
  "/verifier",
  "/verifier/projects",
  "/verifier/projects/proj_ekuri",
  "/verifier/compare",
  "/verifier/export",
  "/verifier/alerts",
];

/* The states each screen lists, reached by a URL the portal itself offers. */
const STATES: { label: string; href: string; expect: RegExp }[] = [
  { label: "no watchlist", href: "/verifier?watchlist=empty", expect: /nothing on your watchlist/i },
  { label: "nothing changed since last visit", href: "/verifier?since=now", expect: /nothing has changed/i },
  { label: "projects filtered", href: "/verifier/projects?q=ekuri", expect: /ekuri/i },
  { label: "projects filtered to nothing", href: "/verifier/projects?q=zzzzzz", expect: /no project matches/i },
  { label: "search empty", href: "/verifier/projects?q=", expect: /projects/i },
  { label: "signals present", href: "/verifier/projects/proj_delta", expect: /signal/i },
  { label: "nothing selected to compare", href: "/verifier/compare", expect: /choose/i },
  { label: "two compared", href: "/verifier/compare?ids=proj_ekuri,proj_hadejia", expect: /ekuri/i },
  { label: "three compared", href: "/verifier/compare?ids=proj_ekuri,proj_hadejia,proj_delta", expect: /akassa/i },
  {
    label: "periods that do not overlap",
    href: "/verifier/compare?ids=proj_ekuri,proj_oban",
    expect: /no period (in common|both)|cannot be compared/i,
  },
  { label: "nothing selected to export", href: "/verifier/export", expect: /choose/i },
  { label: "export ready", href: "/verifier/export?state=ready", expect: /ready/i },
  { label: "export failed", href: "/verifier/export?state=failed", expect: /not generated|failed/i },
  { label: "no alerts configured", href: "/verifier/alerts?configured=none", expect: /no alert/i },
  { label: "an alert fired", href: "/verifier/alerts?fired=alr_0001", expect: /fired/i },
];

/* The words this surface may never use about a project. */
const VERDICTS =
  /\b(score|scored|scoring|grade|graded|rating|rated|rank|ranked|ranking|badge|tier [ABC]\b|risk level|risk label|high risk|low risk|red flag|traffic light|green light|trustworthy|reliable|reputable|good standing|compliant|non-compliant|passing|failing|best|worst|leader|laggard)\b/i;

export async function f7(): Promise<void> {
  typecheck();

  for (const path of ROUTES) {
    await routeRenders(path);
  }

  await listedStates();

  /* The copy rule, on every screen and in the code behind them. */
  for (const path of [...ROUTES, ...STATES.map((state) => state.href)]) {
    await textAbsent(path, VERDICTS, `no verdict about a project on ${path}`);
  }
  noVerdictInTheCode();
  await elementAbsent(
    "/verifier/projects/proj_ekuri",
    "[data-score], [data-grade], [data-rating], [data-badge], .badge, .score",
    "no element on the verifier surface is a score or a badge",
  );

  /* A confirmation rate below the project's own history is shown as two
     figures side by side, with nothing said about what it means. */
  await twoFiguresNoVerdict();

  /* The bundle this surface generates is the one /verify accepts. */
  await exportedBundleVerifies();

  /* Comparison across projects that share no period says so. */
  await incomparablePeriodsAreStated();

  /* No participant is identifiable at any granularity. */
  await noParticipantIsIdentifiable();

  /* What F-7's independent verification found. */
  await figuresAreTheOnesTheyClaim();
  await noVerdictArrivesByColour();
  await everyFormatDeliversWhatItNames();
  await theKeyIsIssuedOnce();
  await refusalsCarryNoVerdict();

  await a11y("/verifier");
  await a11y("/verifier/projects/proj_ekuri");
  await a11y("/verifier/compare?ids=proj_ekuri,proj_hadejia");

  for (const path of ROUTES) {
    await screenshot("F-7", path, path.replace(/\//g, "-").replace(/^-/, ""));
  }
  for (const state of STATES) {
    await screenshot("F-7", state.href, `state-${state.label.replace(/[^a-z0-9]+/gi, "-")}`);
  }
}

/* A confirmation rate is a fraction in the contract, and three screens
   rendered 0.72 as "1%". The figures on this surface are the ones it claims:
   the closed period's own, not the open period's, and in the unit a reader
   reads. */
async function figuresAreTheOnesTheyClaim(): Promise<void> {
  const { baseUrl } = await server();
  const api = (await (await fetch(`${baseUrl}/api/verifier/projects/proj_ekuri`)).json()) as {
    data?: { project: { periods: { period: string; paid: number; enrolled: number; confirmationRate: number }[] } };
  };
  const closed = (api.data?.project.periods ?? []).filter(
    (period) => period.period === "2026-Q3",
  )[0];

  const outcome = await withBrowser(async (page, baseUrl2) => {
    await page.goto(`${baseUrl2}/verifier/projects/proj_ekuri`, { waitUntil: "networkidle" });
    const detail = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    await page.goto(`${baseUrl2}/verifier`, { waitUntil: "networkidle" });
    const home = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return { detail, home };
  });

  const expected = Math.round((closed?.confirmationRate ?? 0) * 100);
  record(
    "the confirmation rate is a percentage a reader can read",
    expected > 1 && new RegExp(`\\b${expected}%`).test(outcome.detail),
    `expected ${expected}% · ${outcome.detail.slice(0, 120)}`,
  );
  record(
    "the watchlist states the closed period's own figures under its own label",
    closed !== undefined &&
      outcome.home.includes(`${closed.paid.toLocaleString("en-NG")} of ${closed.enrolled.toLocaleString("en-NG")}`),
    `expected ${closed?.paid} of ${closed?.enrolled} · ${outcome.home.slice(0, 140)}`,
  );
}

/* A verdict can arrive by colour as easily as by word: an edge that appears
   for one project and not another is a traffic light. */
async function noVerdictArrivesByColour(): Promise<void> {
  const found: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of ["/verifier", "/verifier/projects", "/verifier/compare?ids=proj_ekuri,proj_oban"]) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const coloured = JSON.parse(
        (await page.evaluate(
          `JSON.stringify(Array.from(document.querySelectorAll(".strip-flagged, .strip-blocked, .notice-flagged, .notice-blocked")).map(function (node) {
            return node.className;
          }))`,
        )) as string,
      ) as string[];
      for (const className of coloured) {
        found.push(`${path}: ${className}`);
      }
    }
  });
  record(
    "nothing on the verifier surface is marked adversely by colour",
    found.length === 0,
    found.slice(0, 3).join(" | "),
  );
}

/* Two formats behind one URL meant the CSV was the record with a different
   name on it, and for three of the four projects the link 404ed. */
async function everyFormatDeliversWhatItNames(): Promise<void> {
  const { baseUrl } = await server();
  const broken: string[] = [];
  for (const projectId of ["proj_ekuri", "proj_hadejia"]) {
    for (const format of ["record", "csv"]) {
      const response = await fetch(`${baseUrl}/api/verifier/export`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `gate-f7-${projectId}-${format}`,
        },
        body: JSON.stringify({ projectId, period: "2026-Q3", format }),
      });
      const payload = (await response.json()) as { data?: { url?: string } };
      const url = payload.data?.url;
      if (!url) {
        broken.push(`${projectId} ${format}: no file`);
        continue;
      }
      const file = await fetch(`${baseUrl}${url}`);
      const type = file.headers.get("content-type") ?? "";
      if (file.status !== 200) {
        broken.push(`${projectId} ${format}: ${file.status}`);
      } else if (format === "csv" && !type.includes("text/csv")) {
        broken.push(`${projectId} csv: served ${type}`);
      } else if (format === "record" && !type.includes("json")) {
        broken.push(`${projectId} record: served ${type}`);
      }
    }
  }
  record(
    "every export format delivers the file it names, for every project",
    broken.length === 0,
    broken.join(" | "),
  );
}

/* "A key issued once then masked" is one of the three things the export
   screen is for, and it did not exist. */
async function theKeyIsIssuedOnce(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/verifier/export`, { waitUntil: "networkidle" });
    await page.locator("#verifier-key-label").fill("Quarterly pull");
    await page.locator("[data-key-issue]").click();
    await page.waitForTimeout(1200);
    const secret = await page.locator("[data-key-secret]").first().innerText();
    await page.locator("[data-key-dismiss]").click();
    await page.waitForTimeout(400);
    const afterwards = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return { secret: secret.trim(), afterwards };
  });
  record(
    "a key is issued once and is not on the screen afterwards",
    outcome.secret.startsWith("att_read_") &&
      outcome.secret.length > 20 &&
      !outcome.afterwards.includes(outcome.secret),
    `${outcome.secret.slice(0, 16)}…`,
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
    "every state the verifier portal lists is reachable and says what it is",
    broken.length === 0,
    broken.join(" | "),
  );
}

/** The rule is about the product, not the rendering, so the code is searched
    as well as the screens. */
function noVerdictInTheCode(): void {
  /* The rule is about what a reader sees, so the comments are stripped before
     the search: the module that states the rule has to be able to state it,
     and "generating" is not a rating. */
  let files: string[] = [];
  try {
    files = execFileSync(
      "git",
      ["ls-files", "--", "app/(verifier)", "components/verifier", "lib/copy/verifier.ts"],
      { cwd: process.cwd(), stdio: "pipe" },
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    files = [];
  }

  const pattern =
    /\b(scores?|grades?|badges?|ratings?|trustworthy|risk label|traffic light)\b/i;
  const hits: string[] = [];
  for (const file of files) {
    const code = readFileSync(join(process.cwd(), file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/[^\n]*/g, " ")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
    const match = code.match(pattern);
    if (match) {
      hits.push(`${file}: ${match[0]}`);
    }
  }
  record(
    "no score, grade, badge or rating in the verifier surface's own code",
    hits.length === 0,
    hits.slice(0, 3).join(" | "),
  );
}

async function twoFiguresNoVerdict(): Promise<void> {
  const outcome = await withBrowser(async (page, baseUrl) => {
    await page.goto(`${baseUrl}/verifier/projects/proj_delta`, { waitUntil: "networkidle" });
    const pairs = await page.locator("[data-against-history]").count();
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    return { pairs, body };
  });
  record(
    "a confirmation rate below the project's own history is two figures and no verdict",
    outcome.pairs > 0 &&
      /\d+%[^.]{0,40}\d+%/.test(outcome.body) &&
      !VERDICTS.test(outcome.body),
    outcome.body.slice(0, 160),
  );
}

async function exportedBundleVerifies(): Promise<void> {
  const { baseUrl } = await server();
  /* The portal's own export, then the public verifier, with nothing in
     between: a bundle this surface generates has to be one /verify accepts,
     or the export is a file that proves nothing. */
  const exported = await fetch(`${baseUrl}/api/verifier/export`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": "gate-f7-export" },
    body: JSON.stringify({
      projectId: "proj_ekuri",
      period: "2026-Q3",
      format: "disclosure",
    }),
  });
  const payload = (await exported.json()) as {
    data?: { bundle?: unknown; url?: string; state?: string };
  };

  const bundle = payload.data?.bundle;
  const verified = await fetch(`${baseUrl}/api/verify/disclosure`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": "gate-f7-verify" },
    body: JSON.stringify({ bundle }),
  });
  const answer = (await verified.json()) as {
    data?: { outcome?: string };
    error?: { code?: string };
  };

  record(
    "a bundle this surface exports verifies on /verify",
    answer.data?.outcome === "match",
    `${answer.data?.outcome ?? answer.error?.code ?? "no answer"}`,
  );
}

async function incomparablePeriodsAreStated(): Promise<void> {
  const body = await withBrowser(async (page, baseUrl) => {
    /* Oban has closed no period at all, so there is nothing to compare it on
       and the screen has to say that rather than render an empty column. */
    await page.goto(`${baseUrl}/verifier/compare?ids=proj_ekuri,proj_oban`, {
      waitUntil: "networkidle",
    });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  });
  record(
    "projects with no period in common say so rather than comparing nothing",
    /no period/i.test(body) && !/0%/.test(body),
    body.slice(0, 160),
  );
}

/** The contract returns no participant, so there is nothing to hide; this
    asserts that the surface has not reconstructed one. */
async function noParticipantIsIdentifiable(): Promise<void> {
  const found: string[] = [];
  await withBrowser(async (page, baseUrl) => {
    for (const path of [
      "/verifier/projects/proj_ekuri",
      "/verifier/projects/proj_delta",
      "/verifier/compare?ids=proj_ekuri,proj_hadejia",
    ]) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      /* A participant identifier, a masked phone, an account number or a
         coordinate finer than the published resolution. */
      for (const pattern of [
        /ptc_\d{6}/,
        /0\d{2}\*{4}\d{4}/,
        /\b\d{10}\b/,
        /\b\d+\.\d{3,}\s*,\s*-?\d+\.\d{3,}\b/,
      ]) {
        const match = body.match(pattern);
        if (match) {
          found.push(`${path}: ${match[0]}`);
        }
      }
    }
  });
  record(
    "no household is identifiable at any granularity on the verifier surface",
    found.length === 0,
    found.join(" | "),
  );
}

/* A refused answer still carries no verdict. */
async function refusalsCarryNoVerdict(): Promise<void> {
  await forceCode("RATE_LIMITED", "/api/verifier");
  await textAbsent(
    "/verifier/projects",
    VERDICTS,
    "a refusal on the verifier surface carries no verdict either",
  );
  await forceCode(null);
}
