import { NextResponse } from "next/server";
import { adminEmpty, setAdminEmpty } from "@/lib/mock/forced";
import { resetAdminQueues } from "@/lib/mock/router";

/* The platform admin levers: an empty set of queues, and a way back after a
   decision. The queues are mutated in place by decisions — that is what makes
   a decision stick — so without a reset, every state the dev panel names is
   one-shot. Lives under /api/dev; no production build carries it. */

export function GET() {
  return NextResponse.json({ data: { empty: adminEmpty() } });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    empty?: boolean;
    reset?: boolean;
  } | null;
  if (body === null) {
    return NextResponse.json({ error: "Body was not JSON." }, { status: 400 });
  }
  if (body.empty !== undefined) {
    setAdminEmpty(Boolean(body.empty));
  }
  if (body.reset === true) {
    resetAdminQueues();
  }
  return NextResponse.json({ data: { empty: adminEmpty() } });
}
