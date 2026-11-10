"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api, newIdempotencyKey } from "@/lib/api/client";
import type { ErrorCode, Run, Transfer, TransferState } from "@/lib/api/contract";
import { FAILURE_COPY, RUN_COPY } from "@/lib/copy/console";
import { headingFor } from "@/lib/copy/codes";
import { settledOf } from "@/lib/console-format";
import { PRIMITIVE_CLASS } from "@/lib/motion";
import { formatCount, formatNaira, formatSettlement, orUnknown } from "@/lib/record";

const PAGE = 50;
const OVERSCAN = 6;
const RECONNECT_MS = 1000;

type Connection = "connecting" | "open" | "reconnecting";

type LiveRunProps = {
  run: Run;
  /** The first page, rendered on the server so the table reads before the
      stream has said anything. */
  first: Transfer[];
};

const STATE_LABEL: Record<TransferState, string> = {
  queued: "Queued",
  in_flight: "In flight",
  settled: "Settled",
  failed: "Failed",
  reversed: "Reversed",
  unconfirmed: "Settled, unconfirmed",
};

const STREAMED_STATES: TransferState[] = [
  "queued",
  "in_flight",
  "settled",
  "failed",
  "reversed",
];

type Patches = {
  /** The state each transfer is in, as the stream has reported it. */
  state: Map<string, TransferState>;
  /** The transfers that settled while this screen was watching, and when, so
      the stamp lands once and then is simply a stamp. A row that was already
      settled when the page opened did not just happen, and a row that settled
      a minute ago is not still landing. */
  landed: Map<string, number>;
};

/* The stamp's two beats, in milliseconds: eight frames of impact and eight of
   the ink setting, at the system's 24fps. */
const STAMP_MS = Math.round((16 / 24) * 1000);

/* The live run. The stream carries a transfer id and its new state and
   nothing else, so this screen patches its own table rather than replacing
   it: a dropped connection loses no row, and reconnecting resumes patching
   the same rows.

   Five hundred transfers arriving in a few seconds cannot each be a render.
   Events land in a buffer and one animation frame merges them, so the table
   re-renders at most once a frame, and it renders only the rows the viewport
   can see. */
