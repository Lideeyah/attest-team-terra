import { api } from "@/lib/api/client";
import { FAILURE_COLUMNS, IMPORT_COLUMNS } from "@/lib/copy/import";

/* The failure download: the file that was uploaded plus error_code and
   error_message, carrying only the rows that failed, so the operator fixes
   those rows and uploads the same shape again. Spec patch 01, item 9. */

function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ importId: string }> },
) {
  const { importId } = await params;
  const result = await api.importJob(importId);
  if (!result.ok) {
    return new Response(`${result.code}\n${result.message}\n`, {
      status: result.code === "NOT_FOUND" ? 404 : 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const job = result.data;
  const header = [...IMPORT_COLUMNS, ...FAILURE_COLUMNS].join(",");
  const lines = job.failures.map((failure) =>
    [
      ...IMPORT_COLUMNS.map((column) => escape(failure.values[column] ?? "")),
      escape(failure.errorCode),
      escape(failure.errorMessage),
    ].join(","),
  );

  return new Response(`${[header, ...lines].join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${job.filename.replace(/\.csv$/, "")}-failed-rows.csv"`,
      "cache-control": "no-store",
    },
  });
}
