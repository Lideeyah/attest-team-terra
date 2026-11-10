import { NextResponse } from "next/server";
import { projectStatusOverrides, setProjectStatus } from "@/lib/mock/forced";

/* A project's status, so the suspended and withdrawn states are reachable by
   clicking rather than by editing a fixture. */

export function GET() {
  return NextResponse.json({ data: projectStatusOverrides() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { projectId?: string; status?: string | null }
    | null;
  if (body === null || !body.projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }
  setProjectStatus(body.projectId, body.status ?? null);
  return NextResponse.json({ data: projectStatusOverrides() });
}
