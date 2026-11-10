import { NextResponse } from "next/server";
import { setRegisterSize } from "@/lib/mock/forced";

/* How many projects the register serves, so the index can be profiled at the
   size the checklist names. A developer control: it lives under /api/dev and
   no production build carries it. */

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { rows?: number | null } | null;
  if (body === null) {
    return NextResponse.json({ error: "Body was not JSON." }, { status: 400 });
  }
  setRegisterSize(
    body.rows === null || body.rows === undefined ? null : Number(body.rows),
  );
  return NextResponse.json({ data: { rows: body.rows ?? null } });
}
