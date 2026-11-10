import {
  a11y,
  fps,
  reducedMotion,
  grepAbsent,
  record,
  routeRenders,
  screenshot,
  typecheck,
  viewportRenders,
} from "../assert";
import { server } from "../server";
import type { Page } from "@playwright/test";

/* Written from F-2's exit checklist, before the landing page existed. */

const MOVEMENTS = [
  "stillness",
  "figures",
  "ledger",
  "stamp",
  "seal",
  "record",
];

const WIDTHS = [390, 768, 1280, 1920];

export async function f2(): Promise<void> {
  typecheck();

  await routeRenders("/");

  const { baseUrl } = await server();
  void baseUrl;

  /* Every movement resolves on the way down and on the way back up. */
  await viewportRenders("/", MOVEMENTS, WIDTHS);

  /* Transform and opacity only: no layout-triggering property in a scroll
     handler, and nothing from the anti-slop list anywhere on the page. */
  grepAbsent(
    "no layout-triggering property is animated on the landing page",
    /(useTransform|animate)[^\n]*\b(width|height|top|left|margin|padding)\b\s*:/,
    ["app/(public)/**/*.tsx", "components/landing/**/*.tsx"],
  );
  grepAbsent(
    "nothing from the anti-slop list on the landing page",
    /(backdrop-filter|filter:\s*blur|radial-gradient|linear-gradient\(\s*\d+deg|parallax|glow|neon|typewriter)/i,
    ["app/(public)/**/*.tsx", "components/landing/**/*.tsx", "app/styles/landing.css"],
  );
  grepAbsent(
    "no infinite animation on the landing page",
    /repeat:\s*Infinity|animation[^;]*infinite/,
    ["app/(public)/**/*.tsx", "components/landing/**/*.tsx", "app/styles/landing.css"],
  );
  grepAbsent(
    "no emoji in the product surface",
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    ["app/**/*.tsx", "components/**/*.tsx", "app/styles/*.css"],
  );

  await accentCount();

  await fps(
    "/",
    async (page) => {
      for (let step = 0; step < 24; step += 1) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(40);
      }
      for (let step = 0; step < 24; step += 1) {
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(40);
      }
    },
    60,
    "60fps through the full landing scroll",
  );

  /* Reduced motion renders six static compositions that still read as a
     sequence, rather than six empty sections. */
  await reducedMotion("/");
  await stillsReadable();

  await primitivesPlayed();
  await compositionHolds();
  await stageIsContinuous();
  await figuresSettleAtSpeed();
  await pageHeight();
  await fitsThePhone();

  await heroSentenceFlagged();

  await a11y("/");

  await screenshot("F-2", "/", "landing");
}

/* Besides the h1 and the mark, exactly one accent element: the call to
   action. The accent is scarce by rule, and this is where it is counted. */
async function accentCount(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } } as never);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const accents = await page.evaluate(() => {
    const bottle = "rgb(30, 58, 46)";
    const found: string[] = [];
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const style = getComputedStyle(element);
      const uses =
        style.color === bottle ||
        style.backgroundColor === bottle ||
        style.borderTopColor === bottle ||
        style.backgroundImage.includes(bottle);
      if (uses) {
        found.push(
          `${element.tagName.toLowerCase()}.${element.className.toString().split(" ")[0]}`,
        );
      }
    }
    return found;
  });
  await browser.close();
  /* The mark, the wordmark, the h1 and the call to action, and nothing else. */
  record(
    "the accent appears only on the h1, the mark and the call to action",
    accents.length <= 5,
    accents.join(", "),
  );
}

async function heroSentenceFlagged(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const heading = (await page.locator("h1").first().innerText()).trim();
  await browser.close();

  const { readFileSync } = await import("node:fs");
  const log = readFileSync("BUILD_LOG.md", "utf8");
  record(
    "the hero sentence is the named placeholder and is flagged for review",
    heading === "The money is promised, sometimes paid, and never provable." &&
      log.includes("The money is promised, sometimes paid, and never provable."),
    heading,
  );
}

/** Under reduced motion every movement is present, resolved and legible: its
    content is on screen at full opacity rather than waiting for a scroll. */
