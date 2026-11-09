import { NextResponse } from "next/server";

/* The platform readiness probe. It answers without touching a dependency, so
   a readiness check never fails for a reason the probe cannot see. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "attest-frontend" });
}
