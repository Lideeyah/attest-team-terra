import { coveragePercent, formatCoverage } from "@/lib/record";

/* Coverage is shown as "1,284 of 2,090" with the percentage secondary, never
   the percentage alone. The denominator is the product. */
export function Coverage({
  paid,
  enrolled,
  size = "cell",
}: {
  paid: number;
  enrolled: number;
  size?: "cell" | "figure";
}) {
  const percent = coveragePercent(paid, enrolled);
  if (size === "figure") {
    return (
      <span className="figure" data-coverage>
        <span className="figure-value">{formatCoverage(paid, enrolled)}</span>
        <span className="figure-denominator">{percent}% of households enrolled</span>
      </span>
    );
  }
  return (
    <span className="record-cell" data-coverage>
      {formatCoverage(paid, enrolled)}
      <span className="coverage-percent"> · {percent}%</span>
    </span>
  );
}
