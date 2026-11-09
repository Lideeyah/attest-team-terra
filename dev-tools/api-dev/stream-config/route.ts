import { NextResponse } from "next/server";
import { setStreamConfig, streamConfig } from "@/lib/mock/forced";

/* The run stream's emission rate, failure share and reversal share. This is a
   developer control, so it sits under /api/dev and is excluded from the build
   unless ATTEST_DEV_TOOLS is set. */

export function GET() {
  return NextResponse.json({ data: streamConfig() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    rate?: number;
    failureShare?: number;
    reversalShare?: number;
    transfers?: number;
  };
  const next = setStreamConfig({
    ...(Number.isFinite(body.rate) ? { rate: Number(body.rate) } : {}),
    ...(Number.isFinite(body.failureShare)
      ? { failureShare: Number(body.failureShare) }
      : {}),
    ...(Number.isFinite(body.reversalShare)
      ? { reversalShare: Number(body.reversalShare) }
      : {}),
    ...(Number.isFinite(body.transfers) ? { transfers: Number(body.transfers) } : {}),
  });
  return NextResponse.json({ data: next });
}