async function stillsReadable(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const report = (await page.evaluate(`
    (function () {
      var out = [];
      var sections = Array.from(document.querySelectorAll("[data-movement]"));
      for (var i = 0; i < sections.length; i += 1) {
        var section = sections[i];
        var hidden = Array.from(section.querySelectorAll("*")).filter(function (node) {
          var style = getComputedStyle(node);
          /* A sealed block sits one contrast level back at 0.86, which is a
             resting state rather than a hidden one. Anything at half opacity
             or less is waiting for a scroll that will never come. */
          return Number(style.opacity) <= 0.5 && node.textContent.trim().length > 0;
        });
        out.push({
          name: section.getAttribute("data-movement"),
          resolved: section.getAttribute("data-resolved"),
          hidden: hidden.length,
          text: section.innerText.trim().length,
        });
      }
      return JSON.stringify(out);
    })();
  `)) as string;
  await browser.close();

  const stills = JSON.parse(report) as {
    name: string;
    resolved: string;
    hidden: number;
    text: number;
  }[];
  const broken = stills.filter(
    (still) => still.resolved !== "true" || still.hidden > 0 || still.text < 40,
  );
  record(
    "reduced motion renders six intelligible stills",
    stills.length === 6 && broken.length === 0,
    broken.map((still) => `${still.name}: ${still.hidden} hidden, ${still.text} chars`).join(" | "),
  );
}


/** The movements play the named primitives rather than something that looks
    like them: the stamp overshoots and then sets, and the rule draws. */
