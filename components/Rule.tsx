import type { CSSProperties } from "react";
import { FRAME_MS, PRIMITIVE_CLASS } from "@/lib/motion";

type RuleProps = {
  weight?: "hairline" | "contrast" | "heavy";
  /** Draw the rule across on entry. */
  animated?: boolean;
  /** Delay in whole frames, for a staggered draw. */
  delayFrames?: number;
};

export function Rule({
  weight = "hairline",
  animated = false,
  delayFrames = 0,
}: RuleProps) {
  const style: CSSProperties | undefined =
    delayFrames === 0
      ? undefined
      : ({ "--stagger": `${Math.round(delayFrames * FRAME_MS)}ms` } as CSSProperties);
  return (
    <hr
      className={[`rule-${weight}`, animated ? PRIMITIVE_CLASS.ruleDraw : null]
        .filter(Boolean)
        .join(" ")}
      style={style}
    />
  );
}
