import { api } from "@/lib/api/client";
import { formatCoverage, formatNaira, formatPeriod, formatSettlement } from "@/lib/record";

/* The signed attestation, downloadable. It is the record as a file: the
   figures, the hash, the chain position, the Merkle root and the anchor, in a
   form somebody can keep, attach to a report and check later against
   /verify. */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attestationId: string }> },
) {
  const { attestationId } = await params;
  if(process.env.ATTEST_API_MODE==='live')return Response.redirect(new URL(`/api/public/attestations/${encodeURIComponent(attestationId)}/pdf`,_request.url));
  const result = await api.publicAttestation(attestationId);

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.code, message: result.message }), {
      status: result.code === "NOT_FOUND" ? 404 : 400,
      headers: { "content-type": "application/json" },
    });
  }

  const record = result.data;
  const document = {
    record: "attestation",
    id: record.id,
    project: { id: record.projectId, name: record.projectName },
    period: record.period,
    households: { enrolled: record.enrolled, paid: record.paid },
    amounts: {
      receivedByHouseholds: record.amountToHouseholds,
      chargesBorne: record.chargesBorne,
      commitmentRequired: record.required,
      shortfall: record.shortfall,
    },
    confirmationRate: record.confirmationRate,
    chain: {
      hash: record.hash,
      previousHash: record.previousHash,
      merkleRoot: record.merkleRoot,
      position: record.chainPosition,
    },
    anchor: record.anchor,
    anchorState: record.anchorState,
    closedAt: record.closedAt,
    closedLate: record.closedLate,
    supersedes: record.supersedes,
    supersededBy: record.supersededBy,
    verifyAt: `/verify?hash=${record.hash}`,
    statement: [
      `${record.projectName}, ${formatPeriod(record.period)}.`,
      `${formatCoverage(record.paid, record.enrolled)} households were paid.`,
      `${formatNaira(record.amountToHouseholds)} reached households against ${formatNaira(record.required)} required by the commitment.`,
      `Sealed ${formatSettlement(record.closedAt)}.`,
    ].join(" "),
  };

  return new Response(`${JSON.stringify(document, null, 2)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${record.id}.json"`,
      "cache-control": "no-store",
    },
  });
}
