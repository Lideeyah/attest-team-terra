/* The human-feel engine. Every movement, click, keystroke and scroll in the
   recording goes through this module; a raw page.click anywhere in the demo
   script is a defect. The point is that the film reads as a person using the
   product: a visible cursor, curved travel, hover before click, typing with
   rhythm, scrolling with weight, and pauses long enough to read.

   The randomness is seeded, so the take you approve is the take you get. */

import type { Page } from "@playwright/test";

/* ---- Seeded randomness ---------------------------------------------------- */

let state = 0x9e3779b9;

export function seedRandom(seed: number): void {
  state = seed >>> 0;
}

function random(): number {
  /* mulberry32 */
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rand(low: number, high: number): number {
  return low + random() * (high - low);
}

/* ---- The cursor ----------------------------------------------------------- */

const ARROW = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 2 L5 19 L9.5 15.2 L12.4 21.6 L15.1 20.4 L12.2 14 L18 13.6 Z" fill="#181816" stroke="#F7F4EB" stroke-width="1.4"/></svg>`,
);

export const CURSOR_INIT = `
(() => {
  if (window.__cursorInstalled) { return; }
  window.__cursorInstalled = true;
  const install = () => {
    if (!document.documentElement) { return; }
    const dot = document.createElement("div");
    dot.id = "__cursor";
    Object.assign(dot.style, {
      position: "fixed", width: "22px", height: "22px", zIndex: "2147483647",
      pointerEvents: "none", left: "0", top: "0",
      transition: "transform 40ms linear",
      background: 'no-repeat center/contain url("data:image/svg+xml,${ARROW}")',
    });
    document.documentElement.appendChild(dot);
    let scale = 1;
    const place = (x, y) => {
      dot.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
      dot.dataset.x = String(x); dot.dataset.y = String(y);
    };
    addEventListener("mousemove", (e) => place(e.clientX, e.clientY), { capture: true });
    addEventListener("mousedown", () => { scale = 0.85; place(Number(dot.dataset.x || 0), Number(dot.dataset.y || 0)); }, { capture: true });
    addEventListener("mouseup", () => { scale = 1; place(Number(dot.dataset.x || 0), Number(dot.dataset.y || 0)); }, { capture: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
`;

/* ---- Timing constants from the product's own motion system ---------------- */

/** stampLand: 333ms of impact plus 333ms of the ink setting. */
export const STAMP_MS = 666;
/** The shared-axis route transition. */
export const ROUTE_MS = 292;
/** hashResolve. */
export const HASH_MS = 583;

/* ---- The engine ----------------------------------------------------------- */

type Point = { x: number; y: number };

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function quadBezier(from: Point, mid: Point, to: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * mid.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * mid.y + t * t * to.y,
  };
}

export class Human {
  readonly page: Page;
  private at: Point = { x: 120, y: 120 };
  private correctionSpent = false;

  constructor(page: Page) {
    this.page = page;
  }

  position(): Point {
    return { ...this.at };
  }

  /** A read pause: the viewer has to read what the operator is reading. */
  async read(low = 900, high = 1600): Promise<void> {
    await this.page.waitForTimeout(rand(low, high));
  }

  async settle(ms = ROUTE_MS + 120): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Curved travel with eased step distribution, and an overshoot with a
      three-step correction on long moves. */
  async moveTo(x: number, y: number, { steps }: { steps?: number } = {}): Promise<void> {
    const from = this.at;
    const distance = Math.hypot(x - from.x, y - from.y);
    const n = steps ?? Math.round(rand(18, 28));
    const dx = x - from.x;
    const dy = y - from.y;
    const length = Math.max(1, distance);
    const offset = rand(40, 110) * (random() < 0.5 ? -1 : 1);
    const mid: Point = {
      x: (from.x + x) / 2 + (-dy / length) * offset,
      y: (from.y + y) / 2 + (dx / length) * offset,
    };
    const overshoot = distance > 600;
    const target: Point = overshoot
      ? { x: x + (dx / length) * rand(6, 14), y: y + (dy / length) * rand(6, 14) }
      : { x, y };
    for (let i = 1; i <= n; i += 1) {
      const t = easeInOutCubic(i / n);
      const p = quadBezier(from, mid, target, t);
      await this.page.mouse.move(p.x, p.y);
      await this.page.waitForTimeout(rand(6, 14));
    }
    if (overshoot) {
      for (let i = 1; i <= 3; i += 1) {
        const p = {
          x: target.x + ((x - target.x) * i) / 3,
          y: target.y + ((y - target.y) * i) / 3,
        };
        await this.page.mouse.move(p.x, p.y);
        await this.page.waitForTimeout(rand(14, 26));
      }
    }
    this.at = { x, y };
  }

