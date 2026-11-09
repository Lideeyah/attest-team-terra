/* Builds verification/index.html: a contact sheet of every screenshot the
   gates wrote, grouped by phase and labelled by route and state, with each
   phase's gate result beside it. Styled with the project's own tokens.

   Run with: node scripts/contact-sheet.mjs */

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const verification = join(root, "verification");

const PHASE_TITLES = {
  "F-0": "Foundation",
  "F-1": "Mock server, typed client and state control",
  "F-2": "Landing page",
  "F-3": "Public register and verification",
  "F-4": "Auth, role selection and onboarding",
  "F-5": "Developer console",
  "F-6": "Field app",
  "F-7": "Verifier portal",
  "F-8": "Bank operations console",
  "F-9": "Platform admin and hardening",
};

function phases() {
  if (!existsSync(verification)) {
    return [];
  }
  return readdirSync(verification)
    .filter((entry) => statSync(join(verification, entry)).isDirectory())
    .sort();
}

function shotsFor(phase) {
  return readdirSync(join(verification, phase))
    .filter((file) => file.endsWith(".png"))
    .sort();
}

function gateResult(phase) {
  const file = join(verification, phase, "gate.txt");
  if (!existsSync(file)) {
    return null;
  }
  const text = readFileSync(file, "utf8");
  const summary = text.trim().split("\n").at(-1) ?? "";
  const failed = /[1-9]\d* failed/.test(summary);
  return { summary, failed };
}

function label(file) {
  return file
    .replace(/\.png$/, "")
    .split("-")
    .join(" ")
    .replace(/^./, (character) => character.toUpperCase());
}

const tokens = readFileSync(join(root, "app", "styles", "tokens.css"), "utf8");

const sections = phases()
  .map((phase) => {
    const result = gateResult(phase);
    const shots = shotsFor(phase);
    return `
    <section class="phase">
      <div class="phase-head">
        <div>
          <p class="eyebrow">${phase}</p>
          <h2>${PHASE_TITLES[phase] ?? phase}</h2>
        </div>
        <p class="gate ${result?.failed ? "gate-failed" : "gate-passed"}">
          ${result ? result.summary : "gate result not recorded"}
        </p>
      </div>
      <hr class="heavy" />
      <div class="grid">
        ${shots
          .map(
            (file) => `
          <figure>
            <a href="${phase}/${file}"><img src="${phase}/${file}" alt="${label(file)}" loading="lazy" /></a>
            <figcaption>${label(file)}</figcaption>
          </figure>`,
          )
          .join("")}
      </div>
    </section>`;
  })
  .join("");

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
.phase { padding-block: var(--section-tight); }
.phase-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--stack); padding-block-end: var(--stack); }
.gate { font-family: var(--font-record), monospace; font-size: var(--fs-record-cell); margin: 0; padding: 5px 11px; border: var(--hairline) solid var(--stamp-sealed-border); background: var(--stamp-sealed-wash); text-transform: uppercase; letter-spacing: var(--tr-stamp); }
.gate-failed { color: var(--stamp-blocked-ink); background: var(--stamp-blocked-wash); border-color: var(--stamp-blocked-border); }
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
      decisions taken during the build and the items needing judgement are in
      BUILD_LOG.md.
    </p>
    <hr class="heavy" />
  </header>
  ${sections || '<p class="lede">No screenshots have been written yet.</p>'}
  <footer class="phase">
    <hr class="heavy" />
    <p class="eyebrow">Generated from verification/ by scripts/contact-sheet.mjs</p>
  </footer>
</div>
</body>
</html>
`;

writeFileSync(join(verification, "index.html"), html);
process.stdout.write(`contact sheet written for ${phases().length} phases\n`);
