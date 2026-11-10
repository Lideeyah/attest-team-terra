"use client";

import { useMemo, useRef, useState } from "react";
import type { AccountGraph as Graph, GraphNode } from "@/lib/api/contract";
import { GRAPH_COPY } from "@/lib/copy/ops";
import { formatCount, formatNaira } from "@/lib/record";

/* Where the money went after it landed, hop by hop.

   Four hundred household wallets sweeping into three accounts inside
   forty-eight hours is the signature of a developer paying itself through
   households that do not exist, and it is invisible from outside a bank. This
   is the only screen in the product that draws it: the public register and
   the verifier portal publish a count.

   Ink and rules on the sunken surface. The concentrating accounts are the one
   thing carrying a colour, because they are the thing the drawing is about.

   The layout is computed once, deterministically, rather than simulated every
   frame: a force simulation over two hundred nodes is a frame budget spent on
   jitter, and an operator panning a graph needs the graph to hold still.
   Panning writes a transform straight to the group, so a drag costs one
   style change and no React render. */

const WIDTH = 1200;
const HEIGHT = 760;

type Placed = GraphNode & { x: number; y: number };

/* A seeded shuffle, so the same signal always draws the same picture: an
   operator who looks twice should see the same thing twice. */
function spread(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function layout(graph: Graph): { placed: Map<string, Placed>; order: Placed[] } {
  const concentrators = graph.nodes.filter((node) => node.kind === "concentrator");
  const intermediaries = graph.nodes.filter((node) => node.kind === "intermediary");
  const households = graph.nodes.filter((node) => node.kind === "household");

  const placed = new Map<string, Placed>();
  const order: Placed[] = [];

  /* The concentrating accounts sit on the right, which is where the money
     ends up. */
  concentrators.forEach((node, index) => {
    const entry = {
      ...node,
      x: WIDTH - 150,
      y: (HEIGHT / (concentrators.length + 1)) * (index + 1),
    };
    placed.set(node.id, entry);
    order.push(entry);
  });

  intermediaries.forEach((node, index) => {
    const entry = {
      ...node,
      x: WIDTH - 420,
      y: (HEIGHT / (intermediaries.length + 1)) * (index + 1),
    };
    placed.set(node.id, entry);
    order.push(entry);
  });

  /* The households fan out to the left, in a band whose height is the whole
     drawing: two hundred of them in a column would be a line, and the point
     of the picture is how many there are. */
  households.forEach((node, index) => {
    const column = index % 9;
    const row = Math.floor(index / 9);
    const rows = Math.ceil(households.length / 9);
    const entry = {
      ...node,
      x: 70 + column * 62 + spread(index + 1) * 26,
      y: 40 + (row / Math.max(1, rows - 1)) * (HEIGHT - 80) + spread(index + 2) * 10,
    };
    placed.set(node.id, entry);
    order.push(entry);
  });

  return { placed, order };
}

export function AccountGraph({
  graph,
  windowHours,
}: {
  graph: Graph;
  windowHours: number;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const moving = useRef<SVGGElement>(null);
  const dragging = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Placed | null>(null);

  const { placed, order } = useMemo(() => layout(graph), [graph]);

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
    const group = moving.current;
    if (!from || !group) {
      return;
    }
    /* Straight to the element: a drag is sixty style changes a second and
       none of them is a render. */
    offset.current = {
      x: from.dx + (event.clientX - from.x),
      y: from.dy + (event.clientY - from.y),
    };
    group.setAttribute(
      "transform",
      `translate(${offset.current.x} ${offset.current.y})`,
    );
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    dragging.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const concentrators = graph.nodes.filter((node) => node.kind === "concentrator");

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
        ref={surface}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="graph-svg"
          role="img"
          aria-label={GRAPH_COPY.description(
            graph.sampleSize,
            concentrators.length,
            windowHours,
          )}
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
                aria-label={`${node.label}, ${formatNaira(node.amount)}`}
                className={`graph-node graph-node-${node.kind}`}
                data-graph-node={node.id}
                data-kind={node.kind}
                cx={node.x}
                cy={node.y}
                r={node.kind === "household" ? 4 : 13}
                onPointerUp={() => setSelected(node)}
              />
            ))}
          </g>
        </svg>
      </div>

      <dl className="graph-legend">
        <div>
          <dt className="eyebrow">Household wallets</dt>
          <dd className="record-cell">
            {formatCount(graph.nodes.filter((node) => node.kind === "household").length)} of{" "}
            {formatCount(graph.populationSize)} paid in this period
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Accounts they moved into</dt>
          <dd className="record-cell">{formatCount(concentrators.length)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Into those accounts</dt>
          <dd className="record-cell">
            {formatNaira(
              concentrators
                .reduce((sum, node) => sum + Number(node.amount), 0)
                .toFixed(2),
            )}
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
    </div>
  );
}
