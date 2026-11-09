"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { Console } from "@/components/Console";
import { CoverageChart } from "@/components/CoverageChart";
import { Disclose } from "@/components/Disclose";
import { EmptyState } from "@/components/EmptyState";
import { Field, Input, Pick, Punch, Radio, Select, Textarea } from "@/components/Field";
import { Loading } from "@/components/Loading";
import { Figure } from "@/components/Figure";
import { Hash } from "@/components/Hash";
import { Lockup, Mark } from "@/components/Mark";
import { Modal } from "@/components/Modal";
import { Notice } from "@/components/Notice";
import { PeriodSeal } from "@/components/PeriodSeal";
import { RecordList } from "@/components/RecordList";
import { Registered } from "@/components/Registered";
import { Rule } from "@/components/Rule";
import { Sheet } from "@/components/Sheet";
import { Stamp, type StampState } from "@/components/Stamp";
import { Strip } from "@/components/Strip";
import { Table, type Column } from "@/components/Table";
import { Tabs } from "@/components/Tabs";
import { ToastProvider, useToast } from "@/components/Toast";
import {
  ATTESTATION,
  CLOSED_PERIOD,
  COMMITMENT_QUOTATION,
  COMMITMENT_SOURCE,
  COVERAGE_SERIES,
  OPEN_PERIOD,
  OPEN_RUN,
  PROJECT,
  SIGNAL_LINES,
  TRANSFERS,
} from "@/lib/sample";
import type { Transfer, TransferState as RecordState } from "@/lib/api/contract";
import {
  coveragePercent,
  formatCount,
  formatCoverage,
  formatNaira,
  formatNairaCompact,
  formatTimestamp,
} from "@/lib/record";

const COLOUR_GROUPS = [
  {
    group: "Canvas and surfaces",
    tokens: [
      "--canvas-paper",
      "--surface-elevated",
      "--surface-sunken",
      "--surface-reading",
    ],
  },
  {
    group: "Rules",
    tokens: ["--rule-hairline", "--rule-contrast", "--rule-heavy"],
  },
  { group: "Ink", tokens: ["--ink-primary", "--ink-muted", "--ink-dim"] },
  {
    group: "Bottle green",
    tokens: ["--bottle-deep", "--bottle-mid", "--bottle-muted", "--bottle-wash"],
  },
  {
    group: "Stamp, sealed",
    tokens: [
      "--stamp-sealed-ink",
      "--stamp-sealed-wash",
      "--stamp-sealed-border",
    ],
  },
  {
    group: "Stamp, flagged",
    tokens: [
      "--stamp-flagged-ink",
      "--stamp-flagged-wash",
      "--stamp-flagged-border",
    ],
  },
  {
    group: "Stamp, blocked",
    tokens: [
      "--stamp-blocked-ink",
      "--stamp-blocked-wash",
      "--stamp-blocked-border",
    ],
  },
  {
    group: "Stamp, review",
    tokens: [
      "--stamp-review-ink",
      "--stamp-review-wash",
      "--stamp-review-border",
    ],
  },
];

const TRANSFER_STAMP: Record<RecordState, { state: StampState; label: string }> = {
  settled: { state: "sealed", label: "Settled" },
  unconfirmed: { state: "flagged", label: "Unconfirmed" },
  failed: { state: "blocked", label: "Failed" },
  reversed: { state: "blocked", label: "Reversed" },
  queued: { state: "review", label: "Queued" },
  in_flight: { state: "review", label: "In flight" },
};

const STRIP_STATE: Record<RecordState, "flagged" | "blocked" | "review" | undefined> = {
  settled: undefined,
  unconfirmed: "flagged",
  failed: "blocked",
  reversed: "blocked",
  queued: "review",
  in_flight: "review",
};

function Section({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section-tight stack-lg">
      <div className="stack">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2-display">{title}</h2>
        {note ? <p className="lede">{note}</p> : null}
        <Rule weight="heavy" />
      </div>
      {children}
    </section>
  );
}

