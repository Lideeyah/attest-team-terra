import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "@/lib/mock/msw";
import { api, newIdempotencyKey } from "@/lib/api/client";
import { setForced } from "@/lib/mock/forced";

/* The client against the mock, through MSW. These are the component-and-test
   transport the phase asks for, and they are what keeps the client honest:
   every assertion here is a line of the contract. */

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  setForced(null);
});
afterAll(() => server.close());

const TWO_PLACES = /^\d+\.\d{2}$/;

describe("the envelope", () => {
  it("returns data and a meta block on a list", async () => {
    const result = await api.register({ page: 1, per_page: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toMatchObject({ page: 1, per_page: 10 });
    expect(result.meta?.total).toBeGreaterThan(0);
  });

  it("caps per_page at one hundred", async () => {
    const result = await api.participants("proj_ekuri", { per_page: 400 });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.meta?.per_page).toBe(100);
    expect(result.data.length).toBe(100);
  });
});

describe("errors", () => {
  it("returns a discriminated failure carrying the code and its remediation", async () => {
    setForced("FUNDING_INSUFFICIENT");
    const result = await api.run("run_2026q4");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe("FUNDING_INSUFFICIENT");
    expect(result.remediation.length).toBeGreaterThan(0);
    expect(result.transport).toBe(false);
  });

  it("refuses to delete a participant", async () => {
    const result = await api.deleteParticipant("ptc_000001");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe("PARTICIPANT_DELETE_NOT_PERMITTED");
  });
});

describe("idempotency", () => {
  it("replays the first result for the same key and body", async () => {
    const key = newIdempotencyKey();
    const body = { projectId: "proj_ekuri", category: "not-received", body: "No payment arrived." };
    const first = await api.fileDispute(body, key);
    const second = await api.fileDispute(body, key);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(second.data.id).toBe(first.data.id);
  });

  it("refuses the same key with a different body", async () => {
    const key = newIdempotencyKey();
    await api.fileDispute(
      { projectId: "proj_ekuri", category: "not-received", body: "First claim." },
      key,
    );
    const second = await api.fileDispute(
      { projectId: "proj_delta", category: "wrong-amount", body: "Different claim." },
      key,
    );
    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }
    expect(second.code).toBe("DUPLICATE_REQUEST");
  });
});

describe("amounts and charges", () => {
  it("carries every amount as a decimal string with two places", async () => {
    const result = await api.transfers("run_2026q3", { per_page: 20 });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    for (const transfer of result.data) {
      expect(transfer.amount).toMatch(TWO_PLACES);
      expect(transfer.fee).toMatch(TWO_PLACES);
      expect(transfer.vat).toMatch(TWO_PLACES);
      expect(transfer.stamp_duty).toMatch(TWO_PLACES);
      expect(transfer.total_debit).toMatch(TWO_PLACES);
    }
  });

  it("charges nothing on the intrabank rail and the tariff's own band on interbank", async () => {
    const tariff = await api.tariff();
    const transfers = await api.transfers("run_2026q3", { per_page: 60 });
    expect(tariff.ok && transfers.ok).toBe(true);
    if (!tariff.ok || !transfers.ok) {
      return;
    }
    const intrabank = transfers.data.find((transfer) => transfer.rail === "intrabank");
    const interbank = transfers.data.find((transfer) => transfer.rail === "interbank");
    expect(intrabank?.fee).toBe(tariff.data.intrabank.fee);
    expect(
      tariff.data.rows.some((row) => row.fee === interbank?.fee),
    ).toBe(true);
  });

  it("states the commitment arithmetic with its charges separated", async () => {
    const result = await api.arithmetic("run_2026q4");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.required).toMatch(TWO_PLACES);
    expect(result.data.estimatedCharges).toMatch(TWO_PLACES);
    expect(result.data.totalNeeded).toMatch(TWO_PLACES);
    expect(result.data.shortfall).toMatch(TWO_PLACES);
  });
});

describe("the record", () => {
  it("names a payment's dispute where one exists", async () => {
    const result = await api.participantPayments("ptc_000331");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.some((payment) => payment.disputeId !== null)).toBe(true);
  });

  it("returns the extraction in the contract's own shape", async () => {
    const result = await api.extraction("proj_ekuri");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(typeof result.data.sourceQuote).toBe("string");
    expect(typeof result.data.page).toBe("number");
    expect(result.data.confidence).toBeGreaterThan(0);
  });

  it("never returns a household coordinate on a public route", async () => {
    const result = await api.geography("proj_ekuri");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.resolution).toBeLessThanOrEqual(8);
    expect(result.data.buckets.every((bucket) => bucket.households > 1)).toBe(true);
  });
});
