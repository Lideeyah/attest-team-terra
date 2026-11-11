import { headers } from "next/headers";
export async function requestContext(): Promise<Record<string, string>> {
  const incoming = await headers();
  const cookie = incoming.get("cookie");
  return cookie ? { cookie } : {};
}
