"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import type { MotionValue } from "motion/react";
import { ButtonLink } from "@/components/Button";
import { Lockup } from "@/components/Mark";
import { Registered } from "@/components/Registered";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import {
  Movement,
  motion,
  useArrivedCount,
  useCrossed,
  useNarrow,
  useReveal,
} from "@/components/landing/Movement";
import { FRAME_MS, PRIMITIVE_CLASS, hashResolve, tallyTo } from "@/lib/motion";
import {
  ATTESTATION,
  CLOSED_PERIOD,
  EVIDENCE,
  LEDGER_ROWS,
  PROJECT,
  REGISTER_ROWS,
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

   The sentence in Movement 1 is the placeholder the build instructions name.
   It is the one string on this page that is Lydia's to settle, and it is
   recorded in BUILD_LOG.md under manual review. */
const HERO_SENTENCE = "The money is promised, sometimes paid, and never provable.";

/* The four rows the composition follows from the ledger through the stamps to
   the seal. They are the same four rows throughout, so the period that closes
   is the one the reader watched being built. */
const FOLLOWED = LEDGER_ROWS.slice(0, 4);

function stagger(frames: number): CSSProperties {
  return { "--stagger": `${Math.round(frames * FRAME_MS)}ms` } as CSSProperties;
}

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
        <div className={`stack-lg ${PRIMITIVE_CLASS.recordArrive}`}>
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
  started,
  label,
  value,
  format,
  denominator,
  delayFrames,
}: {
  started: boolean;
  label: string;
  value: number;
  format: (input: number) => string;
  denominator: string;
  delayFrames: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const played = useRef(false);

  useEffect(() => {
    if (!started || played.current || reduced) {
      return;
    }
    played.current = true;
    const timer = window.setTimeout(
      () =>
        tallyTo(value, (count) => {
          if (ref.current) {
            ref.current.textContent = format(count);
          }
        }),
      delayFrames * FRAME_MS,
    );
    return () => window.clearTimeout(timer);
  }, [started, value, format, reduced, delayFrames]);

  return (
    <div className="figure-cell">
      <p className="eyebrow">{label}</p>
      <p className="figure-value">
        <span ref={ref}>{format(value)}</span>
      </p>
      <p className="figure-denominator">{denominator}</p>
    </div>
  );
}

/* Movement 2, The problem as a figure. tallyTo runs once, when the
   composition is in front of the reader. The number does the talking. */
function Figures() {
  return (
    <Movement name="figures">{(progress) => <FiguresBody progress={progress} />}</Movement>
  );
}

function FiguresBody({ progress }: { progress: MotionValue<number> }) {
  const started = useCrossed(progress, 0.42);
  const reduced = useReducedMotion();

  /* Before the tally runs the figures read zero, because the count is the
     point of the movement. A reader without JavaScript sees the real numbers,
     which is why the markup carries them. */
  const format = (input: number) => formatCount(Math.round(input));
  const percent = (input: number) => `${Math.round(input)}%`;

  return (
    <div className="stack-lg">
      <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
        One programme enrolled twenty-one thousand households
      </h2>
      <div className="figure-row" data-counting={started || reduced ? "true" : "false"}>
        <TallyFigure
          started={started}
          delayFrames={0}
          label="Households enrolled"
          value={EVIDENCE.enrolled}
          format={format}
          denominator="Enrolled in the benefit-sharing register"
        />
        <TallyFigure
          started={started}
          delayFrames={6}
          label="Households recorded as paid"
          value={EVIDENCE.paid}
          format={format}
          denominator={`of ${formatCount(EVIDENCE.enrolled)} enrolled`}
        />
        <TallyFigure
          started={started}
          delayFrames={12}
          label="Coverage"
          value={EVIDENCE.coveragePercent}
          format={percent}
          denominator={`${formatCount(EVIDENCE.paid)} of ${formatCount(EVIDENCE.enrolled)}`}
        />
      </div>
      <p className="prose-muted">
        The rest were promised the same share. Nobody can say from the outside
        whether they received it, because the money moved in cash and cash
        leaves no record anyone else can read.
      </p>
      <p className="eyebrow">{EVIDENCE.source}</p>
    </div>
  );
}

