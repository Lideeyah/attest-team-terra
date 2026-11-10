"use client";

import { useMemo, useRef, useState } from "react";
import { Rule } from "@/components/Rule";
import type { AccountGraph as Graph, GraphEdge, GraphNode } from "@/lib/api/contract";
import { GRAPH_COPY } from "@/lib/copy/ops";
import { formatCount, formatNaira } from "@/lib/record";

/* Where the money went after it landed, hop by hop.

   Hundreds of household wallets emptying into a few accounts inside two days
   is the signature of a developer paying itself through households that do
   not exist, and it is invisible from outside a bank. This is the only screen
   in the product that draws it: the public register and the verifier portal
   publish a count.

   Ink and rules on the sunken surface. The receiving accounts are the one
   thing carrying a colour, because they are the thing the drawing is about.

   The layout is computed once and deterministically rather than simulated
   every frame — an operator reading a graph needs it to hold still, and a
   simulation spends the frame budget on jitter. It is a scatter rather than a
   grid: four hundred wallets opened to move one payment do not arrive in rows,
   and a drawing that puts them in rows reads as a table of records.

   Panning writes a transform straight to the group, so a drag costs one style
   change and no React render. */

const WIDTH = 1200;
const HEIGHT = 760;

type Placed = GraphNode & { x: number; y: number };

/* A seeded value, so the same signal always draws the same picture: an
   operator who looks twice should see the same thing twice. */
function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function layout(graph: Graph): { placed: Map<string, Placed>; order: Placed[] } {
  const concentrators = graph.nodes.filter((node) => node.kind === "concentrator");
  const intermediaries = graph.nodes.filter((node) => node.kind === "intermediary");
  const households = graph.nodes.filter((node) => node.kind === "household");

  const placed = new Map<string, Placed>();
  const order: Placed[] = [];

  /* The receiving accounts sit on the right, which is where the money ends
     up, and the drawing reads left to right as the money moves. */
  concentrators.forEach((node, index) => {
    const entry = {
      ...node,
      x: WIDTH - 130,
      y: (HEIGHT / (concentrators.length + 1)) * (index + 1),
    };
    placed.set(node.id, entry);
    order.push(entry);
  });

  intermediaries.forEach((node, index) => {
    const entry = {
      ...node,
      x: WIDTH - 400,
      y: (HEIGHT / (intermediaries.length + 1)) * (index + 1),
    };
    placed.set(node.id, entry);
    order.push(entry);
  });

  /* The households scatter across the left two-thirds, each one's angle and
     distance its own, so the picture is a crowd converging rather than a
     lattice with lines attached. */
  households.forEach((node, index) => {
    const angle = seeded(index + 1) * Math.PI * 2;
    const radius = 60 + Math.sqrt(seeded(index + 7)) * 330;
    const entry = {
      ...node,
      x: 390 + Math.cos(angle) * radius * 0.92,
      y: HEIGHT / 2 + Math.sin(angle) * radius * 0.52,
    };
    placed.set(node.id, entry);
    order.push(entry);
  });

  return { placed, order };
}

