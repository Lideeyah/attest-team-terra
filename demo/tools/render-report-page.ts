/* One-time: render page 32 of the published TGB 2024 annual report (the PES
   payment summary) to a PNG the demo's final beat can show full-screen. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const PDF = join(ROOT, "demo", "trees-for-global-benefits-annual-report-2024.pdf");
const OUT = join(ROOT, "demo", "assets", "annual-report-p32.png");

async function main(): Promise<void> {
  mkdirSync(join(ROOT, "demo", "assets"), { recursive: true });
  const bytes = readFileSync(PDF).toString("base64");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto("about:blank");
  await page.addScriptTag({
    url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  });
  const dataUrl = (await page.evaluate(async (b64) => {
    const lib = (window as unknown as { pdfjsLib: any }).pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const raw = atob(b64);
    const data = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      data[i] = raw.charCodeAt(i);
    }
    const doc = await lib.getDocument({ data }).promise;
    const pageObj = await doc.getPage(32);
    const viewport = pageObj.getViewport({ scale: 2.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pageObj.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    return canvas.toDataURL("image/png");
  }, bytes)) as string;
  await browser.close();
  writeFileSync(OUT, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("written", OUT);
}

void main();
