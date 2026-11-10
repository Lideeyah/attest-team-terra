export type CoverageBar = {
  /** The period label on the axis, e.g. 2026-Q2. */
  label: string;
  paid: number;
  enrolled: number;
};

type CoverageChartProps = {
  bars: CoverageBar[];
  /** Stated in the axis title, because a bare percentage is never shown. */
  title: string;
};

const WIDTH = 720;
const HEIGHT = 240;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 48;
const GRID_STEPS = 4;

/** Rules and ink only. Bars in ink, hairline gridlines, a heavy baseline. */
export function CoverageChart({ bars, title }: CoverageChartProps) {
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = bars.length === 0 ? plotWidth : plotWidth / bars.length;
  const barWidth = slot * 0.46;

  return (
    <figure className="stack">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label={`${title}. ${bars
          .map(
            (bar) =>
              `${bar.label}: ${bar.paid.toLocaleString("en-NG")} of ${bar.enrolled.toLocaleString("en-NG")}`,
          )
          .join("; ")}`}
      >
        {Array.from({ length: GRID_STEPS + 1 }, (_, step) => {
          const ratio = step / GRID_STEPS;
          const y = PAD_TOP + plotHeight * (1 - ratio);
          return (
            <g key={step}>
              <line
                className="chart-grid"
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
              />
              <text className="chart-axis" x={0} y={y + 4}>
                {`${Math.round(ratio * 100)}%`}
              </text>
            </g>
          );
        })}

        {bars.map((bar, index) => {
          const ratio = bar.enrolled === 0 ? 0 : bar.paid / bar.enrolled;
          const height = plotHeight * ratio;
          const x = PAD_LEFT + slot * index + (slot - barWidth) / 2;
          return (
            <g key={bar.label}>
              <rect
                className="chart-bar"
                x={x}
                y={PAD_TOP + plotHeight - height}
                width={barWidth}
                height={height}
              />
              <text
                className="chart-axis"
                x={x + barWidth / 2}
                y={HEIGHT - PAD_BOTTOM + 16}
                textAnchor="middle"
              >
                {bar.label}
              </text>
              {/* The figures, not only the percentage: a bare percentage is
                  not a coverage figure. */}
              <text
                className="chart-axis"
                x={x + barWidth / 2}
                y={HEIGHT - PAD_BOTTOM + 30}
                textAnchor="middle"
              >
                {bar.paid.toLocaleString("en-NG")} of{" "}
                {bar.enrolled.toLocaleString("en-NG")}
              </text>
            </g>
          );
        })}

        <line
          className="chart-baseline"
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={PAD_TOP + plotHeight}
          y2={PAD_TOP + plotHeight}
        />
      </svg>
      <figcaption className="eyebrow">{title}</figcaption>
    </figure>
  );
}
