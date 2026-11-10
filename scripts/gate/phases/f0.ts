import {
  a11y,
  fileContains,
  computedFont,
  durationsAreFrames,
  gitIgnores,
  grepAbsent,
  markersPresent,
  record,
  reducedMotion,
  routeRenders,
  screenshot,
  stampKeepsTransform,
  typecheck,
} from "../assert";
import { server } from "../server";

/* Written from F-0's exit checklist. Every line there is an assertion here. */

const COMPONENTS = [
  "button",
  "input",
  "select",
  "textarea",
  "punch",
  "radio",
  "pick",
  "table",
  "figure",
  "strip",
  "stamp",
  "mark",
  "rule",
  "hash",
  "registered",
  "notice",
  "tabs",
  "console",
  "empty-state",
  "toast",
  "sheet",
  "modal",
  "chart",
];

const PRIMITIVES = [
  "recordArrive",
  "stampLand",
  "ruleDraw",
  "sealPeriod",
  "tallyTo",
  "hashResolve",
  "routeForward",
  "routeBack",
  "disclose",
  "sheetIn",
  "pressTravel",
  "tick",
  "queuePulse",
];

/* The token stylesheet is the one place a literal may appear. */
const OUTSIDE_TOKENS = [
  "app/**/*.css",
  "app/**/*.tsx",
  "components/**/*.tsx",
  "lib/**/*.ts",
];
const TOKEN_FILE = ["app/styles/tokens.css"];

export async function f0(): Promise<void> {
  typecheck();

  gitIgnores([".env", ".env.local", "team05.yml", "secrets/cluster.pem", "uploads/boundary.json"]);

  grepAbsent(
    "no hex colour outside the token stylesheet",
    /#[0-9a-fA-F]{3,8}\b/,
    OUTSIDE_TOKENS,
    [...TOKEN_FILE],
  );
  grepAbsent(
    "no millisecond literal outside the token stylesheet",
    /(?<![\w.-])(?!0ms\b)(?!0\.001ms\b)\d+(?:\.\d+)?ms\b/,
    ["app/**/*.css"],
    [...TOKEN_FILE],
  );
  grepAbsent(
    "no cubic-bezier outside the token stylesheet",
    /cubic-bezier\(/,
    OUTSIDE_TOKENS,
    [...TOKEN_FILE],
  );
  grepAbsent(
    "no border-radius outside the token stylesheet and the radio punch",
    /border-radius\s*:/,
    OUTSIDE_TOKENS,
    [...TOKEN_FILE, "app/styles/components.css", "app/styles/base.css"],
  );
  grepAbsent(
    "no rounded utility class",
    /className="[^"]*\brounded(-[a-z0-9]+)?\b/,
    ["app/**/*.tsx", "components/**/*.tsx"],
  );
  grepAbsent(
    "no spring easing anywhere",
    /\b(spring|bounce|elastic)\b\s*[:(]/,
    OUTSIDE_TOKENS,
  );
  grepAbsent(
    "no shadow outside the modal scrim",
    /box-shadow:(?![^;]*inset)/,
    ["app/styles/components.css", "app/styles/base.css"],
  );
  fileContains(
    "Tailwind's default palette, type scale, radii and shadows are removed",
    "app/globals.css",
    [
      /--color-\*:\s*initial/,
      /--font-\*:\s*initial/,
      /--text-\*:\s*initial/,
      /--radius-\*:\s*initial/,
      /--shadow-\*:\s*initial/,
    ],
  );

  durationsAreFrames();

  await routeRenders("/dev/kitchen-sink");
  await routeRenders("/dev/shells/developer");
  await routeRenders("/dev/shells/field");
  await routeRenders("/dev/shells/masthead");

  /* The fourth shell, and what every authenticated shell has to say. */
  await markersPresent(
    "/",
    "data-shell",
    ["public-masthead"],
    "the public masthead is on the landing page",
  );
  await shellsSayWhoIsSignedIn();

  await markersPresent(
    "/dev/kitchen-sink",
    "data-component",
    COMPONENTS,
    "kitchen sink renders every component",
  );
  await markersPresent(
    "/dev/kitchen-sink",
    "data-primitive",
    PRIMITIVES,
    "kitchen sink renders every motion primitive",
  );

  await stampKeepsTransform("/dev/kitchen-sink", "[data-stamp-centred]");
  await computedFont("/dev/kitchen-sink", "[data-component='table'] td", /Courier/i);
  await reducedMotion("/dev/kitchen-sink");
  await a11y("/dev/kitchen-sink");

  await screenshot("F-0", "/dev/kitchen-sink", "kitchen-sink");
  await screenshot("F-0", "/dev/shells/developer", "shell-developer");
  await screenshot("F-0", "/dev/shells/field", "shell-field");
  await screenshot("F-0", "/dev/shells/masthead", "shell-masthead");
  await screenshot("F-0", "/", "public-masthead");
}


/** Every authenticated shell says who is signed in and offers a way out, and
    the developer rail carries what is outstanding behind each section. */
async function shellsSayWhoIsSignedIn(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const findings: string[] = [];
  for (const [path, name] of [
    ["/dev/shells/developer", "developer rail"],
    ["/dev/shells/masthead", "masthead"],
  ] as [string, string][]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const signOut = await page.locator('form[action="/signout"] button').count();
    if (signOut === 0) {
      findings.push(`${name}: no sign out`);
    }
    if (!/@/.test(body)) {
      findings.push(`${name}: does not say who is signed in`);
    }
  }

  await page.goto(`${baseUrl}/dev/shells/developer`, { waitUntil: "networkidle" });
  const counts = await page.locator(".console-nav-count").count();
  const accented = (await page.evaluate(
    `Array.from(document.querySelectorAll(".console-nav-count")).filter(function (node) {
      return getComputedStyle(node).color === "rgb(30, 58, 46)";
    }).length`,
  )) as number;
  if (counts === 0) {
    findings.push("developer rail: no outstanding counts");
  }
  if (accented > 0) {
    findings.push("developer rail: a count takes the accent");
  }
  await browser.close();

  record(
    "each shell says who is signed in, offers a way out and counts what is outstanding",
    findings.length === 0,
    findings.join(", "),
  );
}