  private async centreOf(selector: string): Promise<Point> {
    const locator = this.page.locator(selector).first();
    await locator.waitFor({ state: "visible", timeout: 15_000 });
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error(`no bounding box for ${selector}`);
    }
    return {
      x: box.x + box.width * rand(0.35, 0.65),
      y: box.y + box.height * rand(0.35, 0.65),
    };
  }

  /** Hover, settle, then click. Never click the instant the cursor arrives. */
  async click(selector: string): Promise<void> {
    const p = await this.centreOf(selector);
    await this.moveTo(p.x, p.y);
    await this.page.waitForTimeout(rand(160, 420));
    await this.page.mouse.down();
    await this.page.waitForTimeout(rand(40, 90));
    await this.page.mouse.up();
  }

  async hover(selector: string, holdLow = 500, holdHigh = 900): Promise<void> {
    const p = await this.centreOf(selector);
    await this.moveTo(p.x, p.y);
    await this.page.waitForTimeout(rand(holdLow, holdHigh));
  }

  /** Typing with rhythm, and — once in the whole take — a deliberate typo,
      a pause, a backspace, and the right character. Exactly one. */
  async type(selector: string, text: string, { allowCorrection = false } = {}): Promise<void> {
    await this.click(selector);
    await this.page.waitForTimeout(rand(180, 300));
    const slip = allowCorrection && !this.correctionSpent
      ? Math.max(2, Math.floor(text.length * 0.55))
      : -1;
    for (let i = 0; i < text.length; i += 1) {
      if (i === slip) {
        const wrong = text[i] === "a" ? "s" : "a";
        await this.page.keyboard.type(wrong);
        await this.page.waitForTimeout(rand(320, 520));
        await this.page.keyboard.press("Backspace");
        await this.page.waitForTimeout(rand(140, 240));
        this.correctionSpent = true;
      }
      await this.page.keyboard.type(text[i]);
      const boundary = text[i] === " " || /[.,;!?]/.test(text[i]);
      await this.page.waitForTimeout(boundary ? rand(180, 320) : rand(55, 125));
    }
  }

  /** A paste, for content nobody would type: click into the field, then the
      value arrives at once, the way a real paste does. */
  async paste(selector: string, value: string): Promise<void> {
    await this.click(selector);
    await this.page.waitForTimeout(rand(260, 420));
    await this.page.locator(selector).first().fill(value);
    await this.page.waitForTimeout(rand(300, 500));
  }

  async select(selector: string, value: string): Promise<void> {
    await this.click(selector);
    await this.page.waitForTimeout(rand(200, 380));
    await this.page.locator(selector).first().selectOption(value);
    await this.page.waitForTimeout(rand(200, 380));
  }

  /** Scrolling with weight: 6 to 10 increments, shrinking toward the end. */
  async scroll(totalPixels: number, { increments }: { increments?: number } = {}): Promise<void> {
    const n = increments ?? Math.round(rand(6, 10));
    const weights: number[] = [];
    for (let i = 0; i < n; i += 1) {
      weights.push(1 - (i / n) * 0.55);
    }
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < n; i += 1) {
      const step = (totalPixels * weights[i]) / weightSum;
      await this.page.mouse.wheel(0, step);
      await this.page.waitForTimeout(rand(90, 170));
    }
    await this.page.waitForTimeout(300);
  }

  /** Scroll until a selector is comfortably in view, in weighted increments. */
  async scrollTo(selector: string): Promise<void> {
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const box = await this.page.locator(selector).first().boundingBox();
      const viewport = this.page.viewportSize();
      if (box && viewport && box.y > 80 && box.y + box.height < viewport.height - 80) {
        return;
      }
      const delta = box
        ? box.y - (viewport ? viewport.height * 0.4 : 400)
        : 600;
      await this.scroll(Math.max(-900, Math.min(900, delta)), { increments: 3 });
    }
  }
}