function ColourSheet() {
  return (
    <div
      className="grid-ruled"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
    >
      {COLOUR_GROUPS.flatMap((group) =>
        group.tokens.map((token) => (
          <div
            key={token}
            style={{ background: "var(--surface-reading)", padding: "var(--pad-cell-x)" }}
            className="stack"
          >
            <span
              style={{
                display: "block",
                height: "44px",
                background: `var(${token})`,
                border: "var(--hairline) solid var(--rule-hairline)",
              }}
            />
            <span className="eyebrow">{group.group}</span>
            <span className="record-cell">{token}</span>
          </div>
        )),
      )}
    </div>
  );
}

function TypeSheet() {
  return (
    <div className="stack-lg">
      <h1 className="h1-display">Coverage is computed, never typed</h1>
      <h2 className="h2-display">Period 2026-Q4 closes in nine days</h2>
      <h3 className="h3-display">Roster, 2,090 households</h3>
      <p className="lede">
        Attest is read beside a registry page and a bank statement, so it is
        built from the materials of that desk.
      </p>
      <p className="prose">
        The record states what fraction of enrolled households were paid and
        what fraction were not. It never states that a project is good,
        compliant or certified.
      </p>
      <p className="quotation">{COMMITMENT_QUOTATION}</p>
      <p className="eyebrow">{COMMITMENT_SOURCE}</p>
      <p className="record-cell">
        ₦23,050.00 · 000014261109142207104883 · 2026-11-09 14:22:07 WAT
      </p>
      <p className="console">
        graph.walk proj_ekuri_forest depth=2 · 412 nodes · 61ms
      </p>
    </div>
  );
}

function StampRow({ replayKey }: { replayKey: number }) {
  const stamps: { state: StampState; label: string; id: string }[] = [
    { state: "sealed", label: "Settled", id: "trf_8841" },
    { state: "flagged", label: "Shortfall", id: "run_0094" },
    { state: "blocked", label: "Duplicate identity", id: "ptc_41882" },
    { state: "review", label: "Under review", id: "sig_0231" },
  ];
  return (
    <div
      className="row"
      style={{ flexWrap: "wrap", gap: "var(--stack-lg)" }}
      data-component="stamp"
    >
      {stamps.map((stamp) => (
        <Stamp
          key={`${stamp.id}-${replayKey}`}
          state={stamp.state}
          label={stamp.label}
          recordId={stamp.id}
          animate
        />
      ))}
    </div>
  );
}

function FormSheet() {
  const [role, setRole] = useState("developer");
  return (
    <div
      className="stack-lg"
      style={{ maxWidth: "var(--sheet-width)" }}
    >
      <div data-component="input">
        <Field label="Registry ID" note="Plan Vivo, Verra, Gold Standard or Acorn">
          {(id) => <Input id={id} defaultValue="PV-NG-0417" />}
        </Field>
      </div>
      <div data-component="select">
        <Field label="Commitment basis" note="Read from the project design document">
          {(id) => (
            <Select
              id={id}
              defaultValue="net"
              options={[
                { value: "net", label: "Net revenue" },
                { value: "gross", label: "Gross revenue" },
              ]}
            />
          )}
        </Field>
      </div>
      <Field
        label="Declared gross revenue"
        error="Enter the issuance revenue for 2026-Q4. The commitment is computed from it."
      >
        {(id, invalid) => <Input id={id} invalid={invalid} placeholder="₦0.00" />}
      </Field>
      <div data-component="textarea">
      <Field label="Correction note" note="Logged against the extracted field">
        {(id) => (
          <Textarea
            id={id}
            defaultValue="Page 44 states sixty percent of net revenue. The extraction read gross."
          />
        )}
      </Field>
      </div>
      <div data-component="punch">
        <Punch label="Attach the source excerpt to the period attestation" defaultChecked />
      </div>
      <div data-component="radio" className="stack">
        <Radio name="basis" label="Net revenue" defaultChecked />
        <Radio name="basis" label="Gross revenue" />
      </div>
      <div data-component="input">
        <Field label="Registry of record" note="Set at onboarding and not editable here">
          {(id) => <Input id={id} defaultValue="Gold Standard" disabled />}
        </Field>
      </div>
      <div data-component="select">
        <Field
          label="Payment cadence"
          error="The cadence in the document is quarterly. Annual conflicts with the commitment on page 44."
        >
          {(id, invalid) => (
            <Select
              id={id}
              invalid={invalid}
              defaultValue="annual"
              options={[
                { value: "quarterly", label: "Quarterly" },
                { value: "annual", label: "Annual" },
              ]}
            />
          )}
        </Field>
      </div>
      <div data-component="textarea">
        <Field
          label="Exclusion reason"
          error="A reason is recorded against every exclusion before a run executes."
        >
          {(id, invalid) => (
            <Textarea id={id} invalid={invalid} placeholder="State the reason" />
          )}
        </Field>
      </div>
      <div data-component="textarea">
        <Field label="Closed period note" note="Not editable once the period is sealed">
          {(id) => (
            <Textarea
              id={id}
              disabled
              defaultValue="2026-Q3 closed on 1 October 2026 with 1,407 of 1,904 households paid."
            />
          )}
        </Field>
      </div>
      <div data-component="punch" className="stack">
        <Punch label="Notify households by SMS when the period closes" />
        <Punch label="Include the charges schedule in the attestation" disabled />
      </div>
      <div className="grid-ruled" data-component="pick">
        <Pick
          name="role"
          value="developer"
          title="I run a carbon project"
          body="Register the project, enrol households, fund a period and close it."
          selected={role === "developer"}
          onSelect={setRole}
        />
        <Pick
          name="role"
          value="institution"
          title="I assess or buy from carbon projects"
          body="Follow projects on a watchlist, read periods and export the record."
          selected={role === "institution"}
          onSelect={setRole}
        />
      </div>
    </div>
  );
}

