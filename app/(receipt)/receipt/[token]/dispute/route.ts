import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const form = await request.formData();
  const category = String(form.get("category") ?? "not-received");
  const result = await api.disputeReceipt(token, { category });
  redirect(
    result.ok
      ? `/receipt/${token}?state=disputed`
      : `/receipt/${token}?state=error&code=${result.code}`,
  );
}