function minutes(value: number): string {
  if (value < 60) {
    return value === 1 ? "1 minute" : `${value} minutes`;
  }
  const hours = Math.round(value / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export function AccountGraph({
  graph,
  windowHours,
}: {
  graph: Graph;
  windowHours: number;
}) {
  const moving = useRef<SVGGElement>(null);
  const dragging = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Placed | null>(null);
  const [moved, setMoved] = useState(false);

  const { placed, order } = useMemo(() => layout(graph), [graph]);

  function move(x: number, y: number): void {
    offset.current = { x, y };
    moving.current?.setAttribute("transform", `translate(${x} ${y})`);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    dragging.current = {
      x: event.clientX,
      y: event.clientY,
      dx: offset.current.x,
      dy: offset.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const from = dragging.current;
    if (!from) {
      return;
    }
    /* Bounded: the drawing fits the frame, so panning is for looking closer
       at an edge of it rather than for losing it off the side. */
    const limit = 260;
    const next = {
      x: Math.max(-limit, Math.min(limit, from.dx + (event.clientX - from.x))),
      y: Math.max(-limit, Math.min(limit, from.dy + (event.clientY - from.y))),
    };
    move(next.x, next.y);
    if (!moved && (Math.abs(next.x) > 2 || Math.abs(next.y) > 2)) {
      setMoved(true);
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    const from = dragging.current;
    dragging.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    /* The surface captures the pointer, so a tap on an account arrives here
       rather than on the circle. A tap is a press that did not travel. */
    if (!from) {
      return;
    }
    const travelled =
      Math.abs(event.clientX - from.x) > 4 || Math.abs(event.clientY - from.y) > 4;
    if (travelled) {
      return;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const id = target?.closest("[data-graph-node]")?.getAttribute("data-graph-node");
    setSelected(id ? (placed.get(id) ?? null) : null);
  }

  const concentrators = graph.nodes.filter((node) => node.kind === "concentrator");
  const households = graph.nodes.filter((node) => node.kind === "household");
  const intoAccounts = concentrators
    .reduce((sum, node) => sum + Number(node.amount), 0)
    .toFixed(2);

  /* The log the foundation asks for beside the drawing: each hop, what moved
     and how long after the transfer settled. The drawing shows the shape; the
     log is the evidence. */
  const log = [...graph.edges]
    .sort((left, right) => left.minutesAfterSettlement - right.minutesAfterSettlement)
    .slice(0, 12);

  const label = (edge: GraphEdge, which: "from" | "to") =>
    placed.get(edge[which])?.label ?? edge[which];

  return (
    <div className="stack">
      <div className="graph-head">
        <p className="eyebrow" data-sampled={graph.sampled ? "true" : "false"}>
          {graph.sampled
            ? GRAPH_COPY.sampled(graph.sampleSize, graph.populationSize)
            : GRAPH_COPY.whole(graph.populationSize)}
        </p>
        <p className="note">{GRAPH_COPY.window(windowHours)}</p>
      </div>

      <div
        className="graph-surface"
        data-graph
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="graph-svg"
          role="img"
          aria-label={
            graph.sampled
              ? GRAPH_COPY.describeSampled(
                  graph.sampleSize,
                  graph.populationSize,
                  concentrators.length,
                  windowHours,
                )
              : GRAPH_COPY.description(
                  households.length,
                  concentrators.length,
                  windowHours,
                )
          }
        >
          <g ref={moving}>
            {graph.edges.map((edge, index) => {
              const from = placed.get(edge.from);
              const to = placed.get(edge.to);
              if (!from || !to) {
                return null;
              }
              return (
                <line
                  key={`${edge.from}-${edge.to}-${index}`}
                  className={`graph-edge${edge.hop > 1 ? " graph-edge-hop" : ""}`}
                  data-graph-edge={edge.hop}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              );
            })}
            {order.map((node) => (
              <circle
                key={node.id}
                className={`graph-node graph-node-${node.kind}`}
                data-graph-node={node.id}
                data-kind={node.kind}
                cx={node.x}
                cy={node.y}
                r={node.kind === "household" ? 4 : 14}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="row">
        {moved ? (
          <button
            type="button"
            className="btn-quiet btn-sm"
            onClick={() => {
              move(0, 0);
              setMoved(false);
            }}
            data-graph-reset
          >
            Put the drawing back
          </button>
        ) : null}
      </div>

      <dl className="graph-legend">
        <div>
          <dt className="eyebrow">Household wallets drawn</dt>
          <dd className="record-cell">
            {formatCount(households.length)} of {formatCount(graph.populationSize)} the
            period paid
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Accounts they moved into</dt>
          <dd className="record-cell">{formatCount(concentrators.length)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Into those accounts, from the wallets drawn</dt>
          <dd className="record-cell" data-into-accounts={intoAccounts}>
            {formatNaira(intoAccounts)}
          </dd>
        </div>
      </dl>

      {selected ? (
        <p className="note" data-graph-selected={selected.id}>
          {selected.label} · {formatNaira(selected.amount)} ·{" "}
          {selected.kind === "concentrator"
            ? GRAPH_COPY.concentrator
            : selected.kind === "intermediary"
              ? GRAPH_COPY.intermediary
              : GRAPH_COPY.household}
        </p>
      ) : (
        <p className="note">{GRAPH_COPY.tap}</p>
      )}

      <section className="stack" aria-label="What moved, and when">
        <h3 className="h3-display">What moved, and when</h3>
        <Rule />
        <p className="note">{GRAPH_COPY.logNote}</p>
        <ul className="graph-log">
          {log.map((edge, index) => (
            <li
              key={`${edge.from}-${edge.to}-${index}`}
              className="graph-log-row"
              data-log-hop={edge.hop}
            >
              <span className="record-cell">{formatNaira(edge.amount)}</span>
              <span className="record-cell">
                {label(edge, "from")} → {label(edge, "to")}
              </span>
              <span className="record-cell">
                {minutes(edge.minutesAfterSettlement)} after it settled
              </span>
              <span className="record-cell">
                {edge.hop === 1 ? "First hop" : `Hop ${edge.hop}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="note">
          {formatCount(log.length)} of {formatCount(graph.edges.length)} movements,
          soonest after settlement first.
        </p>
      </section>
    </div>
  );
}
