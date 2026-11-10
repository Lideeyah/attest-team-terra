import { NextResponse } from "next/server";
import { opsEmpty, setOpsEmpty } from "@/lib/mock/forced";

/* "Nothing open" is a state the operations home has to be able to show, and
   with a fixture that always carries signals and cases it is unreachable.
   A developer control: it lives under /api/dev and no production build
   carries it. */

export function GET() {
  return NextResponse.json({ data: opsEmpty() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { empty?: boolean };
  if (body === null) {
    return NextResponse.json({ error: "Body was not JSON." }, { status: 400 });
  }
  setOpsEmpty(Boolean(body.empty));
  return NextResponse.json({ data: opsEmpty() });
}
