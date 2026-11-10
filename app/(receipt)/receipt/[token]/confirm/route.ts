import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";

/* A plain form post, so the receipt needs no JavaScript to confirm a
   payment. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await api.confirmReceipt(token);
  redirect(
    result.ok
      ? `/receipt/${token}?state=confirmed`
      : `/receipt/${token}?state=error&code=${result.code}`,
  );
}
