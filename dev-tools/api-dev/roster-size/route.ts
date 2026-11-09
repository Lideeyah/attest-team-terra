import { NextResponse } from "next/server";
import { rosterSizes_, setRosterSize } from "@/lib/mock/forced";

/* The roster size the mock serves, so a screen can be profiled at ten
   thousand rows. A developer control: it lives under /api/dev and no
   production build carries it. */

export function GET() {
  return NextResponse.json({ data: rosterSizes_() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { projectId?: string; rows?: number | null };
  if (body === null) {
    return NextResponse.json({ error: "Body was not JSON." }, { status: 400 });
  }
  const projectId = body.projectId ?? "proj_ekuri";
  setRosterSize(
    projectId,
    body.rows === null || body.rows === undefined ? null : Number(body.rows),
  );
  return NextResponse.json({ data: rosterSizes_() });
}
