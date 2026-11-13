import type { CSSProperties } from "react";

type MarkProps = {
  /** Side length of the square. Defaults to the token size. */
  size?: number;
  reversed?: boolean;
};

/** The mark: a square bisected by a struck seal line, solid below, outlined
    above. Drawn by geometry so it stays sharp at any size. */
export function Mark({ size, reversed = false }: MarkProps) {
  const style: CSSProperties | undefined =
    size === undefined ? undefined : { width: size, height: size };
  return (
    <span
      aria-hidden="true"
      className={reversed ? "mark mark-reversed" : "mark"}
      style={style}
    />
  );
}

type LockupProps = {
  orientation?: "horizontal" | "stacked";
  size?: number;
  reversed?: boolean;
};

export function Lockup({
  orientation = "horizontal",
  size,
  reversed = false,
}: LockupProps) {
  const wordmarkStyle: CSSProperties | undefined =
    size === undefined ? undefined : { fontSize: size };
  return (
    <span
      className={
        orientation === "stacked" ? "lockup-stacked" : "lockup-horizontal"
      }
    >
      <Mark size={size} reversed={reversed} />
      <span
        className="wordmark"
        style={
          reversed
            ? { ...wordmarkStyle, color: "var(--canvas-paper)" }
            : wordmarkStyle
        }
      >
        Attest
      </span>
      <span className="brand-context">Access Bank / AFF<span>Hackathon showcase</span></span>
    </span>
  );
}
