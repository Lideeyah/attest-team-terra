"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { ERROR_CODES, type ErrorCode } from "@/lib/api/contract";
import {
  configureStream,
  forceCode,
  readForcedState,
  readStreamConfig,
  setProjectStatus,
  setRegisterSize,
  setRosterSize,
  type Forced,
} from "./devControl";
import { STATE_INDEX } from "./stateIndex";

/* The state control panel. Every error state in every phase is reachable from
   here by clicking rather than by editing a fixture. It is copied into the
   build only when ATTEST_DEV_TOOLS is set. */

const GROUPS: { title: string; codes: ErrorCode[] }[] = [
  {
    title: "Request and access",
    codes: ["FORBIDDEN", "RATE_LIMITED", "INVALID_REQUEST", "NOT_FOUND", "DUPLICATE_REQUEST"],
  },
  {
    title: "Enrolment and identity",
    codes: [
      "IDENTITY_DUPLICATE", "BVN_MISMATCH", "IDENTITY_UNREACHABLE", "NAME_MISMATCH",
      "NAME_ENQUIRY_EXPIRED", "NAME_ENQUIRY_MISMATCH", "BOUNDARY_OUTSIDE",
      "GPS_UNAVAILABLE", "CONSENT_MISSING", "DEVICE_UNBOUND",
    ],
  },
  {
    title: "Registry and extraction",
    codes: [
      "REGISTRY_NOT_FOUND", "REGISTRY_UNREACHABLE", "PDD_UNREADABLE",
      "PDD_NO_COMMITMENT", "EXTRACTION_LOW_CONFIDENCE", "MODEL_UNAVAILABLE",
    ],
  },
  {
    title: "Runs, funding and transfers",
    codes: [
      "ROSTER_EMPTY", "PERIOD_CLOSED", "FUNDING_NOT_RECEIVED", "FUNDING_INSUFFICIENT",
      "FUNDING_EXCLUDES_CHARGES", "PREFLIGHT_EXCLUSIONS_REQUIRED", "ACCOUNT_NOT_FOUND",
      "ACCOUNT_DORMANT", "ACCOUNT_RESTRICTED", "BENEFICIARY_FROZEN", "INSUFFICIENT_FUNDS",
      "LIMIT_EXCEEDED", "BANK_UNAVAILABLE", "TIMEOUT", "TRANSFER_REVERSED",
    ],
  },
  {
    title: "Attestation and verification",
    codes: ["ANCHOR_PENDING", "ANCHOR_UNREACHABLE", "CHAIN_DISCONTINUITY", "PROOF_INVALID", "LEAF_NOT_IN_ROOT"],
  },
  {
    title: "Participant channel and the record",
    codes: [
      "TOKEN_EXPIRED", "ALREADY_CONFIRMED", "DISPUTE_ALREADY_OPEN",
      "DISPUTE_RESOLUTION_BASIS_REQUIRED", "RECONCILIATION_MISMATCH",
      "PARTICIPANT_DELETE_NOT_PERMITTED",
    ],
  },
];

