import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/* Xtradot's inbound webhook. It verifies before it acts: HMAC-SHA256 over
   "{timestamp}.{raw_body}" compared in constant time, a timestamp no older
   than five minutes, and de-duplication on event_id. An unverified body is
   treated as hostile input and nothing is done with it.

   The secret arrives from the namespace secret and is read only here, on the
   server. It is never a NEXT_PUBLIC_ variable and is never logged. */

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const seen = new Set<string>();

const SUBSCRIBED_EVENTS = [
  "transfer.pending",
  "transfer.successful",
  "transfer.failed",
  "transfer.reversed",
  "transfer.bulk.completed",
  "virtual_account.credited",
  "settlement.completed",
  "carbon.mrv.verified",
  "carbon.mrv.rejected",
  "carbon.credits.retired",
  "webhook.test",
];

function verified(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = process.env.FORGE_WEBHOOK_SECRET ?? "";
  if (!secret || !signature.startsWith("sha256=")) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const given = signature.slice("sha256=".length);
  if (given.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-forge-timestamp") ?? "";
  const signature = request.headers.get("x-forge-signature") ?? "";
  const event = request.headers.get("x-forge-event") ?? "";

  const age = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(age) || age > FIVE_MINUTES_MS) {
    return NextResponse.json(
      { status: "error", error: { code: "INVALID_REQUEST", message: "Stale timestamp." } },
      { status: 400 },
    );
  }

  if (!verified(rawBody, timestamp, signature)) {
    return NextResponse.json(
      { status: "error", error: { code: "FORBIDDEN", message: "Signature did not verify." } },
      { status: 403 },
    );
  }

  const parsed = JSON.parse(rawBody) as { event_id?: string };
  const eventId = parsed.event_id ?? "";
  if (eventId && seen.has(eventId)) {
    return NextResponse.json({ status: "success", message: "Already handled", data: { eventId } });
  }
  seen.add(eventId);

  return NextResponse.json({
    status: "success",
    message: SUBSCRIBED_EVENTS.includes(event) ? "Accepted" : "Ignored, not subscribed",
    data: { eventId, event },
  });
}
