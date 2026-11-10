/* The contact sheet. `node scripts/contact-sheet.mjs` reads the screenshots
   and the gate result each phase left in verification/<phase>/ and writes
   verification/index.html, styled with the product's own tokens — the token
   stylesheet is inlined rather than restated, so the sheet cannot drift from
   the design system it is showing.

   It is generated rather than hand-written because a phase adds dozens of
   captures and a sheet maintained by hand goes stale the first time it is
   inconvenient. */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHEET = join(ROOT, "verification");

const PHASES = [
  { id: "F-0", title: "Foundation" },
  { id: "F-1", title: "Mock server, typed client and state control" },
  { id: "F-2", title: "Landing page" },
  { id: "F-3", title: "Public surfaces" },
  { id: "F-4", title: "Role selection, auth and onboarding" },
  { id: "F-5", title: "Developer console" },
  { id: "F-6", title: "Field app" },
  { id: "F-7", title: "Verifier surface" },
  { id: "F-8", title: "Bank operations" },
  { id: "F-9", title: "Platform admin and hardening" },
];

/** A file name becomes the label a reader scans: "app-runs-new" is the route,
    "state-run-draft" is a state of one. */
function label(name) {
  const base = name.replace(/\.png$/, "");
  if (base.startsWith("state-")) {
    return `State · ${base.slice(6).replace(/-/g, " ")}`;
  }
  return `/${base.replace(/-/g, "/")}`;
}

function escape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function phaseSection(phase) {
  const directory = join(SHEET, phase.id);
  if (!existsSync(directory)) {
    return "";
  }
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".png"))
    .sort();
  const gatePath = join(directory, "gate.txt");
  const gate = existsSync(gatePath)
    ? readFileSync(gatePath, "utf8").trim().split("\n")
    : [];
  const summary = gate.length > 0 ? gate[gate.length - 1] : "not run";
  const failures = gate.filter((line) => line.startsWith("FAIL"));
  /* Routes first, then the states of those routes, because that is the order
     somebody reviews them in. */
  const routes = files.filter((name) => !name.startsWith("state-"));
  const states = files.filter((name) => name.startsWith("state-"));

  const figures = [...routes, ...states]
    .map(
      (name) => `        <figure>
          <a href="${phase.id}/${encodeURIComponent(name)}"><img src="${phase.id}/${encodeURIComponent(name)}" alt="${escape(label(name))}" loading="lazy" /></a>
          <figcaption>${escape(label(name))}</figcaption>
        </figure>`,
    )
    .join("\n");

  const failureList =
    failures.length > 0
      ? `      <ul class="failures">
${failures.map((line) => `        <li>${escape(line.replace(/^FAIL\s+/, ""))}</li>`).join("\n")}
      </ul>`
      : "";

  return `    <section class="phase" id="${phase.id}">
      <div class="phase-head">
        <div>
          <p class="eyebrow">${phase.id}</p>
          <h2>${escape(phase.title)}</h2>
        </div>
        <p class="gate ${failures.length > 0 ? "gate-failed" : "gate-passed"}">
          ${escape(summary)}
        </p>
      </div>
      <hr class="heavy" />
${failureList}
      <div class="grid">
${figures}
      </div>
    </section>`;
}

const tokens = readFileSync(join(ROOT, "app/styles/tokens.css"), "utf8");
const sections = PHASES.map(phaseSection).filter(Boolean).join("\n");
const built = PHASES.filter((phase) => existsSync(join(SHEET, phase.id)));
const contents = built
  .map((phase) => `<a href="#${phase.id}">${phase.id} ${escape(phase.title)}</a>`)
  .join("\n      ");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Attest — verification contact sheet</title>
<style>
${tokens}
* { box-sizing: border-box; border-radius: 0; }
body {
  margin: 0;
  background: var(--canvas-paper);
  color: var(--ink-primary);
  font-family: var(--font-editorial), Georgia, serif;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}
.measure { max-width: var(--measure); margin-inline: auto; padding-inline: var(--gutter); }
h1, h2 { font-family: var(--font-display), "Inter Tight", sans-serif; font-weight: 800; letter-spacing: -0.03em; line-height: 1.02; color: var(--bottle-deep); margin: 0; }
h1 { font-size: var(--fs-h1); }
h2 { font-size: var(--fs-h3); }
.eyebrow { font-family: var(--font-record), monospace; font-size: var(--fs-eyebrow); letter-spacing: var(--tr-eyebrow); text-transform: uppercase; color: var(--ink-dim); margin: 0 0 6px; }
.lede { font-size: var(--fs-lede); color: var(--ink-muted); max-width: 65ch; }
hr { border: 0; height: var(--hairline); background: var(--rule-hairline); margin: 0; }
hr.heavy { height: var(--rule-weight-heavy); background: var(--rule-heavy); }
.contents { display: flex; flex-wrap: wrap; gap: var(--stack); padding-block: var(--stack); font-family: var(--font-record), monospace; font-size: var(--fs-record-cell); }
.contents a { text-decoration: none; border-bottom: var(--hairline) solid var(--rule-contrast); }
.phase { padding-block: var(--section-tight); }
.phase-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--stack); padding-block-end: var(--stack); }
.gate { font-family: var(--font-record), monospace; font-size: var(--fs-record-cell); margin: 0; padding: var(--pad-stamp-y) var(--pad-stamp-x); border: var(--hairline) solid var(--stamp-sealed-border); background: var(--stamp-sealed-wash); text-transform: uppercase; letter-spacing: var(--tr-stamp); white-space: nowrap; }
.gate-failed { color: var(--stamp-blocked-ink); background: var(--stamp-blocked-wash); border-color: var(--stamp-blocked-border); }
.failures { font-family: var(--font-record), monospace; font-size: var(--fs-record-cell); color: var(--stamp-blocked-ink); border-left: var(--edge-strip) solid var(--stamp-blocked-ink); margin: var(--stack) 0 0; padding: var(--stack) var(--pad-cell-x); background: var(--stamp-blocked-wash); list-style: none; }
.grid { display: grid; gap: var(--grid-rule); background: var(--rule-hairline); border: var(--hairline) solid var(--rule-hairline); grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); margin-block-start: var(--stack-lg); }
figure { margin: 0; background: var(--surface-reading); padding: var(--pad-cell-x); }
img { width: 100%; height: 260px; object-fit: cover; object-position: top; border: var(--hairline) solid var(--rule-hairline); }
figcaption { font-family: var(--font-record), monospace; font-size: var(--fs-record-cell); color: var(--ink-muted); padding-block-start: 8px; }
a { color: inherit; }
header.sheet { padding-block: var(--section); }
</style>
</head>
<body>
<div class="measure">
  <header class="sheet">
    <p class="eyebrow">Attest · front-end build</p>
    <h1>Verification contact sheet</h1>
    <p class="lede">
      Every screen each phase built, in the states its prompt lists, with that
      phase's gate result beside it. Open an image for the full capture. The
      decisions taken during the build, and the items waiting on your
      judgement, are in BUILD_LOG.md.
    </p>
    <nav class="contents">
      ${contents}
    </nav>
    <hr class="heavy" />
  </header>
${sections}
</div>
</body>
</html>
`;

writeFileSync(join(SHEET, "index.html"), html);
process.stdout.write(
  `verification/index.html — ${built.length} phases, ${
    built.reduce(
      (sum, phase) =>
        sum +
        readdirSync(join(SHEET, phase.id)).filter((name) => name.endsWith(".png")).length,
      0,
    )
  } captures\n`,
);
