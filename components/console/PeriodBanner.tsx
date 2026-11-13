"use client";

import { UNKNOWN, formatPeriod } from "@/lib/record";

export type PeriodBannerProps = {
  period?: {
    label: string;
    daysToClose: number;
    closesOn: string;
    state?: "open" | "closed";
  };
};

export function PeriodBanner({ period }: PeriodBannerProps) {
  const isClosing = period !== undefined && period.state !== "closed" && period.daysToClose <= 3;
  const isClosed = period?.state === "closed";
  const statusLabel =
    period === undefined
      ? "Period"
      : isClosed
        ? "Closed period"
        : "Open period";

  const detailText =
    period === undefined
      ? "No period is open"
      : isClosed
        ? `Closed · ${period.closesOn}`
        : `${
            period.daysToClose === 1
              ? "1 day to close"
              : `${period.daysToClose} days to close`
          } · ${period.closesOn}`;

  return (
    <div
      className="overview-period-banner"
      data-period-indicator={period ? period.label : "none"}
      role="region"
      aria-label="Open period status"
    >
      <div className="overview-period-banner-main">
        <span className={`overview-period-pill ${isClosed ? "is-closed" : ""}`}>
          <span className="overview-period-dot" aria-hidden="true" />
          {statusLabel}
        </span>
        <strong className="overview-period-year">
          {period ? formatPeriod(period.label) : UNKNOWN}
        </strong>
        <span className="overview-period-separator" aria-hidden="true">·</span>
        <span className="overview-period-detail">{detailText}</span>
      </div>
      {isClosing ? (
        <span className="overview-period-closing" data-closing="true">
          Closing soon
        </span>
      ) : null}
    </div>
  );
}
