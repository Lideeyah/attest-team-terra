/* The automated demo recording. One continuous take, 1920x1080, fourteen
   beats, built to read as a person using the product. `npm run demo` is the
   whole pipeline: build, serve, re-seed, record, convert.

   Determinism: the server starts fresh (the mock's whole state is
   per-process, so a fresh process IS the re-seed), the human-feel engine's
   randomness is seeded, and the fixtures every beat depends on are asserted
   before the first frame. A missing selector stops the take and names the
   beat; a silent skip produces a film thirty seconds short that nobody
   notices until it is in the deck. */

import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { CURSOR_INIT, Human, ROUTE_MS, STAMP_MS, seedRandom, rand } from "./lib/human";

const ROOT = process.cwd();
const PORT = 3197;
const BASE = `http://127.0.0.1:${PORT}`;
const RAW_DIR = join(ROOT, "demo", "raw");
const OUT = join(ROOT, "demo", "attest-demo.mp4");

const ENV = {
  ...process.env,
  ATTEST_DEV_TOOLS: "1",
  ATTEST_API_MODE: "mock",
  NEXT_DIST_DIR: ".next-demo",
  ATTEST_INTERNAL_URL: BASE,
};

/* ---- Beat log ------------------------------------------------------------- */

let takeStart = 0;
const beats: { beat: string; at: number; target: string }[] = [];

function mark(beat: string, target: string): void {
  const at = (Date.now() - takeStart) / 1000;
  beats.push({ beat, at, target });
  const m = Math.floor(at / 60);
  const s = (at % 60).toFixed(0).padStart(2, "0");
  console.log(`  ${m}:${s}  ${beat}`);
}

/* ---- Server --------------------------------------------------------------- */

let server: ChildProcess | null = null;