function LedgerRow({
  name,
  community,
  amount,
  at,
  arriving,
  frames,
  stamped,
  recordId,
  overflow,
}: {
  name: string;
  community: string;
  amount: string;
  at: string;
  /** A row that has just arrived plays recordArrive; one already on the page
      is simply there. */
  arriving?: boolean;
  frames?: number;
  stamped?: boolean;
  recordId?: string;
  overflow?: boolean;
}) {
  return (
    <div
      className={[
        "ledger-row",
        stamped === undefined ? null : "ledger-row-stamped",
        arriving ? PRIMITIVE_CLASS.recordArrive : null,
      ]
        .filter(Boolean)
        .join(" ")}
      style={arriving ? stagger(frames ?? 0) : undefined}
      data-overflow={overflow ? "true" : undefined}
    >
      <span className="record-cell">
        {name} · {community}
      </span>
      <span className="record-cell numeric">{formatNaira(amount)}</span>
      <span className="record-cell">{formatTimeOfDay(at)}</span>
      {stamped === undefined ? null : (
        <span style={{ minWidth: "9ch" }}>
          {stamped ? (
            <Stamp
              state="sealed"
              label="Settled"
              recordId={recordId ?? "trf"}
              animate
            />
          ) : null}
        </span>
      )}
    </div>
  );
}

/* Movement 3, The ledger builds. Scroll position drives the row count, so
   scrolling up removes rows and scrolling down adds them, one frame apart. */
function Ledger() {
  return (
    <Movement name="ledger">{(progress) => <LedgerBody progress={progress} />}</Movement>
  );
}

function LedgerBody({ progress }: { progress: MotionValue<number> }) {
  const narrow = useNarrow();
  const rows = narrow ? LEDGER_ROWS.slice(0, 4) : LEDGER_ROWS;
  const arrived = useArrivedCount(progress, rows.length, [0.12, 0.78]);

  return (
    <div className="stack-lg">
      <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
        A payment that clears a bank leaves a record
      </h2>
      <Rule weight="heavy" />
      <div>
        {rows.slice(0, arrived).map((row, index) => (
          <LedgerRow
            key={row.id}
            name={row.participantName}
            community={row.community}
            amount={row.amount}
            at={row.queuedAt}
            arriving
            frames={index % 4}
          />
        ))}
      </div>
      <p className="prose-muted">
        Each row is one household, one amount and the second the transfer
        settled. The record is the transfer, not a claim about it.
      </p>
    </div>
  );
}

/* Movement 4, The stamp lands. One row, then three more, staggered. Impact
   then ink, from the primitive itself. A stamp is not taken back on the way
   up, because nothing in this product can be. */
function Stamps() {
  return (
    <Movement name="stamp">{(progress) => <StampsBody progress={progress} />}</Movement>
  );
}

function StampsBody({ progress }: { progress: MotionValue<number> }) {
  const first = useCrossed(progress, 0.34);
  const rest = useCrossed(progress, 0.52);
  const narrow = useNarrow();
  const rows = narrow ? FOLLOWED.slice(0, 3) : FOLLOWED;

  return (
    <div className="stack-lg">
      <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
        The bank confirms it, and the ink sets
      </h2>
      <Rule weight="heavy" />
      <div>
        {rows.map((row, index) => (
          <LedgerRow
            key={row.id}
            name={row.participantName}
            community={row.community}
            amount={row.amount}
            at={row.queuedAt}
            stamped={index === 0 ? first : rest}
            recordId={row.id}
          />
        ))}
      </div>
      <p className="prose-muted">
        A settlement carries the bank&rsquo;s own session reference. It is the
        fact the rest of the record is computed from.
      </p>
    </div>
  );
}

/* Movement 5, The period seals. The heavy rule draws across and everything
   above it steps back one contrast level, without moving and without
   disappearing. The rows above the rule are the rows that were stamped. */
function Seal() {
  return <Movement name="seal">{(progress) => <SealBody progress={progress} />}</Movement>;
}

