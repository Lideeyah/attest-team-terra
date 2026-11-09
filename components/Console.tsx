import type { CSSProperties } from "react";
import { FRAME_MS, PRIMITIVE_CLASS } from "@/lib/motion";
import { formatTimeOfDay } from "@/lib/record";

export type ConsoleLine = {
  id: string;
  at: string;
  text: string;
  /** Latency and record counts are always shown. */
  meta?: string;
};

type ConsoleProps = {
  lines: ConsoleLine[];
  /** Height of the bed in pixels. */
  height?: number;
  /** Stated beneath the bed: what is streaming and how fast. */
  footer?: string;
};

export function Console({ lines, height, footer }: ConsoleProps) {
  const style: CSSProperties | undefined =
    height === undefined ? undefined : { maxHeight: height };
  return (
    <div className="stack">
      <div className="console-bed" style={style}>
        {lines.map((line, index) => (
          <div
            key={line.id}
            className={`console-line ${PRIMITIVE_CLASS.tick}`}
            style={
              {
                "--stagger": `${Math.round(index * FRAME_MS)}ms`,
              } as CSSProperties
            }
          >
            <span className="console-time">{formatTimeOfDay(line.at)}</span>
            <span>{line.text}</span>
            <span className="console-meta">{line.meta ?? ""}</span>
          </div>
        ))}
      </div>
      {footer ? <p className="eyebrow">{footer}</p> : null}
    </div>
  );
}
