"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { Participant } from "@/lib/api/contract";
import { ROSTER_COPY, WALLET_STATE_LABEL } from "@/lib/copy/console";
import { formatCount, formatDate, orUnknown } from "@/lib/record";

const PAGE = 100;
const OVERSCAN = 8;

type Query = {
  status?: string;
  agent?: string;
  tier?: string;
  flagged?: string;
  wallet?: string;
  enrolled_from?: string;
  q?: string;
};

type RosterTableProps = {
  projectId: string;
  total: number;
  /** The first page, rendered on the server so the table is readable before
      hydration and a reader without JavaScript still sees rows. */
  first: Participant[];
  query: Query;
};

/** The roster at production scale. The window holds the rows the viewport can
    see plus an overscan; the rest of the roster is a height, and the pages
    behind it are fetched as the window reaches them. Ten thousand rows is the
    requirement, so nothing here renders ten thousand nodes. */
export function RosterTable({ projectId, total, first, query }: RosterTableProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(44);
  const [viewport, setViewport] = useState(620);
  const [scrollTop, setScrollTop] = useState(0);
  const [rows, setRows] = useState<Map<number, Participant>>(() => {
    const seeded = new Map<number, Participant>();
    first.forEach((participant, index) => seeded.set(index, participant));
    return seeded;
  });
  const requested = useRef<Set<number>>(new Set([1]));

  /* The row height is a token. Reading it keeps one value in one place
     rather than a number here and a rule in the stylesheet. */
  useEffect(() => {
    const node = scroller.current;
    if (!node) {
      return;
    }
    const styles = getComputedStyle(node);
    const height = Number.parseFloat(styles.getPropertyValue("--row-height"));
    if (Number.isFinite(height) && height > 0) {
      setRowHeight(height);
    }
    const measure = () => setViewport(node.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* The filter as one string, so the paging effect runs when the filter
     changes rather than on every render. */
  const queryKey = JSON.stringify(query);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const end = Math.min(total, Math.ceil((scrollTop + viewport) / rowHeight) + OVERSCAN);

  /* The pages the window needs, fetched as it reaches them. A page already
     asked for is never asked again, and every state change happens in the
     fetch's own callback rather than in the effect's body. */
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
      void api
        .participants(projectId, {
          ...(JSON.parse(queryKey) as Query),
          page: asked,
          per_page: PAGE,
        })
        .then((result) => {
          if (!result.ok) {
            requested.current.delete(asked);
            return;
          }
          if (!live) {
            return;
          }
          setRows((previous) => {
            const next = new Map(previous);
            result.data.forEach((participant, offset) => {
              next.set((asked - 1) * PAGE + offset, participant);
            });
            return next;
          });
        });
    }

    return () => {
      live = false;
    };
  }, [start, end, projectId, queryKey]);

  const visible = useMemo(() => {
    const items: { index: number; participant: Participant | null }[] = [];
    for (let index = start; index < end; index += 1) {
      items.push({ index, participant: rows.get(index) ?? null });
    }
    return items;
  }, [start, end, rows]);

  return (
    <div className="stack">
      <p className="record-cell" data-row-count={total}>
        {ROSTER_COPY.denominator(Math.min(total, end), total)}
      </p>
      <div className="table-scroll" role="region" aria-label="Household participants columns" tabIndex={0}>
      <div className="roster-table-grid">
      <div className="roster-head" aria-hidden="true">
        <span>Household</span>
        <span>Phone</span>
        <span>Wallet</span>
        <span>Tier</span>
        <span>Enrolled</span>
        <span>Agent</span>
        <span>Flags</span>
      </div>
      <div
        className="roster-scroll"
        data-roster-scroll="true"
        ref={scroller}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        role="grid"
        aria-rowcount={total}
        aria-label={`Roster, ${formatCount(total)} households`}
        tabIndex={0}
      >
        <div className="roster-track" style={{ height: `${total * rowHeight}px` }}>
          <div
            className="roster-window"
            style={{ transform: `translateY(${start * rowHeight}px)` }}
          >
            {visible.map(({ index, participant }) => (
              <div
                key={index}
                className="roster-row"
                data-roster-row={index + 1}
                data-status={participant?.status ?? "loading"}
                role="row"
                aria-rowindex={index + 1}
                style={{ height: `${rowHeight}px` }}
              >
                {participant === null ? (
                  <span className="record-cell ink-dim" role="gridcell">
                    Reading row {formatCount(index + 1)}
                  </span>
                ) : (
                  <>
                    <span role="gridcell">
                      <Link
                        href={`/app/roster/${participant.id}`}
                        className="roster-name"
                        prefetch={false}
                      >
                        {participant.name}
                      </Link>
                    </span>
                    <span className="record-cell" role="gridcell">
                      {participant.phoneMasked}
                    </span>
                    <span className="record-cell" role="gridcell">
                      {WALLET_STATE_LABEL[participant.walletState] ?? participant.walletState}
                    </span>
                    <span className="record-cell" role="gridcell">
                      Tier {participant.tier}
                    </span>
                    <span className="record-cell" role="gridcell">
                      {formatDate(participant.enrolledAt)}
                    </span>
                    <span className="record-cell" role="gridcell">
                      {participant.agentName}
                    </span>
                    <span className="record-cell" role="gridcell">
                      {orUnknown(participant.flags.join(", "))}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      </div>
      <p className="note">{ROSTER_COPY.noDeletion}</p>
    </div>
  );
}
