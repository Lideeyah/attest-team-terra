import { http, HttpResponse } from "msw";
import { handle, statusFor } from "@/lib/mock/router";

/* The same dispatcher, as MSW handlers, for component and test work. The
   running app uses the route handlers in app/api; a test imports these. Both
   call one implementation, so a fixture can never drift between them.

   ATTEST_API_MODE selects which answers: "mock" serves the dispatcher and
   "live" lets the request reach the backend untouched. */

export const MOCK_MODE = process.env.ATTEST_API_MODE !== "live";

export const handlers = [
  http.all("*/api/*", async ({ request }) => {
    if (!MOCK_MODE) {
      return undefined;
    }
    const url = new URL(request.url);
    const body =
      request.method === "GET" || request.method === "DELETE"
        ? {}
        : ((await request.json().catch(() => ({}))) as Record<string, unknown>);
    const { envelope, replayed } = handle(request.method, url, body, {
      idempotencyKey: request.headers.get("Idempotency-Key"),
    });
    return HttpResponse.json(envelope, {
      status: statusFor(envelope),
      headers: replayed ? { "Idempotent-Replayed": "true" } : undefined,
    });
  }),
];