export function LiveRun({ run, first }: LiveRunProps) {
  const [rows, setRows] = useState<Map<number, Transfer>>(() => {
    const seeded = new Map<number, Transfer>();
    first.forEach((transfer, index) => seeded.set(index, transfer));
    return seeded;
  });
  const [patches, setPatches] = useState<Patches>(() => ({
    state: new Map(),
    landed: new Map(),
  }));
  const [connection, setConnection] = useState<Connection>("connecting");
  const [complete, setComplete] = useState(run.state === "complete");
  const [retrying, setRetrying] = useState<ErrorCode | null>(null);
  const [retried, setRetried] = useState<{ failureClass: ErrorCode; count: number } | null>(
    null,
  );

  const requested = useRef<Set<number>>(new Set([1]));
  const scroller = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(44);
  const [viewport, setViewport] = useState(620);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const node = scroller.current;
    if (!node) {
      return;
    }
    const height = Number.parseFloat(
      getComputedStyle(node).getPropertyValue("--row-height"),
    );
    const measure = () => {
      if (Number.isFinite(height) && height > 0) {
        setRowHeight(height);
      }
      setViewport(node.clientHeight);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* The stream. Its own failure is the transport's, so the screen says it is
     reconnecting and keeps every row it has. */
  useEffect(() => {
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let frame: number | null = null;
    let closed = false;
    const buffer = new Map<string, TransferState>();

    const flush = () => {
      frame = null;
      if (buffer.size === 0) {
        return;
      }
      const batch = [...buffer.entries()];
      buffer.clear();
      const now = performance.now();
      setPatches((previous) => {
        const state = new Map(previous.state);
        const landed = new Map(previous.landed);
        /* A stamp that has finished landing is dropped, so it is not replayed
           when the row is recycled by the virtualised window. */
        for (const [id, at] of landed) {
          if (now - at > STAMP_MS) {
            landed.delete(id);
          }
        }
        for (const [id, next] of batch) {
          if (next === "settled" && state.get(id) !== "settled") {
            landed.set(id, now);
          }
          state.set(id, next);
        }
        return { state, landed };
      });
    };

    const schedule = () => {
      if (frame === null) {
        frame = requestAnimationFrame(flush);
      }
    };

    const open = () => {
      if (closed) {
        return;
      }
      const stream = new EventSource(api.streamUrl(run.id));
      source = stream;
      stream.onopen = () => setConnection("open");
      for (const state of STREAMED_STATES) {
        stream.addEventListener(`transfer.${state}`, (event) => {
          const data = JSON.parse((event as MessageEvent).data) as { id?: string };
          if (typeof data.id !== "string") {
            return;
          }
          buffer.set(data.id, state);
          schedule();
        });
      }
      stream.addEventListener("run.complete", () => {
        stream.close();
        setComplete(true);
      });
      stream.onerror = () => {
        stream.close();
        if (closed) {
          return;
        }
        setConnection("reconnecting");
        timer = setTimeout(open, RECONNECT_MS);
      };
    };

    open();
    return () => {
      closed = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      source?.close();
    };
  }, [run.id]);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const end = Math.min(
    run.rosterSize,
    Math.ceil((scrollTop + viewport) / rowHeight) + OVERSCAN,
  );

  /* The pages the window needs. Each is asked for once, and the rows land in
     the fetch's own callback. */
  useEffect(() => {
    const firstPage = Math.floor(start / PAGE) + 1;
    const lastPage = Math.floor(Math.max(0, end - 1) / PAGE) + 1;
    let live = true;

    for (let page = firstPage; page <= lastPage; page += 1) {
      if (requested.current.has(page)) {
        continue;
      }
      requested.current.add(page);
      const asked = page;
      void api.transfers(run.id, { page: asked, per_page: PAGE }).then((result) => {
        if (!result.ok) {
          requested.current.delete(asked);
          return;
        }
        if (!live) {
          return;
        }
        setRows((previous) => {
          const next = new Map(previous);
          result.data.forEach((transfer, offset) => {
            next.set((asked - 1) * PAGE + offset, transfer);
          });
          return next;
        });
      });
    }

    return () => {
      live = false;
    };
  }, [start, end, run.id]);

  const counts = useMemo(() => {
    const tally: Record<TransferState, number> = {
      queued: 0,
      in_flight: 0,
      settled: 0,
      failed: 0,
      reversed: 0,
      unconfirmed: 0,
    };
    for (const state of patches.state.values()) {
      tally[state] += 1;
    }
    return tally;
  }, [patches]);

  const streamed = patches.state.size;
  /* The run's own counts are the floor: a figure never goes backwards because
     this screen opened late. */
  const settled = Math.max(settledOf(run), counts.settled + counts.unconfirmed);
  const failed = Math.max(run.counts.failed, counts.failed);
  const inFlight = counts.in_flight;

  const visible = useMemo(() => {
    const items: { index: number; transfer: Transfer | null }[] = [];
    for (let index = start; index < end; index += 1) {
      items.push({ index, transfer: rows.get(index) ?? null });
    }
    return items;
  }, [start, end, rows]);

  async function retry(failureClass: ErrorCode): Promise<void> {
    setRetrying(failureClass);
    const result = await api.retry(run.id, { failureClass }, newIdempotencyKey());
    setRetrying(null);
    if (result.ok) {
      setRetried({ failureClass, count: result.data.retried });
    }
  }

  return (
    <div className="stack-lg">
      {connection === "reconnecting" ? (
        <Notice tone="review" title="The connection to the run dropped">
          <p data-stream="reconnecting">{RUN_COPY.streamDropped}</p>
        </Notice>
      ) : null}

      {complete ? (
        <Notice
          tone={failed > 0 ? "flagged" : undefined}
          title={
            failed > 0
              ? `The run is complete with ${formatCount(failed)} transfers outstanding`
              : "The run is complete"
          }
        >
          <p data-run-complete={failed > 0 ? "with-failures" : "clean"}>
            {failed > 0
              ? `${formatCount(settled)} of ${formatCount(run.rosterSize)} households were settled. The ${formatCount(failed)} that failed are listed by class below, each with its own remediation.`
              : `${formatCount(settled)} of ${formatCount(run.rosterSize)} households were settled and none failed.`}
          </p>
        </Notice>
      ) : null}

      <section className="stack" aria-label="Progress">
        <dl className="run-counts">
          <div className="run-count">
            <dt className="eyebrow">Settled</dt>
            <dd className="record-cell" data-count="settled">
              {formatCount(settled)} of {formatCount(run.rosterSize)}
            </dd>
          </div>
          <div className="run-count">
            <dt className="eyebrow">In flight</dt>
            <dd className="record-cell" data-count="in_flight">
              {formatCount(inFlight)} of {formatCount(run.rosterSize)}
            </dd>
          </div>
          <div className="run-count">
            <dt className="eyebrow">Failed</dt>
            <dd className="record-cell" data-count="failed">
              {formatCount(failed)} of {formatCount(run.rosterSize)}
            </dd>
          </div>
          <div className="run-count">
            <dt className="eyebrow">Received by this screen</dt>
            <dd className="record-cell" data-count="streamed">
              {formatCount(streamed)} of {formatCount(run.rosterSize)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="stack" aria-label="Failures by class">
        <h2 className="h3-display">Failures by class</h2>
        <Rule />
        {run.failures.length === 0 ? (
          <p className="prose">No transfer in this run has failed.</p>
        ) : (
          <ul className="stack">
            {run.failures.map((failure) => {
              const copy = FAILURE_COPY[failure.class];
              return (
                <li
                  key={failure.class}
                  className="failure-row"
                  data-failure-class={failure.class}
                >
                  <div className="stack-tight">
                    <p className="eyebrow">{formatCount(failure.count)} transfers</p>
                    <p className="h3-display">
                      {copy?.heading ?? headingFor(failure.class, "This class of failure")}
                    </p>
                    <p className="note">{copy?.remediation ?? ""}</p>
                  </div>
                  {copy?.retryable ? (
                    <Button
                      type="button"
                      variant="outline"
                      small
                      disabled={retrying !== null}
                      onClick={() => void retry(failure.class)}
                      data-retry={failure.class}
                    >
                      {retrying === failure.class ? "Retrying" : "Retry this class"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      small
                      disabled={retrying !== null}
                      onClick={() => void api.requery(run.id, {})}
                      data-requery={failure.class}
                    >
                      Requery this class
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {retried ? (
          <Notice title="Retry queued">
            <p>
              {formatCount(retried.count)} transfers in{" "}
              {FAILURE_COPY[retried.failureClass]?.heading ??
                headingFor(retried.failureClass, "that class")}{" "}
              were
              queued again. Nothing already settled was resent.
            </p>
          </Notice>
        ) : null}
        <p className="note">{RUN_COPY.requery}</p>
      </section>

      <section className="stack" aria-label="Transfers">
        <h2 className="h3-display">Transfers</h2>
        <Rule />
        <div className="transfer-head" aria-hidden="true">
          <span>Household</span>
          <span>Amount</span>
          <span>State</span>
          <span>Session</span>
          <span>Settled</span>
        </div>
        <div
          className="roster-scroll"
          data-transfer-scroll="true"
          ref={scroller}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          role="grid"
          aria-rowcount={run.rosterSize}
          aria-label={`Transfers, ${formatCount(run.rosterSize)} in this run`}
          tabIndex={0}
        >
          <div
            className="roster-track"
            style={{ height: `${run.rosterSize * rowHeight}px` }}
          >
            <div
              className="roster-window"
              style={{ transform: `translateY(${start * rowHeight}px)` }}
            >
              {visible.map(({ index, transfer }) => {
                if (transfer === null) {
                  return (
                    <div
                      key={index}
                      className="transfer-row"
                      data-transfer-row={index + 1}
                      data-state="loading"
                      role="row"
                      style={{ height: `${rowHeight}px` }}
                    >
                      <span className="record-cell ink-dim" role="gridcell">
                        Reading transfer {formatCount(index + 1)}
                      </span>
                    </div>
                  );
                }
                const state = patches.state.get(transfer.id) ?? transfer.state;
                const justLanded = state === "settled" && patches.landed.has(transfer.id);
                return (
                  <div
                    key={transfer.id}
                    className="transfer-row"
                    data-transfer-row={index + 1}
                    data-state={state}
                    role="row"
                    aria-rowindex={index + 1}
                    style={{ height: `${rowHeight}px` }}
                  >
                    <span className="record-cell" role="gridcell">
                      <Link href={`/app/roster/${transfer.participantId}`} prefetch={false}>
                        {transfer.participantId}
                      </Link>
                    </span>
                    <span className="record-cell" role="gridcell">
                      {formatNaira(transfer.amount)}
                    </span>
                    <span role="gridcell">
                      <span
                        className={[
                          "stamp",
                          state === "failed"
                            ? "stamp-blocked"
                            : state === "reversed"
                              ? "stamp-flagged"
                              : state === "settled"
                                ? "stamp-sealed"
                                : "stamp-review",
                          justLanded ? PRIMITIVE_CLASS.stampLandCentred : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        data-row-state={state}
                      >
                        {STATE_LABEL[state]}
                      </span>
                      {state === "in_flight" ? (
                        <span
                          className={`queue-underline ${PRIMITIVE_CLASS.queuePulse}`}
                          data-row-in-flight="true"
                        />
                      ) : null}
                    </span>
                    <span className="record-cell" role="gridcell">
                      {orUnknown(transfer.sessionId)}
                    </span>
                    <span className="record-cell" role="gridcell">
                      {transfer.settledAt ? formatSettlement(transfer.settledAt) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
