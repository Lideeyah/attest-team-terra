import type { Metadata } from "next";
import { connection } from "next/server";
import { api } from "@/lib/api/client";
import { formatNaira, formatTimestamp } from "@/lib/record";

export const metadata: Metadata = {
  title: "Your payment record",
  description: "What was paid to you, when, and the bank's own reference for it.",
};

type Search = { state?: string; code?: string };

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Search>;
}) {
  await connection();
  const { token } = await params;
  const search = await searchParams;
  const result = await api.receipt(token);

  if (!result.ok) {
    return (
      <>
        <h1>This link does not open a record</h1>
        <p className="record">{result.code}</p>
        <p>{result.message}</p>
        <p>{result.remediation}</p>
      </>
    );
  }

  const receipt = result.data;

  return (
    <>
      <header>
        <p className="eyebrow">{receipt.projectName}</p>
        <h1>Payments recorded for {receipt.participantName}</h1>
      </header>

      {search.state === "confirmed" ? (
        <p className="record">
          Confirmed. Thank you — that is now part of the record for this period.
        </p>
      ) : null}
      {search.state === "disputed" ? (
        <p className="record">
          Reported. The claim is checked against the transfers the bank recorded
          and a reply comes to this number within five working days.
        </p>
      ) : null}
      {search.state === "error" ? (
        <p className="record">
          {search.code === "ALREADY_CONFIRMED"
            ? "This payment was already confirmed. The first confirmation stands, with its own time."
            : search.code === "DISPUTE_ALREADY_OPEN"
              ? "A report is already open for this payment. It is still being checked."
              : search.code === "TOKEN_EXPIRED"
                ? "This link has expired. Reply RECEIPT to the payment notice for a new one."
                : "That did not go through. Nothing was changed. Try again."}
        </p>
      ) : null}

      {receipt.payments.length === 0 ? (
        <section>
          <h2>No payment yet</h2>
          <p>
            You are enrolled in this project and no payment has been recorded to
            you yet. When one is, it appears here with the bank&rsquo;s own
            reference.
          </p>
        </section>
      ) : (
        <section>
          {receipt.payments.map((payment) => (
            <div className="receipt-payment" key={payment.sessionId}>
              <span className="eyebrow">{payment.period}</span>
              <span className="receipt-amount">{formatNaira(payment.amount)}</span>
              <span className="record">
                Settled {formatTimestamp(payment.settledAt)}
              </span>
              <span className="record">Bank reference {payment.sessionId}</span>
              <span className="record">
                {payment.confirmedAt
                  ? `You confirmed this on ${formatTimestamp(payment.confirmedAt)}`
                  : "Not yet confirmed by you"}
              </span>
            </div>
          ))}
        </section>
      )}

      {receipt.payments.some((payment) => payment.confirmedAt === null) ? (
        <section className="receipt-actions">
          <h2>Did the most recent payment reach you?</h2>
          <form method="post" action={`/receipt/${token}/confirm`}>
            <button type="submit">Yes, I received it</button>
          </form>
          <form method="post" action={`/receipt/${token}/dispute`}>
            <label className="eyebrow" htmlFor="receipt-category">
              No. What happened?
            </label>
            <select id="receipt-category" name="category" defaultValue="not-received">
              <option value="not-received">Nothing arrived</option>
              <option value="wrong-amount">Less than I was told</option>
              <option value="not-enrolled">I was not on the list</option>
            </select>
            <button type="submit" className="secondary">
              Report it
            </button>
          </form>
        </section>
      ) : null}

      <footer>
        <p className="eyebrow">
          {receipt.disputeOpen
            ? "A report you filed is open and being checked."
            : "This page is yours alone. It shows nobody else's payments."}
        </p>
      </footer>
    </>
  );
}