function TransferTable() {
  const columns: Column<Transfer>[] = [
    {
      key: "participant",
      header: "Participant",
      cell: (row) => row.participantName,
    },
    {
      key: "community",
      header: "Community",
      sortable: true,
      sorted: "ascending",
      cell: (row) => row.community,
    },
    {
      key: "amount",
      header: "Amount",
      numeric: true,
      sortable: true,
      sorted: "descending",
      cell: (row) => formatNaira(row.amount),
    },
    {
      key: "session",
      header: "NIBSS session",
      cell: (row) => row.sessionId ?? "—",
    },
    {
      key: "settled",
      header: "Settled",
      cell: (row) => (row.settledAt ? formatTimestamp(row.settledAt) : "—"),
    },
    {
      key: "state",
      header: "State",
      cell: (row) => (
        <Stamp
          state={TRANSFER_STAMP[row.state].state}
          label={TRANSFER_STAMP[row.state].label}
          recordId={row.id}
        />
      ),
    },
  ];
  return (
    <div data-component="table">
    <Table
      caption="Transfers in period 2026-Q4 for the Ekuri Forest Initiative"
      columns={columns}
      rows={TRANSFERS}
      rowKey={(row) => row.id}
      activeRowKey={TRANSFERS[1]?.id}
    />
    </div>
  );
}

