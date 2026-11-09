"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion } from "motion/react";
import type { MotionValue } from "motion/react";
import { ButtonLink } from "@/components/Button";
import { Lockup } from "@/components/Mark";
import { Registered } from "@/components/Registered";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { Movement, useReveal, useTextFromMotion } from "@/components/landing/Movement";
import { hashResolve } from "@/lib/motion";
import {
  ATTESTATION,
  CLOSED_PERIOD,
  EVIDENCE,
  LEDGER_ROWS,
  PROJECT,
} from "@/lib/sample";
import {
  coveragePercent,
  formatCount,
  formatCoverage,
  formatNaira,
  formatTimeOfDay,
  truncateHash,
} from "@/lib/record";

/* The landing page: one continuous object through six movements, scroll-linked
   and never autoplay. A viewer controlling it reads as confident; a looping
   hero reads as a screensaver.

   The sentence in Movement 1 is the placeholder named in the build
   instructions. It is the one string on this page that is Lydia's to settle,
   and it is recorded in BUILD_LOG.md under manual review. */
const HERO_SENTENCE = "The money is promised, sometimes paid, and never provable.";

function Masthead() {
  return (
    <header className="measure" style={{ paddingBlock: "var(--stack-lg)" }}>
      <Lockup size={20} />
    </header>
  );
}

/* Movement 1, Stillness. One sentence, one heavy rule, nothing else. It rises
   in once on load and then does nothing at all. */
function Stillness() {
  return (
    <Movement name="stillness" still>
      {() => (
        <div className="stack-lg anim-record-arrive">
          <h1 className="h1-display" style={{ maxWidth: "24ch" }}>
            {HERO_SENTENCE}
          </h1>
          <Rule weight="heavy" />
        </div>
      )}
    </Movement>
  );
}

function TallyFigure({
  progress,
  range,
  label,
  value,
  format,
  denominator,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  label: string;
  value: number;
  format: (input: number) => string;
  denominator: string;
}) {
  const counted = useReveal(progress, range, [0, value]);
  const ref = useTextFromMotion(counted, format);
  const reduced = useReducedMotion();
  return (
    <div className="figure-cell">
      <p className="eyebrow">{label}</p>
      <p className="figure-value">
        <span ref={ref}>{reduced ? format(value) : format(0)}</span>
      </p>
      <p className="figure-denominator">{denominator}</p>
    </div>
  );
}

/* Movement 2, The problem as a figure. The number does the talking. */
function Figures() {
  return (
    <Movement name="figures">
      {(progress) => (
        <div className="stack-lg">
          <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
            One programme enrolled twenty-one thousand households
          </h2>
          <div className="figure-row">
            <TallyFigure
              progress={progress}
              range={[0.1, 0.5]}
              label="Households enrolled"
              value={EVIDENCE.enrolled}
              format={(input) => formatCount(Math.round(input))}
              denominator="Enrolled in the benefit-sharing register"
            />
            <TallyFigure
              progress={progress}
              range={[0.25, 0.65]}
              label="Households recorded as paid"
              value={EVIDENCE.paid}
              format={(input) => formatCount(Math.round(input))}
              denominator={`of ${formatCount(EVIDENCE.enrolled)} enrolled`}
            />
            <TallyFigure
              progress={progress}
              range={[0.4, 0.8]}
              label="Coverage"
              value={EVIDENCE.coveragePercent}
              format={(input) => `${Math.round(input)}%`}
              denominator={`${formatCount(EVIDENCE.paid)} of ${formatCount(EVIDENCE.enrolled)}`}
            />
          </div>
          <p className="prose-muted">
            The rest were promised the same share. Nobody can say from the
            outside whether they received it, because the money moved in cash
            and cash leaves no record anyone else can read.
          </p>
          <p className="eyebrow">{EVIDENCE.source}</p>
        </div>
      )}
    </Movement>
  );
}

