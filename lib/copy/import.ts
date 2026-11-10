/* The roster import format, as spec patch 01 item 9 fixes it. One module, so
   the uploader, the failure download and the backend lane read the same list
   rather than three guesses. */

export const IMPORT_COLUMNS = [
  "first_name",
  "last_name",
  "date_of_birth",
  "phone",
  "identity_type",
  "identity_number",
  "account_number",
  "bank_code",
  "community",
  "enrolled_by",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** The two columns the failure download appends, so the operator fixes the
    rows and re-uploads the same shape. */
export const FAILURE_COLUMNS = ["error_code", "error_message"] as const;

export const COLUMN_NOTE: Record<ImportColumn, string> = {
  first_name: "As it appears on the identity record.",
  last_name: "As it appears on the identity record.",
  date_of_birth: "YYYY-MM-DD.",
  phone: "Eleven digits, the number the payment notice goes to.",
  identity_type: "BVN or NIN.",
  identity_number: "The number itself. It is held as a hash and its last four.",
  account_number: "Ten digits, the account the transfer settles to.",
  bank_code: "The NIP code for the bank.",
  community: "The settlement the household lives in.",
  enrolled_by: "An agent email that already exists on this project.",
};

export const IMPORT_COPY = {
  heading: "Import a roster",
  format:
    "CSV, UTF-8, with a header row. Columns may be in any order and extra columns are ignored.",
  template: "Download the column template",
  failureDownload: "Download the rows that failed",
  failureNote:
    "The download is the file you uploaded plus error_code and error_message, carrying only the rows that failed. Fix those rows and upload the same file again.",
  running: (imported: number, rows: number) =>
    `The import is running. ${imported} of ${rows} rows read so far.`,
  partiallyFailed: (failed: number, rows: number) =>
    `${failed} of ${rows} rows failed. The rest are enrolled.`,
  complete: (imported: number) => `${imported} households enrolled.`,
} as const;

/** The template's header line, and the failure download's. */
export function headerLine(withFailureColumns = false): string {
  return [...IMPORT_COLUMNS, ...(withFailureColumns ? FAILURE_COLUMNS : [])].join(",");
}