function Overlays() {
  const { post } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="row" style={{ flexWrap: "wrap" }}>
      <Button
        variant="outline"
        data-component="sheet"
        data-primitive="sheetIn"
        onClick={() => setSheetOpen(true)}
      >
        Open participant sheet
      </Button>
      <Button
        variant="outline"
        data-component="modal"
        onClick={() => setModalOpen(true)}
      >
        Open close-period modal
      </Button>
      <Button
        variant="quiet"
        data-component="toast"
        onClick={() => post("Export queued. It will appear in Downloads.")}
      >
        Post a toast
      </Button>

      <Sheet
        open={sheetOpen}
        title="Ngozi Eyo"
        onClose={() => setSheetOpen(false)}
      >
        <div className="stack-lg">
          <Stamp state="flagged" label="Unconfirmed" recordId="trf_8843" />
          <p className="prose-muted">
            The transfer settled at 14:22:58 WAT on 9 November 2026 and has not
            been confirmed by the participant. A reminder was sent by SMS on 10
            November.
          </p>
          <Hash value={ATTESTATION.hash} />
        </div>
      </Sheet>

      <Modal
        open={modalOpen}
        title="Close period 2026-Q4"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Keep the period open
            </Button>
            <Button onClick={() => setModalOpen(false)}>Close the period</Button>
          </>
        }
      >
        <div className="stack">
          <p className="prose">
            Commitment requires {formatNairaCompact(OPEN_PERIOD.required)}. You
            are funding {formatNairaCompact(OPEN_RUN.fundingAmount)}. Shortfall{" "}
            {formatNairaCompact(OPEN_PERIOD.shortfall)}, recorded in this
            period&rsquo;s attestation.
          </p>
          <p className="prose-muted">
            Closing computes coverage from transfers that cleared the bank,
            hashes the result, chains it to the previous period and anchors it.
            Nothing in a closed period can be edited.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function MotionSheet({
  replayKey,
  onReplay,
}: {
  replayKey: number;
  onReplay: () => void;
}) {
  return (
    <div className="stack-lg">
      <div className="row">
        <Button variant="outline" small onClick={onReplay}>
          Replay every primitive
        </Button>
        <p className="eyebrow">
          24fps cadence · press 3f · base 5f · screen 7f · stamp 8f · tally 22f
        </p>
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="recordArrive">recordArrive, staggered one frame</p>
        <div key={`arrive-${replayKey}`} className="panel">
          <RecordList items={TRANSFERS} itemKey={(row) => row.id}>
            {(row) => (
              <Strip
                state={STRIP_STATE[row.state]}
                inFlight={row.state === "queued"}
              >
                <span className="record-cell" style={{ flex: 1 }}>
                  {row.participantName}
                </span>
                <span className="record-cell numeric">
                  {formatNaira(row.amount)}
                </span>
                <Stamp
                  state={TRANSFER_STAMP[row.state].state}
                  label={TRANSFER_STAMP[row.state].label}
                  recordId={row.id}
                />
              </Strip>
            )}
          </RecordList>
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="stampLand">stampLand, impact then the ink setting</p>
        <StampRow replayKey={replayKey} />
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="ruleDraw">ruleDraw, three weights</p>
        <div key={`draw-${replayKey}`} className="stack" data-component="rule">
          <Rule weight="hairline" animated />
          <Rule weight="contrast" animated delayFrames={2} />
          <Rule weight="heavy" animated delayFrames={4} />
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="sealPeriod">sealPeriod, the composite that closes a period</p>
        <div key={`seal-${replayKey}`} className="panel">
          <div className="panel-body">
            <PeriodSeal
              sealOnMount
              consequence="Once sealed, no transfer can be added to 2026-Q4 and no figure in it can be edited. A correction becomes a new period."
            >
              <div className="stack">
                <h3 className="h3-display">Period 2026-Q4</h3>
                <p className="record-cell">
                  {formatCoverage(PROJECT.paid, PROJECT.enrolled)} households
                  paid · {formatNaira(OPEN_RUN.fundingAmount)} funded
                </p>
              </div>
            </PeriodSeal>
          </div>
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="tallyTo">tallyTo, once on first entry into view</p>
        <div
          key={`tally-${replayKey}`}
          data-component="figure"
          className="grid-ruled"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
        >
          <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
            <Figure
              label="Households enrolled"
              value={formatCount(PROJECT.enrolled)}
              denominator="Cross River, Akamkpa LGA"
              tally={PROJECT.enrolled}
            />
          </div>
          <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
            <Figure
              label="Households paid"
              value={formatCount(PROJECT.paid)}
              denominator={`${formatCoverage(PROJECT.paid, PROJECT.enrolled)} enrolled`}
              tally={PROJECT.paid}
            />
          </div>
          <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
            <Figure
              label="Coverage"
              value={`${coveragePercent(PROJECT.paid, PROJECT.enrolled)}`}
              unit="%"
              denominator={formatCoverage(PROJECT.paid, PROJECT.enrolled)}
            />
          </div>
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="hashResolve">hashResolve, on anchoring</p>
        <div key={`hash-${replayKey}`} data-component="hash">
          <Hash value={ATTESTATION.hash} resolve />
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="disclose">disclose, evidence behind the record</p>
        <Disclose
          summary="Commitment, 60 percent of net revenue"
          meta={COMMITMENT_SOURCE}
        >
          <div className="stack">
            <p className="quotation">{COMMITMENT_QUOTATION}</p>
            <p className="eyebrow">{COMMITMENT_SOURCE}</p>
          </div>
        </Disclose>
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="tick">tick, console lines entering the sunken bed</p>
        <div key={`tick-${replayKey}`}>
          <Console
            lines={SIGNAL_LINES}
            height={160}
            footer="Signals stream · 4 records · 61ms median latency"
          />
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow">
          stampLand on a centred, rotated stamp: the keyframes carry the full
          transform at every step
        </p>
        <div
          key={`centred-${replayKey}`}
          className="panel"
          style={{ position: "relative", height: "var(--section)" }}
        >
          <span
            data-stamp-centred
            className="stamp stamp-sealed anim-stamp-land-centred"
            style={
              {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-1.8deg)",
                "--stamp-rotate": "-1.8deg",
              } as React.CSSProperties
            }
          >
            <span aria-hidden="true" className="stamp-glyph">
              ■
            </span>
            Anchored
          </span>
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow">
          routeForward and routeBack, shared axis on navigation depth
        </p>
        <div className="row">
          <ButtonLink
            href="/dev/kitchen-sink/deeper"
            variant="outline"
            small
            data-primitive="routeForward"
          >
            Go deeper
          </ButtonLink>
          <ButtonLink href="/" variant="quiet" small data-primitive="routeBack">
            Go back
          </ButtonLink>
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow">The loading convention</p>
        <Loading rows={3} label="Loading the roster" />
      </div>

      <div className="stack">
        <p className="eyebrow" data-primitive="queuePulse">
          queuePulse, the one permitted loop, while a transfer is in flight
        </p>
        <Strip state="review" inFlight>
          <span className="record-cell" style={{ flex: 1 }}>
            {TRANSFERS[0]?.participantName} · {TRANSFERS[0]?.community}
          </span>
          <span className="record-cell numeric">{formatNaira(TRANSFERS[0]?.amount ?? "0.00")}</span>
          <Stamp state="review" label="In flight" recordId={TRANSFERS[0]?.id ?? "trf"} />
        </Strip>
      </div>
    </div>
  );
}

