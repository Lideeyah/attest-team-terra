/* The console's two derived figures. A flag rate and a sync delay are shown
   the same way on the list and on the detail, so neither screen formats them
   itself. */

export function flagRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function syncDelay(seconds: number): string {
  if (seconds === 0) {
    return "—";
  }
  const minutes = Math.round(seconds / 60);
  return minutes < 60
    ? `${minutes} minutes`
    : `${Math.round((minutes / 60) * 10) / 10} hours`;
}