function LedgerRow({
  progress,
  index,
  total,
  name,
  community,
  amount,
  at,
  stampedFrom,
  recordId,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  name: string;
  community: string;
  amount: string;
  at: string;
  stampedFrom?: number;
  recordId?: string;
}) {
  /* Scroll position drives the row count: scrolling up removes rows and
     scrolling down adds them, one frame of stagger apart. */
  const start = 0.08 + (index / total) * 0.62;
  const opacity = useReveal(progress, [start, start + 0.06], [0, 1]);
  const y = useReveal(progress, [start, start + 0.06], [12, 0]);
  const stampOpacity = useReveal(
    progress,
    [stampedFrom ?? 1.2, (stampedFrom ?? 1.2) + 0.05],
    [0, 1],
  );
  const stampScale = useReveal(
    progress,
    [stampedFrom ?? 1.2, (stampedFrom ?? 1.2) + 0.05],
    [1.28, 1],
  );

  return (
    <motion.div
      className={stampedFrom === undefined ? "ledger-row" : "ledger-row ledger-row-stamped"}
      style={{ opacity, y }}
    >
      <span className="record-cell">
        {name} · {community}
      </span>
      <span className="record-cell numeric">{formatNaira(amount)}</span>
      <span className="record-cell">{formatTimeOfDay(at)}</span>
      {stampedFrom === undefined ? null : (
        <motion.span style={{ opacity: stampOpacity, scale: stampScale }}>
          <Stamp state="sealed" label="Settled" recordId={recordId ?? "trf"} />
        </motion.span>
      )}
    </motion.div>
  );
}

/* Movement 3, The ledger builds. The viewer is scrolling money into existence. */
function Ledger() {
  return (
    <Movement name="ledger">
      {(progress) => (
        <div className="stack-lg">
          <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
            A payment that clears a bank leaves a record
          </h2>
          <Rule weight="heavy" />
          <div>
            {LEDGER_ROWS.map((row, index) => (
              <LedgerRow
                key={row.id}
                progress={progress}
                index={index}
                total={LEDGER_ROWS.length}
                name={row.participantName}
                community={row.community}
                amount={row.amount}
                at={row.queuedAt}
              />
            ))}
          </div>
          <p className="prose-muted">
            Each row is one household, one amount and the second the transfer
            settled. The record is the transfer, not a claim about it.
          </p>
        </div>
      )}
    </Movement>
  );
}

/* Movement 4, The stamp lands. Impact, then the ink setting. */
function Stamps() {
  const rows = LEDGER_ROWS.slice(0, 4);
  return (
    <Movement name="stamp">
      {(progress) => (
        <div className="stack-lg">
          <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
            The bank confirms it, and the ink sets
          </h2>
          <Rule weight="heavy" />
          <div>
            {rows.map((row, index) => (
              <LedgerRow
                key={row.id}
                progress={progress}
                index={index}
                total={rows.length}
                name={row.participantName}
                community={row.community}
                amount={row.amount}
                at={row.queuedAt}
                stampedFrom={0.42 + index * 0.08}
                recordId={row.id}
              />
            ))}
          </div>
          <p className="prose-muted">
            A settlement carries the bank&rsquo;s own session reference. It is
            the fact the rest of the record is computed from.
          </p>
        </div>
      )}
    </Movement>
  );
}

/* Movement 5, The period seals. Nothing is removed, and the motion says so. */
function Seal() {
  return (
    <Movement name="seal">
      {(progress) => <SealBody progress={progress} />}
    </Movement>
  );
}

