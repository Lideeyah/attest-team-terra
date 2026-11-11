/* The deck's one product visual: the real annual report's hand-written
   payment summary beside the same filing rendered from settlement. The
   comparison is the product's whole argument in a single frame. */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const PORT = 3197;
const BASE = `http://127.0.0.1:${PORT}`;
const ENV = { ...process.env, ATTEST_DEV_TOOLS: "1", ATTEST_API_MODE: "mock", NEXT_DIST_DIR: ".next-demo", ATTEST_INTERNAL_URL: BASE };

async function main(): Promise<void> {
  const server = spawn("npm", ["run", "start", "--", "--port", String(PORT)], { cwd: ROOT, env: ENV, stdio: "ignore" });
  try {
    for (;;) {
      try { const r = await fetch(`${BASE}/api/public/register`); if (r.ok) break; } catch { /* booting */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 1600 }, deviceScaleFactor: 2 });

    /* The export, generated the way a verifier generates it. */
    await page.goto(`${BASE}/verifier/export`, { waitUntil: "networkidle" });
    await page.click('[data-export-format="benefit-sharing"]');
    await page.click("[data-export-go]");
    await page.waitForSelector("[data-export-report]", { timeout: 20_000 });
    await page.waitForTimeout(400);
    const panel = page.locator("[data-export-report]");
    const shot = await panel.screenshot();
    writeFileSync("/tmp/report-panel.png", shot);

    /* The composition, in the product's own palette. */
    const left = readFileSync(join(ROOT, "demo", "assets", "annual-report-p32.png")).toString("base64");
    const right = readFileSync("/tmp/report-panel.png").toString("base64");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { margin: 0; box-sizing: border-box; }
      body { width: 2560px; height: 1440px; background: #F7F4EB; color: #181816;
             font-family: Georgia, "Times New Roman", serif; padding: 72px 96px; }
      .eyebrow { font-family: "Courier New", monospace; font-size: 22px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: #5E5A52; }
      h1 { font-family: "Helvetica Neue", Arial, sans-serif; font-weight: 700; font-size: 56px;
           letter-spacing: -0.01em; color: #1E3A2E; margin: 10px 0 10px; }
      .rule { height: 3px; background: #181816; margin: 22px 0 40px; }
      .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; }
      .col { display: flex; flex-direction: column; gap: 18px; }
      .frame { max-height: 864px; background: #FDFCFA; border: 1px solid #BAAEA2;
               box-shadow: 0 16px 50px rgba(24,24,22,0.12); overflow: hidden; }
      .frame img { width: 100%; height: auto; display: block; }
      .cap { font-size: 26px; color: #5C5A55; }
      .cap b { color: #181816; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 27px; }
      .foot { margin-top: 30px; font-family: "Courier New", monospace; font-size: 21px;
              letter-spacing: 0.1em; text-transform: uppercase; color: #5E5A52; }
    </style></head><body>
      <p class="eyebrow">Attest &middot; the benefit-sharing filing</p>
      <h1>Written by hand today. Rendered from settlement with Attest.</h1>
      <div class="rule"></div>
      <div class="cols">
        <div class="col">
          <div class="frame"><img src="data:image/png;base64,${left}"></div>
          <p class="cap"><b>Today:</b> a Plan Vivo project's published annual report — the 60% requirement cited, then lump-sum transfer dates in a hand-made table. No per-household coverage, no confirmations, nothing a reader can check.</p>
        </div>
        <div class="col">
          <div class="frame"><img src="data:image/png;base64,${right}"></div>
          <p class="cap"><b>With Attest:</b> the same filing rendered from bank settlement — the commitment with its source sentence, paid of enrolled, confirmations by households, disputes at close, and the sealed, anchored record it rests on.</p>
        </div>
      </div>
      <p class="foot">Every figure computed from transfers that cleared the bank &middot; checkable against the published Merkle root</p>
    </body></html>`;
    writeFileSync("/tmp/deck-visual.html", html);
    const composer = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });
    await composer.goto("file:///tmp/deck-visual.html", { waitUntil: "load" });
    await composer.waitForTimeout(300);
    await composer.screenshot({ path: join(ROOT, "demo", "deck-visual.png") });

    /* The slide-box variant: 4.90in x 4.60in at 300dpi, rendered at 2x
       (2940x2760), stacked rather than side by side because the box is
       near-square. */
    const square = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { margin: 0; box-sizing: border-box; }
      body { width: 1470px; height: 1380px; background: #F7F4EB; color: #181816;
             font-family: Georgia, "Times New Roman", serif; padding: 44px 52px; }
      .eyebrow { font-family: "Courier New", monospace; font-size: 15px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: #5E5A52; }
      h1 { font-family: "Helvetica Neue", Arial, sans-serif; font-weight: 700; font-size: 34px;
           letter-spacing: -0.01em; color: #1E3A2E; margin: 6px 0 12px; }
      .rule { height: 2px; background: #181816; margin: 0 0 24px; }
      .frame { background: #FDFCFA; border: 1px solid #BAAEA2;
               box-shadow: 0 10px 30px rgba(24,24,22,0.12); overflow: hidden; }
      .frame img { width: 100%; display: block; }
      /* The top frame opens on the hand-made table itself — the thing the
         caption names — not the prose above it. */
      .top { max-height: 450px; }
      .top img { margin-top: -52%; }
      /* The panel shows whole, scaled to fit: the sealed record rows are the
         argument's landing, so nothing of it is cropped. */
      .bottom { width: 72%; margin: 22px auto 0; max-height: none; }
      .cap { font-size: 17.5px; color: #5C5A55; margin-top: 10px; line-height: 1.4; }
      .cap b { color: #181816; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 18px; }
    </style></head><body>
      <p class="eyebrow">Attest &middot; the benefit-sharing filing</p>
      <h1>Written by hand today. Rendered from settlement.</h1>
      <div class="rule"></div>
      <div class="frame top"><img src="data:image/png;base64,${left}"></div>
      <p class="cap"><b>Today:</b> the project's published annual report &mdash; lump-sum transfer dates in a hand-made table. Nothing a reader can check.</p>
      <div class="frame bottom"><img src="data:image/png;base64,${right}"></div>
      <p class="cap"><b>With Attest:</b> the same filing from bank settlement &mdash; commitment, paid of enrolled, household confirmations, and the sealed, anchored record it rests on.</p>
    </body></html>`;
    writeFileSync("/tmp/deck-visual-square.html", square);
    const squarePage = await browser.newPage({ viewport: { width: 1470, height: 1380 }, deviceScaleFactor: 2 });
    await squarePage.goto("file:///tmp/deck-visual-square.html", { waitUntil: "load" });
    await squarePage.waitForTimeout(300);
    await squarePage.screenshot({ path: join(ROOT, "demo", "deck-visual-square.png") });
    await browser.close();
    console.log("written demo/deck-visual.png and demo/deck-visual-square.png");
  } finally {
    server.kill();
  }
}
void main();