function SealBody({ progress }: { progress: MotionValue<number> }) {
  const drawing = useCrossed(progress, 0.3);
  const sealed = useCrossed(progress, 0.56);
  const narrow = useNarrow();
  const above = narrow ? FOLLOWED.slice(0, 2) : FOLLOWED;

  return (
    <div className="stack-lg">
      <div className="sealed-above" data-sealed={sealed ? "true" : "false"}>
        <div className="stack">
          <p className="eyebrow">Period {CLOSED_PERIOD.period}</p>
          <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
            The period closes and the figures stop moving
          </h2>
          <div>
            {above.map((row) => (
              <LedgerRow
                key={row.id}
                name={row.participantName}
                community={row.community}
                amount={row.amount}
                at={row.queuedAt}
                stamped={false}
                recordId={row.id}
              />
            ))}
          </div>
          <p className="record-cell">
            {formatCoverage(CLOSED_PERIOD.paid, CLOSED_PERIOD.enrolled)} households
            paid · {formatNaira(CLOSED_PERIOD.amountToHouseholds)} received ·{" "}
            {formatNaira(CLOSED_PERIOD.shortfall)} short of the commitment
          </p>
        </div>
      </div>
      <Rule weight="heavy" animated={drawing} key={drawing ? "drawn" : "undrawn"} />
      <div className="seal-layout">
        <p className="prose-muted">
          Once the rule is drawn, no transfer can be added to this period and no
          figure in it can be edited.
        </p>
        <p className="prose-muted">
          A correction is a new record in the period it was found, and both
          remain readable. Nothing above the rule is removed.
        </p>
      </div>
    </div>
  );
}

/* Movement 6, The record goes public. */
function PublicRecord() {
  return (
    <Movement name="record">{(progress) => <PublicRecordBody progress={progress} />}</Movement>
  );
}

function PublicRecordBody({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const arrived = useCrossed(progress, 0.26, { once: false });
  const opacity = useReveal(progress, [0.2, 0.34], [0, 1]);
  const rowOpacity = useReveal(progress, [0.42, 0.6], [0, 1]);
  const rowY = useReveal(progress, [0.42, 0.6], [12, 0]);

  return (
    <div className="stack-lg">
      <h2 className="h2-display h2-display-ink" style={{ maxWidth: "20ch" }}>
        The record goes on a register anyone can read
      </h2>
      <motion.p className="hash" style={{ opacity }}>
        <ResolvingHash value={ATTESTATION.hash} started={arrived} reduced={reduced === true} />
      </motion.p>
      <Registered>
        <motion.div style={{ opacity: rowOpacity, y: rowY }}>
          {REGISTER_ROWS.map((row) => (
            <div
              key={row.id}
              className={
                row.id === PROJECT.id ? "register-row register-row-sealed" : "register-row"
              }
            >
              <span className="record-cell">{row.name}</span>
              <span className="record-cell">{row.period}</span>
              <span className="record-cell numeric">
                {formatCoverage(row.paid, row.enrolled)} ·{" "}
                {coveragePercent(row.paid, row.enrolled)}%
              </span>
              <Stamp state="sealed" label="Anchored" recordId={row.attestationId} />
            </div>
          ))}
        </motion.div>
      </Registered>
      <p className="prose-muted">
        The figures are computed from transfers that cleared the bank, hashed,
        chained to the period before them and anchored. Nobody, including us,
        can write one after the fact.
      </p>
      <div>
        <ButtonLink href="/register" prefetch={false}>
          Open the register
        </ButtonLink>
      </div>
    </div>
  );
}

/** hashResolve, played when the record arrives rather than on load, so the
    value the reader watches compute is not one they have already been shown. */
function ResolvingHash({
  value,
  started,
  reduced,
}: {
  value: string;
  started: boolean;
  reduced: boolean;
}) {
  const shown = truncateHash(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!started || reduced) {
      return;
    }
    return hashResolve(shown, (next) => {
      if (ref.current) {
        ref.current.textContent = next;
      }
    });
  }, [started, shown, reduced]);

  return (
    <span ref={ref} data-resolving={started && !reduced ? "true" : "false"}>
      {shown}
    </span>
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