function SealBody({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  /* Under reduced motion the period renders already sealed, which is its
     resting state. */
  const [sealed, setSealed] = useState(reduced === true);
  const scaleX = useReveal(progress, [0.3, 0.55], [0, 1]);

  useMotionValueEvent(progress, "change", (value) => {
    setSealed(reduced === true || value >= 0.58);
  });

  return (
    <div className="stack-lg">
      <div className="sealed-above" data-sealed={sealed ? "true" : "false"}>
        <div className="stack">
          <p className="eyebrow">Period {CLOSED_PERIOD.period}</p>
          <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
            The period closes and the figures stop moving
          </h2>
          <p className="record-cell">
            {formatCoverage(CLOSED_PERIOD.paid, CLOSED_PERIOD.enrolled)} households
            paid · {formatNaira(CLOSED_PERIOD.amountToHouseholds)} received ·{" "}
            {formatNaira(CLOSED_PERIOD.shortfall)} short of the commitment
          </p>
        </div>
      </div>
      <motion.hr
        className="rule-heavy"
        style={{ scaleX, transformOrigin: "left" }}
      />
      <p className="prose-muted">
        Once the rule is drawn, no transfer can be added to this period and no
        figure in it can be edited. A correction is a new record in the period
        it was found, and both remain readable.
      </p>
    </div>
  );
}

/* Movement 6, The record goes public. */
function PublicRecord() {
  return (
    <Movement name="record">
      {(progress) => <PublicRecordBody progress={progress} />}
    </Movement>
  );
}

function PublicRecordBody({ progress }: { progress: MotionValue<number> }) {
  const hashRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const reduced = useReducedMotion();
  const shown = truncateHash(ATTESTATION.hash);
  const rowOpacity = useReveal(progress, [0.45, 0.62], [0, 1]);
  const rowY = useReveal(progress, [0.45, 0.62], [12, 0]);

  useMotionValueEvent(progress, "change", (value) => {
    if (value < 0.28 || started.current || reduced) {
      return;
    }
    started.current = true;
    hashResolve(shown, (next) => {
      if (hashRef.current) {
        hashRef.current.textContent = next;
      }
    });
  });

  return (
    <div className="stack-lg">
      <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
        The record goes on a register anyone can read
      </h2>
      <p className="hash">
        <span ref={hashRef}>{shown}</span>
      </p>
      <Registered>
        <motion.div style={{ opacity: rowOpacity, y: rowY }}>
          <div className="register-row register-row-sealed">
            <span className="record-cell">{PROJECT.name}</span>
            <span className="record-cell">{CLOSED_PERIOD.period}</span>
            <span className="record-cell numeric">
              {formatCoverage(CLOSED_PERIOD.paid, CLOSED_PERIOD.enrolled)} ·{" "}
              {coveragePercent(CLOSED_PERIOD.paid, CLOSED_PERIOD.enrolled)}%
            </span>
            <Stamp state="sealed" label="Anchored" recordId={ATTESTATION.id} />
          </div>
          <div className="register-row">
            <span className="record-cell">Hadejia-Nguru Wetland Restoration</span>
            <span className="record-cell">2026-Q3</span>
            <span className="record-cell numeric">846 of 846 · 100%</span>
            <Stamp state="sealed" label="Anchored" recordId="att_hadejia_2026q3" />
          </div>
          <div className="register-row">
            <span className="record-cell">Akassa Mangrove Carbon Project</span>
            <span className="record-cell">2026-Q3</span>
            <span className="record-cell numeric">1,205 of 1,402 · 86%</span>
            <Stamp state="sealed" label="Anchored" recordId="att_delta_2026q3" />
          </div>
        </motion.div>
      </Registered>
      <p className="prose-muted">
        The figures are computed from transfers that cleared the bank, hashed,
        chained to the period before them and anchored. Nobody, including us,
        can write one after the fact.
      </p>
      <div>
        <ButtonLink href="/register">Open the register</ButtonLink>
      </div>
    </div>
  );
}

function Sections() {
  return (
    <div className="measure section">
      <div className="landing-foot">
        <div className="stack">
          <p className="eyebrow">If you run a carbon project</p>
          <Rule weight="contrast" />
          <p className="prose-muted">
            Register the project against its registry record, enrol households
            with a named agent, fund a period and close it. The commitment comes
            from your own project design document, quoted with its page number.
            What the register publishes is what the bank settled.
          </p>
        </div>
        <div className="stack">
          <p className="eyebrow">If you assess or buy from carbon projects</p>
          <Rule weight="contrast" />
          <p className="prose-muted">
            Follow a project and read its periods: households enrolled,
            households paid, what each period required and what it fell short
            by, confirmation rates, disputes and their resolution basis. Verify
            a period against its hash, or one transfer against its proof,
            without seeing anything else.
          </p>
        </div>
      </div>
    </div>
  );
}

function Foot() {
  return (
    <footer className="measure section-tight">
      <Rule weight="heavy" />
      <div className="row-between" style={{ paddingBlockStart: "var(--stack)" }}>
        <p className="eyebrow">
          Attest · a settlement record for carbon project payments
        </p>
        <p className="eyebrow">Lagos · 2026</p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="landing">
      <Masthead />
      <Stillness />
      <Figures />
      <Ledger />
      <Stamps />
      <Seal />
      <PublicRecord />
      <Sections />
      <Foot />
    </div>
  );
}
