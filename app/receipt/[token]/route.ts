import { api } from "@/lib/api/client";
import { RECEIPT_COPY } from "@/lib/copy/participant";
import { formatNaira, formatPeriod, formatSettlement } from "@/lib/record";
import { receiptDocument } from "@/lib/receipt-html";

/* The participant receipt is served as a document rather than as an
   application. An App Router page ships React and the framework runtime to
   every reader whatever the page itself contains, which on this route is
   roughly 140KB over the wire — three times the budget, to somebody on a
   cheap Android phone over an intermittent connection who wants to know
   whether ₦23,050 arrived.

   So this route is a route handler that returns hand-written HTML with its
   styles inlined: no React, no framework, no font file, no stylesheet
   request. Everything on it works with JavaScript switched off, because
   confirming a payment is a form post. */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const copy = RECEIPT_COPY.en;

  const result = await api.receipt(token);

  if (!result.ok) {
    return html(
      receiptDocument({
        title: copy.linkDead,
        body: `
          <h1>${escape(copy.linkDead)}</h1>
          <p class="record">${escape(result.code)}</p>
          <p>${escape(result.message)}</p>
          <p>${escape(result.remediation)}</p>
        `,
      }),
      result.code === "NOT_FOUND" ? 404 : result.code === "TOKEN_EXPIRED" ? 410 : 400,
    );
  }

  const receipt = result.data;

  const notice =
    state === "confirmed"
      ? copy.confirmed
      : state === "disputed"
        ? copy.disputed
        : state === "error"
          ? code === "ALREADY_CONFIRMED"
            ? copy.alreadyConfirmed
            : code === "DISPUTE_ALREADY_OPEN"
              ? copy.disputeOpen
              : code === "TOKEN_EXPIRED"
                ? copy.expired
                : copy.failed
          : "";

  const payments = receipt.payments
    .map(
      (payment) => `
      <div class="payment">
        <span class="eyebrow">${escape(formatPeriod(payment.period, true))}</span>
        <span class="amount">${escape(formatNaira(payment.amount))}</span>
        <span class="record">${escape(copy.settled(formatSettlement(payment.settledAt)))}</span>
        <span class="record">${escape(copy.reference(payment.sessionId))}</span>
        ${
          payment.confirmedAt
            ? `<span class="stamp stamp-sealed"><span class="glyph" aria-hidden="true"></span>CONFIRMED</span>
               <span class="record">${escape(copy.confirmedOn(formatSettlement(payment.confirmedAt)))}</span>`
            : `<span class="stamp stamp-flagged"><span class="glyph glyph-flagged" aria-hidden="true"></span>UNCONFIRMED</span>
               <span class="record">${escape(copy.notConfirmed)}</span>`
        }
      </div>`,
    )
    .join("");

  const unconfirmed = receipt.payments.some((payment) => payment.confirmedAt === null);

  return html(
    receiptDocument({
      title: copy.heading(receipt.participantName),
      body: `
        <header>
          <p class="eyebrow">${escape(receipt.projectName)}</p>
          <h1>${escape(copy.heading(receipt.participantName))}</h1>
        </header>
        ${notice ? `<p class="notice record">${escape(notice)}</p>` : ""}
        ${
          receipt.payments.length === 0
            ? `<section><h2>${escape(copy.noPaymentTitle)}</h2><p>${escape(copy.noPaymentBody)}</p></section>`
            : `<section>${payments}</section>`
        }
        ${
          unconfirmed
            ? `<section class="actions">
                 <h2>${escape(copy.askTitle)}</h2>
                 <form method="post" action="/receipt/${encodeURIComponent(token)}/confirm">
                   <button type="submit">${escape(copy.confirm)}</button>
                 </form>
                 <form method="post" action="/receipt/${encodeURIComponent(token)}/dispute">
                   <label class="eyebrow" for="category">${escape(copy.disputeLabel)}</label>
                   <select id="category" name="category">
                     ${Object.entries(copy.categories)
                       .map(
                         ([value, label]) =>
                           `<option value="${escape(value)}">${escape(label)}</option>`,
                       )
                       .join("")}
                   </select>
                   <button type="submit" class="secondary">${escape(copy.disputeSubmit)}</button>
                 </form>
               </section>`
            : ""
        }
        <footer>
          <p class="eyebrow">${escape(receipt.disputeOpen ? copy.reportOpen : copy.privateNote)}</p>
        </footer>
      `,
    }),
    200,
  );
}

function html(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
