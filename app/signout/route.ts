import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/* Signing out clears the session and returns to the landing page. It is a
   form post rather than a link, because signing somebody out is not something
   a prefetch should be able to do. */
export async function POST() {
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith("attest_")) {
      store.delete(cookie.name);
    }
  }
  redirect("/");
}
