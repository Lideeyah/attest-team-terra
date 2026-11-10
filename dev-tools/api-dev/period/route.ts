import { NextResponse } from "next/server";
import { setPeriod } from "@/lib/mock/seed";

/* The open period's close date and state. A period closing in two days and a
   period already closed are states of the home screen, and without this they
   are reachable only by waiting for the quarter to end. A developer control:
   it lives under /api/dev and no production build carries it. */

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    projectId?: string;
    closesOn?: string | null;
    state?: "open" | "closed" | "closed-late" | null;
  };
  if (body === null) {
    return NextResponse.json({ error: "Body was not JSON." }, { status: 400 });
  }
  const period = setPeriod(body.projectId ?? "proj_ekuri", {
    ...(body.closesOn !== undefined ? { closesOn: body.closesOn } : {}),
    ...(body.state !== undefined ? { state: body.state } : {}),
  });
  return NextResponse.json({ data: period });
}
