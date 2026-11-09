/* Deterministic helpers for record presentation. Nothing here reads the clock
   or a random source, so a record renders identically on the server and in the
   browser and a stamp never changes angle between renders. */

const ROTATION_RANGE_DEGREES = 4; /* -2 through +2 */

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** A stamp's rotation, derived from the record ID, between -2 and 2 degrees. */
export function stampRotation(recordId: string): number {
  const steps = hashString(recordId) % (ROTATION_RANGE_DEGREES * 10 + 1);
  return Number((steps / 10 - ROTATION_RANGE_DEGREES / 2).toFixed(1));
}

export function truncateHash(hash: string, head = 10, tail = 6): string {
  if (hash.length <= head + tail + 1) {
    return hash;
  }
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

const NAIRA_MAJOR_UNITS = 100;

/** A kobo amount as naira. Figures are always shown in full, never rounded. */
export function formatNaira(kobo: number): string {
  const naira = kobo / NAIRA_MAJOR_UNITS;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A compact naira figure for display at figure scale: ₦48.2m. */
export function formatNairaCompact(kobo: number): string {
  const naira = kobo / NAIRA_MAJOR_UNITS;
  const million = 1_000_000;
  const thousand = 1_000;
  if (naira >= million) {
    return `₦${(naira / million).toFixed(1)}m`;
  }
  if (naira >= thousand) {
    return `₦${(naira / thousand).toFixed(1)}k`;
  }
  return `₦${naira.toFixed(0)}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-NG");
}

/** Coverage is always stated with its denominator, never as a bare percentage. */
export function formatCoverage(paid: number, enrolled: number): string {
  if (enrolled === 0) {
    return "0 of 0";
  }
  return `${formatCount(paid)} of ${formatCount(enrolled)}`;
}

export function coveragePercent(paid: number, enrolled: number): number {
  if (enrolled === 0) {
    return 0;
  }
  return Number(((paid / enrolled) * 100).toFixed(1));
}

const WAT_OFFSET_MS = 60 * 60 * 1000;

function watParts(iso: string): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  /* West Africa Time is UTC+1 all year. Shifting the instant rather than the
     hour keeps the date correct across midnight. */
  const date = new Date(Date.parse(iso) + WAT_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    year: String(date.getUTCFullYear()),
    month: pad(date.getUTCMonth() + 1),
    day: pad(date.getUTCDate()),
    hour: pad(date.getUTCHours()),
    minute: pad(date.getUTCMinutes()),
    second: pad(date.getUTCSeconds()),
  };
}

/** A timestamp in the record's own format: 2026-11-09 14:22:07 WAT. */
export function formatTimestamp(iso: string): string {
  const part = watParts(iso);
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}:${part.second} WAT`;
}

export function formatTimeOfDay(iso: string): string {
  const part = watParts(iso);
  return `${part.hour}:${part.minute}:${part.second}`;
}
