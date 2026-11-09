import { NextResponse } from "next/server";
import { ERROR_CODES, type ErrorCode } from "@/lib/api/contract";
import { currentForced, setForced } from "@/lib/mock/forced";

/* Forces any contract error code on the next matching call. This route is
   copied into the build only when ATTEST_DEV_TOOLS is set, so it does not
   exist in a production bundle. */

export function GET() {
  return NextResponse.json({ forced: currentForced(), codes: ERROR_CODES });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    code?: string | null;
    pathFragment?: string | null;
    once?: boolean;
  };
  const code =
    body.code && (ERROR_CODES as readonly string[]).includes(body.code)
      ? (body.code as ErrorCode)
      : null;
  setForced(code, body.pathFragment ?? null, body.once ?? false);
  return NextResponse.json({ forced: currentForced() });
}
