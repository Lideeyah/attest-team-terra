import type { CSSProperties } from "react";
import { FRAME_MS, PRIMITIVE_CLASS } from "@/lib/motion";

type RuleProps = {
  weight?: "hairline" | "contrast" | "heavy";
  /** Draw the rule across on entry. */
  animated?: boolean;
  /** Delay in whole frames, for a staggered draw. */
  delayFrames?: number;
  /** A rule waiting to be drawn is not shown at full width first. */
  undrawn?: boolean;
};

export function Rule({
  weight = "hairline",
  animated = false,
  delayFrames = 0,
  undrawn = false,
}: RuleProps) {
  const style = {
    ...(delayFrames === 0
      ? {}
      : { "--stagger": `${Math.round(delayFrames * FRAME_MS)}ms` }),
    ...(undrawn ? { transform: "scaleX(0)", transformOrigin: "left" } : {}),
  } as CSSProperties;
  return (
    <hr
      className={[`rule-${weight}`, animated ? PRIMITIVE_CLASS.ruleDraw : null]
        .filter(Boolean)
        .join(" ")}
      style={Object.keys(style).length === 0 ? undefined : style}
    />
  );
}
