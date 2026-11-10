import { UNKNOWN } from "@/lib/record";

/* The console's two derived figures. A flag rate and a sync delay are shown
   the same way on the list and on the detail, so neither screen formats them
   itself. */

/* A whole number, like every other percentage in the product. A tenth of a
   point on a flag rate is precision nobody has. */
export function flagRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/* A real zero is a figure; an unknown is a dash. A delay of none is "none",
   not an em dash that reads as "nobody measured this". */
export function syncDelay(seconds: number | null): string {
  if (seconds === null) {
    return UNKNOWN;
  }
  if (seconds === 0) {
    return "none";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/** How many households a run settled. A transfer that cleared and has not
    been acknowledged by the household is settled: settlement and
    acknowledgement are separate facts and the product shows both, so counting
    only the confirmed ones here would under-report the money that moved. */
export function settledOf(run: {
  counts: { settled: number; unconfirmed: number };
}): number {
  return run.counts.settled + run.counts.unconfirmed;
}