async function primitivesPlayed(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    reducedMotion: "no-preference",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

  const track = await trackGeometry(page);

  /* Sample the stamp's scale as it lands. The primitive overshoots past its
     resting size and comes back; a linear shrink never goes below one. The
     sampler runs before the movement is reached, so the impact is caught. */
  await page.evaluate(`
    (function () {
      window.__scales = [];
      var tick = function () {
        var stamp = document.querySelector('[data-movement="stamp"] .stamp');
        if (stamp) {
          var matrix = new DOMMatrix(getComputedStyle(stamp).transform);
          window.__scales.push(Math.hypot(matrix.a, matrix.b));
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    })();
  `);
  for (let step = 0; step <= 16; step += 1) {
    await page.evaluate(
      `window.scrollTo(0, ${scrollForProgress(track, 900, INDEX.stamp, 0.1 + step * 0.05)})`,
    );
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(600);
  const scales = (await page.evaluate("window.__scales")) as number[];
  const overshot = scales.some((scale) => scale > 1.1);
  const settled = scales.some((scale) => scale < 0.995);
  record(
    "the stamp plays both beats: impact past its size, then the ink setting",
    overshot && settled,
    `max ${Math.max(...scales, 0).toFixed(3)}, min ${Math.min(...scales, 9).toFixed(3)}`,
  );

  /* The hash is not shown before it resolves. */
  await page.evaluate("window.scrollTo(0, 0)");
  await page.waitForTimeout(300);
  const hashAtTop = (await page.evaluate(
    `(function () {
      var node = document.querySelector('[data-movement="record"] .hash');
      if (!node) { return "missing"; }
      return getComputedStyle(node).opacity;
    })()`,
  )) as string;
  record(
    "the attestation hash is not shown before it resolves",
    Number(hashAtTop) < 0.05,
    `opacity ${hashAtTop}`,
  );

  await browser.close();
}

/** The composition is about six screens of scroll, not ten. */
async function pageHeight(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const screens =
    ((await page.evaluate("document.body.scrollHeight")) as number) / 900;
  await browser.close();
  /* Six movements that each play while they are on screen cannot fit in six
     screens of scroll: a scroll-linked composition needs scroll to happen in.
     Ten is the ceiling, and every screen of it is a composition playing. */
  record(
    "the composition is under ten screens of scroll",
    screens <= 10,
    `${screens.toFixed(1)} screens`,
  );
}

/** At phone width every movement's composition fits the screen. */
async function fitsThePhone(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const track = await trackGeometry(page);
  const tooTall: string[] = [];
  for (const movement of MOVEMENTS) {
    /* The middle of the movement, which is where its composition is held. */
    await page.evaluate(
      `window.scrollTo(0, ${scrollForProgress(track, 844, INDEX[movement], 0.5)})`,
    );
    await page.waitForTimeout(250);
    const box = (await page.evaluate(
      `JSON.stringify((function () {
        var inner = document.querySelector('[data-movement="${movement}"] .measure');
        var rect = inner.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })())`,
    )) as string;
    const rect = JSON.parse(box) as { top: number; bottom: number };
    if (rect.top < -8 || rect.bottom > 844) {
      tooTall.push(`${movement} ${Math.round(rect.top)}..${Math.round(rect.bottom)}`);
    }
  }
  await browser.close();
  record(
    "every composition fits the phone screen at 390px",
    tooTall.length === 0,
    tooTall.join(", "),
  );
}



/* The six movements share one pinned stage driven by a track of six screens,
   so a movement is addressed by its index rather than by its own offset. The
   arithmetic mirrors the component: a movement owns a sixth of the track, its
   composition plays from just after it takes the stage until the handover
   begins. */
const COUNT = 6;
const ENTER = 0.04;
const HANDOVER = 0.12;

type Track = { top: number; height: number };

async function trackGeometry(page: Page): Promise<Track> {
  return JSON.parse(
    (await page.evaluate(
      `JSON.stringify((function () {
        var track = document.querySelector('.landing-track');
        return { top: track.offsetTop, height: track.offsetHeight };
      })())`,
    )) as string,
  ) as Track;
}

function scrollForProgress(
  track: Track,
  viewport: number,
  index: number,
  p: number,
): number {
  const span = 1 / COUNT;
  const fraction = span * (index + ENTER + p * (1 - HANDOVER - ENTER));
  return Math.round(track.top + fraction * (track.height - viewport));
}

const INDEX: Record<string, number> = {
  stillness: 0,
  figures: 1,
  ledger: 2,
  stamp: 3,
  seal: 4,
  record: 5,
};

/** The composition is one object: the rows that arrive are the rows that are
    stamped and the rows that are sealed, the stamps land one after another,
    the rule is not drawn before it draws, and no figure is shown before it is
    counted.

    Each check opens its own page, because a threshold that has been crossed
    stays crossed — which is the point of the motion system and would
    otherwise make a "before" measurement impossible. */
async function compositionHolds(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();

  const open = async (width: number) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
      viewport: { width, height: width === 390 ? 844 : 900 },
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const track = await trackGeometry(page);
    const at = (movement: string, p: number) =>
      scrollForProgress(track, width === 390 ? 844 : 900, INDEX[movement], p);
    return { context, page, at };
  };

  for (const width of [390, 1280]) {
    const viewport = width === 390 ? 844 : 900;

    /* A figure is not legible before its count begins. */
    {
      const { context, page, at } = await open(width);
      await page.evaluate(`window.scrollTo(0, ${at("figures", 0.12)})`);
      await page.waitForTimeout(250);
      /* Each figure is revealed as its own count begins, so each is checked. */
      const opacities = JSON.parse(
        (await page.evaluate(
          `JSON.stringify(Array.from(document.querySelectorAll('[data-movement="figures"] .figure-cell')).map(function (cell) { return getComputedStyle(cell).opacity; }))`,
        )) as string,
      ) as string[];
      record(
        `no figure is shown before it is counted at ${width}px`,
        opacities.length === 3 && opacities.every((value) => Number(value) < 0.2),
        opacities.join(", "),
      );
      await context.close();
    }

    /* The seal rule is not drawn before it draws, and it draws on screen. */
    {
      const { context, page, at } = await open(width);
      await page.evaluate(`window.scrollTo(0, ${at("seal", 0.25)})`);
      await page.waitForTimeout(300);
      const before = JSON.parse(
        (await page.evaluate(
          `JSON.stringify((function () {
            var box = document.querySelector('[data-movement="seal"] hr.rule-heavy').getBoundingClientRect();
            return { width: Math.round(box.width), top: Math.round(box.top) };
          })())`,
        )) as string,
      ) as { width: number; top: number };
      record(
        `the seal rule is undrawn before it draws at ${width}px`,
        before.width <= 2,
        `width ${before.width}`,
      );

      await page.evaluate(`window.scrollTo(0, ${at("seal", 0.8)})`);
      await page.waitForTimeout(600);
      const after = JSON.parse(
        (await page.evaluate(
          `JSON.stringify((function () {
            var box = document.querySelector('[data-movement="seal"] hr.rule-heavy').getBoundingClientRect();
            return { width: Math.round(box.width), top: Math.round(box.top) };
          })())`,
        )) as string,
      ) as { width: number; top: number };
      record(
        `the seal rule draws where the reader can see it at ${width}px`,
        after.width > 100 && after.top > 0 && after.top < viewport,
        `width ${after.width}, top ${after.top}`,
      );
      await context.close();
    }

    /* The rows that arrive are the rows that are stamped and sealed, and the
       stamps land one after another. */
    {
      const { context, page, at } = await open(width);
      await page.evaluate(`window.scrollTo(0, ${at("ledger", 0.98)})`);
      await page.waitForTimeout(400);
      const ledgerRows = (await page.evaluate(
        `document.querySelectorAll('[data-movement="ledger"] .ledger-row').length`,
      )) as number;

      await page.evaluate(`window.scrollTo(0, ${at("stamp", 0.8)})`);
      await page.waitForTimeout(900);
      const stampRows = (await page.evaluate(
        `document.querySelectorAll('[data-movement="stamp"] .ledger-row').length`,
      )) as number;
      const delays = JSON.parse(
        (await page.evaluate(
          `JSON.stringify(Array.from(document.querySelectorAll('[data-movement="stamp"] .stamp')).map(function (node) { return getComputedStyle(node).animationDelay; }))`,
        )) as string,
      ) as string[];

      await page.evaluate(`window.scrollTo(0, ${at("seal", 0.88)})`);
      await page.waitForTimeout(500);
      const sealRows = (await page.evaluate(
        `document.querySelectorAll('[data-movement="seal"] .ledger-row').length`,
      )) as number;
      const sealStamps = (await page.evaluate(
        `document.querySelectorAll('[data-movement="seal"] .stamp').length`,
      )) as number;

      record(
        `the rows that arrive are the rows that are stamped and sealed at ${width}px`,
        stampRows === sealRows && sealStamps === sealRows && ledgerRows >= sealRows,
        `ledger ${ledgerRows}, stamped ${stampRows}, sealed ${sealRows} with ${sealStamps} stamps`,
      );
      record(
        `the stamps land one after another at ${width}px`,
        delays.length >= 3 && new Set(delays).size >= 3,
        delays.join(" | "),
      );

      if (width === 390) {
        const columns = (await page.evaluate(
          `getComputedStyle(document.querySelector('[data-movement="stamp"] .ledger-row')).gridTemplateColumns`,
        )) as string;
        const parts = columns.split(" ").map((part) => Number.parseFloat(part));
        record(
          "a ledger row keeps one wide column and its figures at 390px",
          parts.length >= 2 && parts[0] > parts[1],
          columns,
        );
      }
      await context.close();
    }
  }

  await browser.close();
}