export function KitchenSink() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <ToastProvider>
      <header
        className="measure"
        style={{
          paddingBlock: "var(--stack-lg)",
          borderBottom: "var(--mark-border) solid var(--rule-heavy)",
        }}
      >
        <div className="row-between">
          <Lockup size={18} />
          <p className="eyebrow">Component and motion reference</p>
        </div>
      </header>

      <div className="measure">
        <Section
          eyebrow="Colour"
          title="Four roles and four status triplets"
          note="Paper, rule, ink and one accent. The status triplets sit outside the brand palette because they encode meaning rather than identity."
        >
          <ColourSheet />
        </Section>

        <Section
          eyebrow="Typography"
          title="Three faces, three fixed roles"
          note="Display carries the masthead level, editorial carries running prose, and the record face carries every figure, label and timestamp."
        >
          <TypeSheet />
        </Section>

        <Section
          eyebrow="The mark"
          title="A square sealed below the line"
          note="Drawn by geometry, never by an image file. The seal sits at 62 percent."
        >
          <div
            className="row"
            style={{ gap: "var(--section-tight)", flexWrap: "wrap" }}
            data-component="mark"
          >
            <Lockup size={28} />
            <Lockup size={20} orientation="stacked" />
            <Mark size={40} />
            <span
              className="row"
              style={{ background: "var(--bottle-deep)", padding: "var(--pad-panel)" }}
            >
              <Lockup size={20} reversed />
            </span>
          </div>
        </Section>

        <Section
          eyebrow="Buttons"
          title="Square corners and physical travel"
          note="One primary action per view. Press travel is 1.5px downward; disabled drops to 34 percent and loses the travel."
        >
          <div className="row" style={{ flexWrap: "wrap" }} data-component="button" data-primitive="pressTravel">
            <Button>Fund the period</Button>
            <Button variant="outline">Download the bundle</Button>
            <Button variant="quiet">Sign out</Button>
            <Button small>Retry transfer</Button>
            <Button variant="outline" small>
              Open run
            </Button>
            <Button disabled>Close the period</Button>
            <Button variant="outline" disabled>
              Download the bundle
            </Button>
            <Button variant="quiet" disabled>
              Sign out
            </Button>
            <ButtonLink href="/" variant="outline" small>
              Back to the landing page
            </ButtonLink>
          </div>
        </Section>

        <Section
          eyebrow="Status"
          title="Stamps, not sirens"
          note="Every state carries a glyph and an uppercase label, so nothing is signalled by colour alone. There is no success colour in the product."
        >
          <StampRow replayKey={replayKey} />
        </Section>

        <Section
          eyebrow="Forms"
          title="Record-face labels and a square punch"
          note="Labels are uppercase record face. The radio punch is the one circle in the system."
        >
          <FormSheet />
        </Section>

        <Section
          eyebrow="Record"
          title="A ruled table, never striped"
          note="Figures are right-aligned and tabular, so a column never jitters during a tally. The active row takes the five percent wash and a left edge."
        >
          <TransferTable />
        </Section>

        <Section
          eyebrow="Exceptions"
          title="Strips keep a table reading as a table"
          note="A 3px left edge carries the state while the row keeps its paper fill."
        >
          <div className="panel" data-component="strip">
            {TRANSFERS.map((row) => (
              <Strip
                key={row.id}
                state={STRIP_STATE[row.state]}
                inFlight={row.state === "queued"}
              >
                <span className="record-cell" style={{ flex: 1 }}>
                  {row.participantName} · {row.community}
                </span>
                <span className="record-cell numeric">
                  {formatNaira(row.amount)}
                </span>
                <Stamp
                  state={TRANSFER_STAMP[row.state].state}
                  label={TRANSFER_STAMP[row.state].label}
                  recordId={row.id}
                />
              </Strip>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Notices"
          title="A left edge and the arithmetic"
          note="A notice names the constraint and the figure, with the deadline attached."
        >
          <div className="stack" data-component="notice">
            <Notice title="Period 2026-Q4 closes on 31 December 2026">
              Nine days remain. Coverage is computed from transfers that cleared
              the bank, so a transfer initiated after the close falls into the
              next period.
            </Notice>
            <Notice tone="flagged" title="Shortfall">
              Commitment requires {formatNairaCompact(OPEN_PERIOD.required)}. You
              are funding {formatNairaCompact(OPEN_RUN.fundingAmount)}. Shortfall{" "}
              {formatNairaCompact(OPEN_PERIOD.shortfall)}, recorded in this
              period&rsquo;s attestation.
            </Notice>
            <Notice tone="blocked" title="Duplicate identity">
              Two enrolments carry the same bank verification number. Neither is
              payable until one is withdrawn by the enrolling agent.
            </Notice>
            <Notice tone="review" title="Signal under investigation">
              Four transfers from the 9 November run moved onward to one account
              within six minutes of settlement. Case 0231 is open with bank
              operations.
            </Notice>
          </div>
        </Section>

        <Section
          eyebrow="Sections"
          title="Index-card tabs break the rule line"
          note="The active tab joins the panel below it, the way a physical divider sits proud of the cards behind it."
        >
          <div data-component="tabs">
          <Tabs
            ariaLabel="Periods"
            items={[
              {
                id: "2026-q4",
                label: "2026-Q4, open",
                panel: (
                  <div className="stack">
                    <p className="record-cell">
                      {formatCoverage(PROJECT.paid, PROJECT.enrolled)} households
                      paid · {formatNaira(OPEN_RUN.fundingAmount)} funded ·{" "}
                      {formatNaira(OPEN_PERIOD.shortfall)} short
                    </p>
                    <p className="prose-muted">
                      The period is open, so every figure in it can still change.
                    </p>
                  </div>
                ),
              },
              {
                id: "2026-q3",
                label: "2026-Q3, sealed",
                panel: (
                  <div className="stack">
                    <Stamp state="sealed" label="Anchored" recordId={ATTESTATION.id} />
                    <Hash value={ATTESTATION.hash} />
                    <p className="prose-muted">
                      Sealed on 1 October 2026 and anchored to Hedera Consensus
                      Service. Nothing in it can be edited.
                    </p>
                  </div>
                ),
              },
              {
                id: "2026-q2",
                label: "2026-Q2, sealed",
                panel: (
                  <p className="record-cell">
                    {formatCoverage(
                      PROJECT.periods[1].paid,
                      PROJECT.periods[1].enrolled,
                    )}{" "}
                    households paid · coverage{" "}
                    {coveragePercent(
                      PROJECT.periods[1].paid,
                      PROJECT.periods[1].enrolled,
                    )}
                    %
                  </p>
                ),
              },
            ]}
          />
          </div>
        </Section>

        <Section
          eyebrow="Console"
          title="A sunken bed with latency and counts"
          note="Used for the account graph, the sync queue and the signals stream."
        >
          <div data-component="console">
            <Console
              lines={SIGNAL_LINES}
              height={200}
              footer="Signals stream · 4 records · 61ms median latency"
            />
          </div>
        </Section>

        <Section
          eyebrow="Charts"
          title="Rules and ink only"
          note="A coverage series is a bar chart in ink with hairline gridlines and a heavy baseline. Nothing is accented and nothing is gradient-filled."
        >
          <div data-component="chart">
            <CoverageChart
              bars={COVERAGE_SERIES}
              title="Coverage by period, households paid against households enrolled"
            />
          </div>
        </Section>

        <Section
          eyebrow="Documents"
          title="Crop marks on a document surface"
          note="Printer's crop marks go on the attestation sheet, the disclosure bundle and the receipt. Never on an interactive control."
        >
          <Registered>
            <div
              className="panel"
              style={{ padding: "var(--section-tight)" }}
              data-component="registered"
            >
              <div className="stack-lg">
                <p className="eyebrow">Attestation · {CLOSED_PERIOD.period}</p>
                <h3 className="h3-display">{PROJECT.name}</h3>
                <p className="record-cell">
                  {PROJECT.registry} {PROJECT.registryId} · {PROJECT.state},{" "}
                  {PROJECT.localGovernment} LGA
                </p>
                <Rule weight="hairline" />
                <p className="record-cell">
                  {formatCoverage(PROJECT.paid, PROJECT.enrolled)} households
                  paid · {formatNaira(OPEN_RUN.fundingAmount)} settled ·{" "}
                  {formatNaira(OPEN_PERIOD.required)} required
                </p>
                <Hash value={ATTESTATION.hash} full />
              </div>
            </div>
          </Registered>
        </Section>

        <Section
          eyebrow="Nothing here yet"
          title="Empty states state the absence"
          note="One line, one action if there is a real one. No illustration and no exclamation mark."
        >
          <div className="stack" data-component="empty-state">
            <EmptyState
              line="No disbursement run has been created for 2026-Q4. A run needs a roster and a funded account."
              action={<Button small>Create the run</Button>}
            />
            <EmptyState line="No dispute has been filed against this project." />
          </div>
        </Section>

        <Section
          eyebrow="Overlays"
          title="A sheet for detail, a modal for a decision"
          note="Both close on escape and on scrim click unless they hold unsaved input. A toast is never used for anything the reader must read."
        >
          <Overlays />
        </Section>

        <Section
          eyebrow="Motion"
          title="Every primitive, on a 24fps cadence"
          note="Motion expresses irreversibility. Records arrive and stack, stamps land and the ink sets, rules draw across and seal what sits above them."
        >
          <MotionSheet
            replayKey={replayKey}
            onReplay={() => setReplayKey((previous) => previous + 1)}
          />
        </Section>

        <footer className="section-tight">
          <Rule weight="heavy" />
          <p className="eyebrow" style={{ paddingBlockStart: "var(--stack)" }}>
            Attest · design system v1.0 · unlinked reference
          </p>
        </footer>
      </div>
    </ToastProvider>
  );
}