export function DevStates() {
  const [forced, setForced] = useState<Forced>({ code: null, pathFragment: null, once: false });
  const [fragment, setFragment] = useState("");
  const [once, setOnce] = useState("false");
  const [rate, setRate] = useState("40");
  const [failureShare, setFailureShare] = useState("0.12");
  const [reversalShare, setReversalShare] = useState("0.03");
  const [streamState, setStreamState] = useState(
    "40 transfers per second · failure share 0.12 · reversal share 0.03",
  );

  useEffect(() => {
    let cancelled = false;
    void readForcedState().then((state) => {
      if (!cancelled) {
        setForced(state);
      }
    });
    void readStreamConfig().then((config) => {
      if (cancelled) {
        return;
      }
      setRate(String(config.rate));
      setFailureShare(String(config.failureShare));
      setReversalShare(String(config.reversalShare));
      setStreamState(
        `${config.rate} transfers per second · failure share ${config.failureShare} · reversal share ${config.reversalShare}`,
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const force = async (code: ErrorCode | null) => {
    setForced(await forceCode(code, fragment || null, once === "true"));
  };

  const applyStream = async () => {
    const config = await configureStream({
      rate: Number(rate),
      failureShare: Number(failureShare),
      reversalShare: Number(reversalShare),
    });
    setStreamState(
      `${config.rate} transfers per second · failure share ${config.failureShare} · reversal share ${config.reversalShare}`,
    );
  };

  return (
    <div className="measure section-tight stack-lg">
      <div className="stack">
        <p className="eyebrow">Developer tooling · excluded from production builds</p>
        <h1 className="h2-display">State control</h1>
        <p className="lede">
          Force any code in the contract on the next call. The screen under test
          then shows the state that code produces, without editing a fixture.
        </p>
        <Rule weight="heavy" />
      </div>

      <Notice title={forced.code ? "A code is forced" : "No code is forced"}>
        {forced.code ? (
          <span className="row">
            <Stamp state="blocked" label={forced.code} recordId={forced.code} />
            <span>
              {forced.pathFragment
                ? `on paths containing ${forced.pathFragment}`
                : "on every call"}
              {forced.once ? ", once" : ""}
            </span>
          </span>
        ) : (
          "Calls return their fixtures."
        )}
      </Notice>

      <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="Restrict to paths containing" note="Leave empty to force every call">
          {(id) => (
            <Input
              id={id}
              value={fragment}
              placeholder="/api/runs"
              onChange={(event) => setFragment(event.target.value)}
            />
          )}
        </Field>
        <Field label="Clear after one call">
          {(id) => (
            <Select
              id={id}
              value={once}
              onChange={(event) => setOnce(event.target.value)}
              options={[
                { value: "false", label: "No, keep forcing" },
                { value: "true", label: "Yes, once" },
              ]}
            />
          )}
        </Field>
        <Button variant="outline" onClick={() => void force(null)}>
          Clear
        </Button>
      </div>

      {GROUPS.map((group) => (
        <div className="stack" key={group.title}>
          <p className="eyebrow">{group.title}</p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {group.codes.map((code) => (
              <Button
                key={code}
                small
                variant={forced.code === code ? "solid" : "outline"}
                onClick={() => void force(code)}
              >
                {code}
              </Button>
            ))}
          </div>
        </div>
      ))}

      <div className="stack">
        <p className="eyebrow">Run stream</p>
        <Rule weight="contrast" />
        <p className="prose-muted">
          The mock stream emits transfer.queued, transfer.in_flight,
          transfer.settled, transfer.failed, transfer.reversed and run.complete.
          A reversal after settlement is the sandbox behaviour the live run
          screen has to handle without rewriting history. A forced code above
          fails the stream itself, so the disconnected state is reachable too.
        </p>
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Transfers per second" note="Each transfer emits three events">
            {(id) => (
              <Input
                id={id}
                value={rate}
                inputMode="numeric"
                onChange={(event) => setRate(event.target.value)}
              />
            )}
          </Field>
          <Field label="Failure share">
            {(id) => (
              <Input
                id={id}
                value={failureShare}
                inputMode="decimal"
                onChange={(event) => setFailureShare(event.target.value)}
              />
            )}
          </Field>
          <Field label="Reversal share" note="Settles, then reverses">
            {(id) => (
              <Input
                id={id}
                value={reversalShare}
                inputMode="decimal"
                onChange={(event) => setReversalShare(event.target.value)}
              />
            )}
          </Field>
          <Button variant="outline" onClick={() => void applyStream()}>
            Apply
          </Button>
        </div>
        <p className="record-cell">{streamState}</p>
      </div>

      <div className="stack">
        <p className="eyebrow">Fixture controls</p>
        <Rule weight="contrast" />
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Button small variant="outline" onClick={() => void setRegisterSize(0)}>
            Register: empty
          </Button>
          <Button small variant="outline" onClick={() => void setRegisterSize(500)}>
            Register: 500 projects
          </Button>
          <Button small variant="outline" onClick={() => void setRegisterSize(null)}>
            Register: seeded
          </Button>
          <Button small variant="outline" onClick={() => void setRosterSize("proj_ekuri", 10000)}>
            Roster: 10,000 rows
          </Button>
          <Button small variant="outline" onClick={() => void setRosterSize("proj_ekuri", null)}>
            Roster: seeded
          </Button>
          <Button small variant="outline" onClick={() => void setProjectStatus("proj_ekuri", "suspended")}>
            TGB demonstration: suspended
          </Button>
          <Button small variant="outline" onClick={() => void setProjectStatus("proj_ekuri", "withdrawn")}>
            TGB demonstration: withdrawn
          </Button>
          <Button small variant="outline" onClick={() => void setProjectStatus("proj_ekuri", null)}>
            TGB demonstration: active
          </Button>
        </div>
      </div>

      <div className="stack">
        <p className="eyebrow">Every state, by the screen it belongs to</p>
        <Rule weight="contrast" />
        <p className="prose-muted">
          Each line forces what it needs and opens the screen. This is the
          index the exit checklists mean by reachable from this panel.
        </p>
        {STATE_INDEX.map((surface) => (
          <div className="stack" key={surface.path} data-state-screen={surface.path}>
            <p className="record-cell">{surface.path}</p>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {surface.states.map((state) => (
                <Button
                  key={state.label}
                  small
                  variant="outline"
                  data-state-entry={`${surface.path} · ${state.label}`}
                  /* The href the entry opens, so the gate can check that
                     every state in this panel actually goes somewhere rather
                     than counting the buttons. */
                  data-state-href={state.href}
                  onClick={(event) => {
                    const button = event.currentTarget;
                    void (async () => {
                      try {
                        await state.arrange();
                      } catch (error) {
                        /* An arrangement that failed must not navigate: the
                           screen would open in whatever state was left over,
                           and the panel would have lied about what it shows.
                           The attribute is what the gate reads. */
                        button.setAttribute("data-arrange-error", String(error));
                        return;
                      }
                      window.location.href = state.href;
                    })();
                  }}
                >
                  {state.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="stack">
        <p className="eyebrow">Every code in the contract</p>
        <p className="record-cell">{ERROR_CODES.length} codes</p>
      </div>
    </div>
  );
}
