import { NextResponse } from "next/server";
import { handle, statusFor } from "@/lib/mock/router";
import { readForced, streamConfig } from "@/lib/mock/forced";
import { runTransfers } from "@/lib/mock/seed";

/* The mock server, mounted at the contract's own paths. It is copied into the
   application by scripts/sync-dev-tools.mjs only when ATTEST_API_MODE is
   anything other than "live", so a production build pointed at the real
   backend does not carry fabricated records at the contract's own URLs. */

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    return {};
  }
  const text = await request.text();
  if (!text) {
    return {};
  }
  const parsed: unknown = JSON.parse(text);
  return typeof parsed === "object" && parsed !== null
    ? (parsed as Record<string, unknown>)
    : {};
}

function respond(request: Request, body: Record<string, unknown>) {
  const url = new URL(request.url);
  const { envelope, replayed } = handle(request.method, url, body, {
    idempotencyKey: request.headers.get("Idempotency-Key"),
  });
  const headers: Record<string, string> = {};
  if (replayed) {
    /* Backend section 3: the same key and body replays the original. */
    headers["Idempotent-Replayed"] = "true";
  }
  return NextResponse.json(envelope, { status: statusFor(envelope), headers });
}

/** The mock Server-Sent Events stream for a live run. The rate is transfers
    per second; each transfer emits its queued, in-flight and outcome events.
    The failure and reversal shares are drawn from a seeded generator, so the
    share holds at any transfer count and failures do not all arrive first. */
function stream(request: Request, runId: string): Response {
  const config = streamConfig();
  /* The transfers carry their own outcomes, drawn from the configured shares,
     so what the stream reports is what the transfer list and the run's counts
     say. Nothing here decides an outcome of its own. */
  const transfers = runTransfers(runId, "proj_ekuri", config.transfers);
  const encoder = new TextEncoder();
  let index = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const body = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      const stop = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        controller.close();
      };

      /* A transfer is queued, then in flight, then it settles or fails, and
         each is its own event at its own moment: a bank does not resolve a
         transfer in the instant it accepts it. Emitting all three in one tick
         made the in-flight state unobservable — the screen could never show a
         transfer in flight, because none ever was. */
      const inFlight: { transfer: (typeof transfers)[number]; since: number }[] = [];
      /* How many ticks a transfer stays in flight. At the configured rate
         this keeps a realistic number of them unresolved at once. */
      const DWELL = 6;
      let tick = 0;

      const emit = () => {
        /* A code forced from /dev/states drops the connection, so the live
           run screen's reconnecting state is reachable by clicking. The
           contract enumerates six events and this is not one of them, so the
           failure is the transport's rather than a seventh event type. */
        if (readForced(`/api/runs/${runId}/stream`)) {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          controller.error(new Error("stream dropped"));
          return;
        }

        tick += 1;

        /* Anything that has been in flight long enough resolves. */
        while (inFlight.length > 0 && tick - inFlight[0].since >= DWELL) {
          const resolved = inFlight.shift();
          if (!resolved) {
            break;
          }
          const transfer = resolved.transfer;
          /* Each event carries the transfer id and its new state and nothing
             else, as the contract says. The run screen patches its own table
             and reads the failure class from /api/runs/:id/transfers, where
             the same row carries it. */
          if (transfer.state === "failed") {
            send("transfer.failed", { id: transfer.id, state: "failed" });
          } else {
            send("transfer.settled", { id: transfer.id, state: "settled" });
            if (transfer.state === "reversed") {
              /* The sandbox settles and then reverses about a minute later.
                 The settlement stands and the reversal is a correction. */
              send("transfer.reversed", { id: transfer.id, state: "reversed" });
            }
          }
        }

        if (index >= transfers.length) {
          if (inFlight.length === 0) {
            send("run.complete", { id: runId, state: "complete" });
            stop();
          }
          return;
        }

        const transfer = transfers[index];
        send("transfer.queued", { id: transfer.id, state: "queued" });
        send("transfer.in_flight", { id: transfer.id, state: "in_flight" });
        inFlight.push({ transfer, since: tick });
        index += 1;
      };

      const interval = Math.max(4, Math.round(1000 / Math.max(1, config.rate)));
      timer = setInterval(emit, interval);
    },
    cancel() {
      if (timer) {
        clearInterval(timer);
      }
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[1] === "runs" && segments[3] === "stream" && segments.length === 4) {
    return stream(request, segments[2]);
  }
  return respond(request, {});
}

export async function POST(request: Request) {
  return respond(request, await readBody(request));
}

export async function PATCH(request: Request) {
  return respond(request, await readBody(request));
}

export async function PUT(request: Request) {
  return respond(request, await readBody(request));
}

export async function DELETE(request: Request) {
  return respond(request, {});
}