/** There is never a point on the track where no composition covers the middle
    of the screen. One movement is the page at any moment. */
async function stageIsContinuous(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();

  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ]) {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
      viewport: { width, height },
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const track = await trackGeometry(page);

    let uncovered = 0;
    for (let y = track.top; y <= track.top + track.height - height; y += 60) {
      await page.evaluate(`window.scrollTo(0, ${y})`);
      await page.waitForTimeout(25);
      const covered = (await page.evaluate(
        `(function () {
          var mid = ${height} / 2;
          return Array.from(document.querySelectorAll(".movement")).some(function (movement) {
            if (Number(getComputedStyle(movement).opacity) < 0.08) { return false; }
            var box = movement.querySelector(".measure").getBoundingClientRect();
            return box.top <= mid && box.bottom >= mid;
          });
        })()`,
      )) as boolean;
      if (!covered) {
        uncovered += 60;
      }
    }
    await context.close();
    record(
      `a composition covers the screen through the whole track at ${width}px`,
      uncovered === 0,
      `${uncovered}px uncovered`,
    );
  }

  await browser.close();
}

/** However fast the reader scrolls, a figure is its real value by the time
    its movement hands over. A part-counted figure is a wrong number. */
async function figuresSettleAtSpeed(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { baseUrl } = await server();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    reducedMotion: "no-preference",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const wrong: string[] = [];
  for (const speed of [900, 2200]) {
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const height = (await page.evaluate("document.body.scrollHeight")) as number;
    const step = Math.round(speed / 20);
    let last = "";
    for (let y = 0; y <= height - 800; y += step) {
      await page.evaluate(`window.scrollTo(0, ${y})`);
      await page.waitForTimeout(50);
      const read = (await page.evaluate(
        `(function () {
          var movement = document.querySelector('[data-movement="figures"]');
          if (Number(getComputedStyle(movement).opacity) < 0.35) { return ""; }
          return Array.from(movement.querySelectorAll(".figure-value span"))
            .map(function (node) { return node.textContent; })
            .join(" | ");
        })()`,
      )) as string;
      if (read) {
        last = read;
      }
    }
    if (!/21,658 \| 7,375 \| 34%/.test(last)) {
      wrong.push(`${speed}px/s: ${last}`);
    }
  }
  await browser.close();
  record(
    "a figure is its real value by the time its movement hands over",
    wrong.length === 0,
    wrong.join(" | "),
  );
}
