/* The receipt's whole document, styles included. It is written by hand rather
   than rendered by the framework so the route ships nothing but itself: no
   React, no runtime, no font file, no stylesheet request. The tokens below are
   the product's own values, inlined because this page may not fetch anything
   it does not have to. */

const STYLES = `
  :root {
    --paper: #F7F4EB;
    --reading: #FDFCFA;
    --elevated: #EFECE1;
    --hairline: #D8D4C5;
    --contrast: #BAAEA2;
    --ink: #181816;
    --muted: #5C5A55;
    --dim: #8C887E;
    --bottle: #1E3A2E;
    --sealed-wash: #EFECE1;
    --sealed-border: #BAAEA2;
    --flagged-ink: #7A5038;
    --flagged-wash: #F2EBE4;
    --flagged-border: #CDAE9A;
    --record: ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", "Roboto Mono", monospace;
    --prose: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; border-radius: 0; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--prose);
    font-size: 16px;
    line-height: 1.55;
  }
  main { max-width: 34rem; margin-inline: auto; padding: 20px; display: grid; gap: 28px; }
  h1 { font-size: 1.5rem; line-height: 1.15; letter-spacing: -0.02em; margin: 0; color: var(--bottle); }
  h2 { font-size: 1rem; margin: 0; }
  p { margin: 0; }
  .record { font-family: var(--record); font-variant-numeric: tabular-nums; }
  .eyebrow {
    font-family: var(--record);
    font-size: 10.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .notice {
    background: var(--elevated);
    border-left: 3px solid var(--bottle);
    padding: 11px 14px;
  }
  section { display: grid; gap: 20px; }
  .payment {
    display: grid;
    gap: 4px;
    padding: 11px 0;
    border-bottom: 1px solid var(--hairline);
  }
  .amount { font-family: var(--record); font-size: 1.5rem; font-variant-numeric: tabular-nums; }
  .stamp {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--record);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    padding: 5px 11px;
    border: 1px solid var(--sealed-border);
    background: var(--sealed-wash);
    color: var(--ink);
  }
  .stamp-flagged {
    color: var(--flagged-ink);
    background: var(--flagged-wash);
    border-color: var(--flagged-border);
  }
  .glyph { width: 0.62em; height: 0.62em; background: currentColor; display: inline-block; }
  .glyph-flagged { clip-path: polygon(50% 0, 100% 100%, 0 100%); }
  .actions { gap: 14px; }
  form { display: grid; gap: 10px; }
  button {
    font-family: var(--prose);
    font-size: 1rem;
    min-height: 56px;
    width: 100%;
    background: var(--bottle);
    color: var(--paper);
    border: 1px solid var(--bottle);
    cursor: pointer;
  }
  button.secondary { background: transparent; color: var(--ink); border-color: var(--contrast); }
  select {
    font-family: var(--prose);
    font-size: 1rem;
    width: 100%;
    padding: 10px;
    background: var(--reading);
    border: 1px solid var(--contrast);
  }
  @media print {
    body { background: #fff; }
    .actions { display: none; }
  }
`;

export function receiptDocument({ title, body }: { title: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title}</title>
<style>${STYLES}</style>
</head>
<body><main>${body}</main></body>
</html>`;
}