async function startServer(): Promise<void> {
  if (!existsSync(join(ROOT, ".next-demo")) || process.env.DEMO_SKIP_BUILD !== "1") {
    console.log("building…");
    execFileSync("npm", ["run", "build"], { cwd: ROOT, env: ENV, stdio: "inherit" });
  }
  server = spawn("npm", ["run", "start", "--", "--port", String(PORT)], {
    cwd: ROOT,
    env: ENV,
    stdio: "ignore",
  });
  const started = Date.now();
  for (;;) {
    try {
      const response = await fetch(`${BASE}/api/public/register`);
      if (response.ok) {
        return;
      }
    } catch {
      /* not up yet */
    }
    if (Date.now() - started > 240_000) {
      throw new Error("server did not become ready");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/* ---- Determinism: the fixtures every beat depends on ---------------------- */

async function assertFixtures(): Promise<void> {
  const failures: string[] = [];
  const register = await (await fetch(`${BASE}/api/public/register?per_page=50`)).json();
  const rows = (register.data ?? []) as { id: string; name: string }[];
  const project = rows.find((row) => row.id === "proj_ekuri");
  if (!project || !/Ekuri Community Forest/.test(project.name)) {
    failures.push("the seeded Plan Vivo project (proj_ekuri, Ekuri Community Forest Carbon Project)");
  }
  const check = async (number: string) => {
    const response = await fetch(`${BASE}/api/field/identity-check`, {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": `seedcheck-${number}` },
      body: JSON.stringify({ type: "BVN", number }),
    });
    return (await response.json()) as { status: string; error?: { code: string } };
  };
  const mismatch = await check("23456789097");
  if (mismatch.error?.code !== "BVN_MISMATCH") {
    failures.push(`the name-mismatch trigger participant (…97 answered ${mismatch.error?.code ?? mismatch.status})`);
  }
  const duplicate = await check("23456789012");
  if (duplicate.error?.code !== "IDENTITY_DUPLICATE") {
    failures.push(`the duplicate-identity trigger participant (…12 answered ${duplicate.error?.code ?? duplicate.status})`);
  }
  const receipt = await fetch(`${BASE}/receipt/rct_adaeze_okonkwo_2026q4`);
  if (!receipt.ok) {
    failures.push("the paid receipt token rct_adaeze_okonkwo_2026q4");
  }
  if (failures.length > 0) {
    throw new Error(`missing fixtures, refusing to record a short take:\n  - ${failures.join("\n  - ")}`);
  }
}

async function dev(path: string, body: unknown): Promise<void> {
  await fetch(`${BASE}/api/dev/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* ---- The beats ------------------------------------------------------------ */

async function beat0_coldOpen(h: Human): Promise<void> {
  mark("0 cold open", "0:00");
  await h.page.goto(`${BASE}/register/proj_ekuri`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1600, 2000);
  /* One slow scroll to the sealed periods and their record links. No cursor
     activity. Let it be still. */
  await h.scroll(900, { increments: 9 });
  await h.read(2800, 3400);
  await h.scroll(600, { increments: 7 });
  await h.read(2400, 3000);
}

async function beat1_whereTheMoneyComesFrom(h: Human): Promise<void> {
  mark("1 where the money comes from", "0:12");
  await h.page.goto(`${BASE}/app/funding`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1400, 1800);
  await h.scrollTo('[data-inbound]');
  await h.hover('[data-inbound]', 1400, 1800);
  await h.read(1600, 2200);
}

async function beat2_thePromise(h: Human): Promise<void> {
  mark("2 the promise", "0:24");
  await h.page.goto(`${BASE}/onboarding/developer/project`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(900, 1200);
  await h.type("[data-registry-id]", "PV-2314");
  await h.click('button[type="submit"]');
  await h.page.waitForURL(/verify/, { timeout: 15_000 });
  await h.settle();
  await h.read(1100, 1500);
  /* The boundary the registry cannot serve, uploaded instead. */
  await h.page.locator("[data-boundary-file]").first().setInputFiles(join(ROOT, "demo", "assets", "ekuri-boundary.kml"));
  await h.read(400, 700);
  await h.click("button[data-boundary-submit]");
  await h.page.waitForSelector("[data-boundary-parsed]", { timeout: 15_000 });
  await h.read(1000, 1400);
  await h.click("button[data-confirm-project]");
  await h.page.waitForURL(/commitment/, { timeout: 15_000 });
  await h.settle();
  await h.read(1200, 1600);
  /* The developer's own published words. Hover the quote. */
  await h.hover(".quotation", 2400, 3000);
  await h.read(1400, 1800);
}

async function beat3_theRefusal(h: Human, ctx: BrowserContext): Promise<void> {
  mark("3 the refusal", "0:46");
  /* The field surface refuses desktop layouts by design: at 1920 it draws
     its own phone-width column, which is exactly the device framing the
     video needs. */
  await h.page.goto(`${BASE}/field/enrol`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1000, 1400);

  /* Captured with the network off. */
  await ctx.setOffline(true);
  await h.click("[data-consent]");
  await h.read(700, 1000);
  await h.click("[data-step-next]");
  await h.settle();
  await h.type("[data-identity]", "23456789045");
  await h.click("[data-step-next]");
  await h.page.waitForSelector('[data-identity-state="queued"]', { timeout: 15_000 });
  await h.read(1000, 1400);
  await h.click("[data-step-next]");
  await h.settle();
  await h.type("[data-given-name]", "Ekaette");
  /* The take's one typing correction lives here. */
  await h.type("[data-family-name]", "Okonkwo", { allowCorrection: true });
  await h.type("[data-phone]", "08032445511");
  await h.type("[data-account]", "0691004523");
  await h.click("[data-step-next]");
  await h.settle();
  /* The camera input sits behind the button; the file lands on the input and
     the flow treats it as the frame taken. */
  await h.page.locator("input.field-camera").first().setInputFiles(join(ROOT, "demo", "assets", "household-photo.png"));
  await h.read(900, 1200);
  await h.click("[data-step-next]");
  await h.page.waitForSelector('[data-location="captured"], [data-location="unavailable"]', { timeout: 20_000 });
  await h.read(800, 1100);
  await h.click("[data-step-next]");
  await h.settle();
  await h.read(1100, 1500);
  await h.click("[data-submit-enrolment]");
  await h.page.waitForSelector("[data-enrolment-queued]", { timeout: 15_000 });
  await h.read(1400, 1800);

  /* The network returns, and the queue drains. */
  await ctx.setOffline(false);
  await h.page.goto(`${BASE}/field/queue`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1800, 2400);

  /* A name that resolves to somebody else: flagged, not blocked. */
  await h.page.goto(`${BASE}/field/enrol`, { waitUntil: "networkidle" });
  await h.settle();
  await h.click("[data-consent]");
  await h.click("[data-step-next]");
  await h.settle();
  await h.type("[data-identity]", "23456789097");
  await h.click("[data-step-next]");
  await h.page.waitForSelector('[data-identity-state="mismatch"]', { timeout: 15_000 });
  await h.read(1600, 2200);

  /* A duplicate identity: blocked outright, with the words an agent reads
     aloud. Hold on the block. */
  await h.page.goto(`${BASE}/field/enrol`, { waitUntil: "networkidle" });
  await h.settle();
  await h.click("[data-consent]");
  await h.click("[data-step-next]");
  await h.settle();
  await h.type("[data-identity]", "23456789012");
  await h.click("[data-step-next]");
  await h.page.waitForSelector('[data-blocked="IDENTITY_DUPLICATE"]', { timeout: 15_000 });
  await h.read(3400, 4000);
  await h.scroll(260, { increments: 3 });
  await h.read(1600, 2200);
}

async function beat4_nothingCanBeDeleted(h: Human): Promise<void> {
  mark("4 nothing can be deleted", "1:28");
  await h.page.goto(`${BASE}/app/roster`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1000, 1400);
  /* Any household: the roster is virtualised, so the first rendered row is
     the one a person would reach first anyway. */
  await h.click('a[href^="/app/roster/ptc_"]');
  await h.page.waitForURL(/\/app\/roster\/ptc_/, { timeout: 15_000 });
  await h.settle();
  await h.read(1100, 1500);
  await h.scrollTo('[data-status-value]');
  await h.select("[data-status-value]", "excluded");
  await h.type("[data-status-reason]", "Household relocated outside the project area in October.");
  await h.click("[data-status-submit]");
  await h.read(1200, 1600);
  /* And there is no delete control anywhere on this page. */
  await h.scroll(700, { increments: 6 });
  await h.read(2200, 2800);
}

async function beat5_theArithmetic(h: Human): Promise<void> {
  mark("5 the arithmetic", "1:42");
  await h.page.goto(`${BASE}/app/runs/new?funding=short`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1200, 1600);
  await h.click('[data-step="arithmetic"] a');
  await h.page.waitForSelector("[data-arithmetic]", { timeout: 15_000 });
  await h.settle();
  await h.read(1800, 2400);
  await h.hover('[data-arithmetic="required"], [data-arithmetic]', 900, 1300);
  await h.click('[data-step="preflight"] a');
  await h.settle();
  await h.read(1600, 2200);
  await h.click('[data-step="confirm"] a');
  await h.page.waitForSelector("[data-shortfall]", { timeout: 15_000 });
  await h.settle();
  await h.hover("[data-shortfall]", 2200, 2800);
  await h.read(1200, 1600);
}

async function beat6_theMoney(h: Human): Promise<void> {
  mark("6 the money", "2:04");
  await dev("stream-config", { rate: 14, failureShare: 0.06, reversalShare: 0.01, transfers: 160 });
  await h.page.goto(`${BASE}/app/runs/run_2026q4`, { waitUntil: "domcontentloaded" });
  await h.settle();
  /* Rows arriving, the pulse on in-flight, stamps landing. Watch. */
  await h.page.waitForSelector('[data-transfer-row][data-state="settled"]', { timeout: 30_000 });
  await h.read(2600, 3200);
  /* Watch the counters climb and the stamps land: this is the beat every
     team shows, so it has to be seen moving, not glimpsed. */
  await h.page.waitForTimeout(11000);
  await h.scroll(500, { increments: 5 });
  await h.read(2200, 2800);
  await h.page.waitForTimeout(8800);
  /* The failures, classified, with their remediations. */
  await h.page.waitForSelector("[data-failure-class]", { timeout: 45_000 });
  await h.scrollTo("[data-failure-class]");
  await h.read(1600, 2200);
  const requery = h.page.locator("[data-requery]");
  if ((await requery.count()) > 0) {
    await h.click("[data-requery]");
    await h.read(1400, 1800);
  } else {
    await h.hover("[data-failure-class]", 1400, 1800);
  }
  await h.read(2000, 2600);
}

async function beat7_theHousehold(h: Human): Promise<void> {
  mark("7 the household", "2:42");
  await h.page.goto(`${BASE}/receipt/rct_adaeze_okonkwo_2026q4`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(2200, 2800);
  await h.scroll(420, { increments: 4 });
  await h.read(1400, 1800);
  await h.click('button[type="submit"]:not(.secondary)');
  await h.settle(900);
  await h.read(3400, 4000);
}

async function beat8_theDispute(h: Human): Promise<void> {
  mark("8 the dispute", "3:02");
  await h.page.goto(`${BASE}/receipt/rct_ngozi_eyo_2026q4`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1100, 1500);
  await h.scroll(500, { increments: 4 });
  const category = h.page.locator("#category");
  if ((await category.count()) > 0) {
    await h.select("#category", "not-received");
  }
  await h.click("button.secondary");
  await h.settle(800);
  await h.read(1400, 1800);

  await h.page.goto(`${BASE}/app/disputes`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1100, 1500);
  await h.click('[data-dispute] a, a[href^="/app/disputes/"]');
  await h.page.waitForURL(/\/app\/disputes\//, { timeout: 15_000 });
  await h.settle();
  await h.read(1300, 1700);
  await h.scrollTo("[data-dispute-response]");
  await h.type(
    "[data-dispute-response]",
    "The transfer shows settled at the bank. Requerying the session reference now.",
  );
  await h.click("[data-dispute-submit]");
  await h.read(1400, 1800);
  /* And it cannot be closed by assertion: there is no close control, and the
     copy says what closes it. */
  await h.read(1200, 1600);
}

async function beat9_theBanksView(h: Human): Promise<void> {
  mark("9 the bank's view", "3:26");
  await h.page.goto(`${BASE}/ops/signals`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1400, 1800);
  await h.click('a[href="/ops/signals/sig_0231"]');
  await h.page.waitForURL(/sig_0231/, { timeout: 15_000 });
  await h.settle();
  await h.read(1600, 2200);
  await h.scrollTo("[data-graph]");
  await h.read(3000, 3600);
  const pick = h.page.locator("[data-graph-pick]");
  if ((await pick.count()) > 0) {
    await h.click("[data-graph-pick]");
    await h.read(2000, 2600);
  }
  await h.scrollTo(".graph-log");
  await h.read(3000, 3600);
}

async function beat10_theSeal(h: Human): Promise<void> {
  mark("10 the seal", "3:52");
  await dev("period", { projectId: "proj_ekuri", state: "closed" });
  await h.page.goto(`${BASE}/app/attestations`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1400, 1800);
  /* The hash resolving, the anchor reference arriving. */
  await h.scrollTo("[data-attestation]");
  await h.read(2400, 3000);
  await h.scroll(420, { increments: 5 });
  await h.read(2400, 3000);
  await h.scroll(420, { increments: 5 });
  await h.read(3400, 4000);
}

async function beat11_notEvenUs(h: Human): Promise<void> {
  mark("11 not even us", "4:06");
  await h.page.goto(`${BASE}/attestation/att_ekuri_2026q3`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1400, 1800);
  await h.hover('text=A correction supersedes this record', 1100, 1500);
  await h.click('text=Open the correction');
  await h.page.waitForURL(/correction/, { timeout: 15_000 });
  await h.settle();
  await h.read(1600, 2200);
  await h.scroll(500, { increments: 5 });
  await h.read(1800, 2400);
}

async function beat12_publicAndCheckable(h: Human): Promise<void> {
  mark("12 public and checkable", "4:18");
  /* The bundle, fetched the way a verifier's export produces it. */
  const exported = await fetch(`${BASE}/api/verifier/export`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": "demo-take-bundle" },
    body: JSON.stringify({ projectId: "proj_ekuri", period: "2026-Q3", format: "disclosure" }),
  });
  const payload = (await exported.json()) as { data?: { bundle?: unknown } };
  if (!payload.data?.bundle) {
    throw new Error("beat 12: the disclosure bundle did not export");
  }
  await h.page.goto(`${BASE}/verify`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(1100, 1500);
  await h.paste("[data-verify-bundle]", JSON.stringify(payload.data.bundle));
  await h.click("[data-verify-submit]");
  await h.page.waitForSelector("[data-verify-outcome]", { timeout: 15_000 });
  const outcome = (await h.page.locator("[data-verify-outcome]").first().innerText()).toLowerCase();
  if (/not |mismatch|refused|wrong shape/.test(outcome)) {
    throw new Error(`beat 12: the bundle did not verify — "${outcome.slice(0, 80)}"`);
  }
  await h.scrollTo("[data-verify-outcome]");
  await h.read(3200, 3800);
}

async function beat13_whoPaysForIt(h: Human): Promise<void> {
  mark("13 who pays for it", "4:34");
  /* The filing as it exists today: page 32 of the project's own published
     annual report — the PES payment summary, written by hand — rendered
     ahead of time because headless chromium has no PDF viewer. */
  const reportPage = join(ROOT, "demo", "assets", "annual-report-p32.png");
  await h.page.goto(`file://${reportPage}`, { waitUntil: "load" });
  await h.page.evaluate(
    `document.body.style.background = "#DDD9CC"; const img = document.querySelector("img"); if (img) { img.style.display = "block"; img.style.margin = "0 auto"; img.style.height = "100vh"; img.style.width = "auto"; }`,
  );
  await h.read(3200, 3800);
  /* And the same filing produced from settlement. */
  await h.page.goto(`${BASE}/verifier/export`, { waitUntil: "networkidle" });
  await h.settle();
  await h.read(900, 1200);
  await h.click('[data-export-format="benefit-sharing"]');
  await h.read(500, 800);
  await h.click("[data-export-go]");
  await h.page.waitForSelector("[data-export-report]", { timeout: 20_000 });
  await h.scrollTo("[data-export-report]");
  await h.read(2200, 2800);
  /* Hold the final frame. A video that cuts on the last click has no ending. */
  await h.page.waitForTimeout(5200);
}

/* ---- The take ------------------------------------------------------------- */

async function record(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  const browser: Browser = await chromium.launch({
    args: [
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    recordVideo: { dir: RAW_DIR, size: { width: 1920, height: 1080 } },
    reducedMotion: "no-preference",
    colorScheme: "light",
    locale: "en-NG",
    timezoneId: "Africa/Lagos",
    geolocation: { latitude: 5.76, longitude: 8.37, accuracy: 12 },
    permissions: ["geolocation"],
  });
  await ctx.addInitScript(CURSOR_INIT);
  /* The receipt is a phone surface. Rather than resizing the context (which
     letterboxes the video top-left), frame it as a centred phone column. */
  await ctx.addInitScript(`
    if (location.pathname.startsWith("/receipt")) {
      const style = document.createElement("style");
      style.textContent = "html{background:#DDD9CC} body{max-width:420px;margin:24px auto;border:1px solid #BAAEA2;box-shadow:0 18px 60px rgba(24,24,22,0.18);min-height:calc(100vh - 48px)}";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }
  `);
  const page: Page = await ctx.newPage();
  seedRandom(0x41545354); /* "ATST" — fixed, so the cursor path is reproducible */
  const h = new Human(page);

  takeStart = Date.now();
  await beat0_coldOpen(h);
  await beat1_whereTheMoneyComesFrom(h);
  await beat2_thePromise(h);
  await beat3_theRefusal(h, ctx);
  await beat4_nothingCanBeDeleted(h);
  await beat5_theArithmetic(h);
  await beat6_theMoney(h);
  await beat7_theHousehold(h);
  await beat8_theDispute(h);
  await beat9_theBanksView(h);
  await beat10_theSeal(h);
  await beat11_notEvenUs(h);
  await beat12_publicAndCheckable(h);
  await beat13_whoPaysForIt(h);
  const total = (Date.now() - takeStart) / 1000;

  await ctx.close();
  await browser.close();

  /* The newest webm in the raw directory is the take. */
  const takes = readdirSync(RAW_DIR)
    .filter((name) => name.endsWith(".webm"))
    .map((name) => ({ name, at: statSync(join(RAW_DIR, name)).mtimeMs }))
    .sort((left, right) => right.at - left.at);
  if (takes.length === 0) {
    throw new Error("no video was recorded");
  }
  const webm = join(RAW_DIR, "attest-demo.webm");
  renameSync(join(RAW_DIR, takes[0].name), webm);

  execFileSync("ffmpeg", [
    "-y", "-i", webm,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    OUT,
  ], { stdio: "pipe" });

  const index = [
    "# Attest demo — beat index",
    "",
    `Recorded ${new Date().toISOString().slice(0, 10)} · total ${Math.floor(total / 60)}:${(total % 60).toFixed(0).padStart(2, "0")} · demo/attest-demo.mp4`,
    "",
    "| Beat | Starts at | Target |",
    "|---|---|---|",
    ...beats.map(({ beat, at, target }) => {
      const m = Math.floor(at / 60);
      const s = (at % 60).toFixed(0).padStart(2, "0");
      return `| ${beat} | ${m}:${s} | ${target} |`;
    }),
    "",
  ].join("\n");
  writeFileSync(join(ROOT, "demo", "demo-index.md"), index);

  console.log(`\ntake: ${OUT}`);
  console.log(`duration: ${Math.floor(total / 60)}:${(total % 60).toFixed(0).padStart(2, "0")}`);
}

async function main(): Promise<void> {
  await startServer();
  try {
    await dev("force", { code: null, pathFragment: null, once: false });
    await dev("admin", { empty: false, reset: true });
    await dev("period", { projectId: "proj_ekuri", closesOn: null, state: null });
    await assertFixtures();
    await record();
  } finally {
    server?.kill();
  }
}

void main().catch((error) => {
  console.error(String(error));
  server?.kill();
  process.exit(1);
});
