import { api } from "@/lib/api/client";

/* The CSV export: the period's published figures as a table, which is what
   the format claims. It used to answer with the attestation record under a
   .csv name, so the two formats were one file with two labels. */

function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const attestationId = file.replace(/\.csv$/, "");
  const result = await api.publicAttestation(attestationId);

  if (!result.ok) {
    return new Response(`${result.code}\n${result.message}\n`, {
      status: result.code === "NOT_FOUND" ? 404 : 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const record = result.data;
  const rows: [string, string][] = [
    ["project", record.projectName],
    ["period", record.period],
    ["households_enrolled", String(record.enrolled)],
    ["households_paid", String(record.paid)],
    ["amount_to_households", record.amountToHouseholds],
    ["charges_borne_by_project", record.chargesBorne],
    ["required_by_commitment", record.required],
    ["shortfall", record.shortfall],
    ["confirmation_rate", String(record.confirmationRate)],
    ["closed_at", record.closedAt],
    ["record_hash", record.hash],
    ["previous_hash", record.previousHash ?? ""],
    ["merkle_root", record.merkleRoot],
    ["anchor_network", record.anchor.network],
    ["anchor_topic", record.anchor.topicId],
    ["anchor_sequence", record.anchor.sequence === null ? "" : String(record.anchor.sequence)],
  ];

  const csv = ["field,value", ...rows.map(([key, value]) => `${key},${escape(value)}`)].join(
    "\n",
  );

  return new Response(`${csv}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${attestationId}.csv"`,
      "cache-control": "no-store",
    },
  });
}
