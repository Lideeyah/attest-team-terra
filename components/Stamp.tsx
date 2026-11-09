import type { CSSProperties } from "react";
import { FRAME_MS, PRIMITIVE_CLASS } from "@/lib/motion";
import { stampRotation } from "@/lib/record";

export type StampState = "sealed" | "flagged" | "blocked" | "review";

/* No state is carried by colour alone: every stamp has a mark and an
   uppercase text label. The mark is drawn rather than typed, because the
   record face has no glyph for a square, a triangle, a cross or a diamond and
   a typed character would fall out of the typeface. */

type StampProps = {
  state: StampState;
  /** The uppercase fact, e.g. SETTLED, SHORTFALL, DUPLICATE IDENTITY. */
  label: string;
  /** The record this stamp belongs to. Its ID fixes the rotation. */
  recordId: string;
  /** Play the two-beat impact. Omit for a stamp that was already set. */
  animate?: boolean;
  /** Whole frames of delay, so several stamps land one after another. */
  delayFrames?: number;
};

export function Stamp({
  state,
  label,
  recordId,
  animate = false,
  delayFrames = 0,
}: StampProps) {
  const style = {
    "--stamp-rotate": `${stampRotation(recordId)}deg`,
    ...(delayFrames === 0
      ? {}
      : { "--stagger": `${Math.round(delayFrames * FRAME_MS)}ms` }),
  } as CSSProperties;
  return (
    <span
      className={[
        "stamp",
        `stamp-${state}`,
        animate ? PRIMITIVE_CLASS.stampLand : null,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span aria-hidden="true" className={`glyph glyph-${state}`} />
      {label}
    </span>
  );
}
