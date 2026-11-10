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

export function truncateHash(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 1) {
    return hash;
  }
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/* Amounts are NGN decimal strings with two places, matching the bank. They
   are never parsed into a float and never converted into another unit, so
   formatting works on the string's own parts. */

/** ₦23,050.00. Figures are shown in full, never rounded. */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatNaira(amount: string): string {
  const [major = "0", minor = "00"] = amount.split(".");
  return `₦${groupDigits(major)}.${minor.padEnd(2, "0").slice(0, 2)}`;
}

/** A compact figure, for a chart axis label and nowhere else. A figure being
    audited is never abbreviated: ₦48.2m is not a number anyone can check. */
export function formatNairaCompact(amount: string): string {
  const [major = "0"] = amount.split(".");
  const naira = Number(major);
  const million = 1_000_000;
  const thousand = 1_000;
  if (naira >= million) {
    return `₦${(naira / million).toFixed(1)}m`;
  }
  if (naira >= thousand) {
    return `₦${(naira / thousand).toFixed(1)}k`;
  }
  return `₦${naira}`;
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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const QUARTER_MONTHS: Record<string, string> = {
  Q1: "Jan–Mar",
  Q2: "Apr–Jun",
  Q3: "Jul–Sep",
  Q4: "Oct–Dec",
};

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

/** A date: 09 Nov 2026. */
export function formatDate(iso: string): string {
  const part = watParts(iso);
  return `${part.day} ${MONTHS[Number(part.month) - 1]} ${part.year}`;
}

/** A date and time, to the minute: 09 Nov 2026 · 19:45. */
export function formatDateTime(iso: string): string {
  const part = watParts(iso);
  return `${formatDate(iso)} · ${part.hour}:${part.minute}`;
}

/** A settlement timestamp, which carries seconds because it is evidence:
    09 Nov 2026 · 14:22:07 WAT. */
export function formatSettlement(iso: string): string {
  const part = watParts(iso);
  return `${formatDate(iso)} · ${part.hour}:${part.minute}:${part.second} WAT`;
}

/** Kept for a record that states its timestamp in full. */
export function formatTimestamp(iso: string): string {
  return formatSettlement(iso);
}

/** A period as a reader says it: Q3 2026, or Jul–Sep 2026 where the quarter
    alone would be ambiguous. */
export function formatPeriod(period: string, spelled = false): string {
  const match = /^(\d{4})-(Q[1-4])$/.exec(period);
  if (!match) {
    return period;
  }
  const [, year, quarter] = match;
  return spelled ? `${QUARTER_MONTHS[quarter]} ${year}` : `${quarter} ${year}`;
}

/** A phone number as every list shows it: 080****4567. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return phone;
  }
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

/** A real zero is a fact and renders as one. Something unknown is a different
    fact and renders as a dash, so the two never look alike. */
export const UNKNOWN = "—";

export function orUnknown(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return UNKNOWN;
  }
  return String(value);
}

export function formatTimeOfDay(iso: string): string {
  const part = watParts(iso);
  return `${part.hour}:${part.minute}:${part.second}`;
}
