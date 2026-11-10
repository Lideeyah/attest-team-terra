import { Rule } from "@/components/Rule";
import type { Arithmetic } from "@/lib/api/contract";
import { RUN_COPY } from "@/lib/copy/console";
import { formatNaira } from "@/lib/record";

/* The commitment arithmetic, with every term shown. The amount a household is
   owed is a consequence of the commitment and the declared gross, so each
   step of the sum is on the page rather than one figure at the end of it.

   Each row carries its machine value as well as its formatted one, so a check
   of the arithmetic reads the same numbers the reader does. */

type Row = {
  key: keyof Arithmetic;
  label: string;
  note: string;
  value: string;
  display: string;
};

export function ArithmeticPanel({ figures }: { figures: Arithmetic }) {
  const rows: Row[] = [
    {
      key: "commitmentPct",
      label: "Commitment",
      note: "From the project design document, as extracted and corrected.",
      value: String(figures.commitmentPct),
      display: `${figures.commitmentPct}% of net revenue`,
    },
    {
      key: "declaredGross",
      label: "Declared gross",
      note: "What the project declares it received for the credits sold in this period.",
      value: figures.declaredGross,
      display: formatNaira(figures.declaredGross),
    },
    {
      key: "required",
      label: "Required to households",
      note: "The declared gross at the commitment percentage. Nobody types this figure.",
      value: figures.required,
      display: formatNaira(figures.required),
    },
    {
      key: "estimatedCharges",
      label: "Estimated charges",
      note: "The bank's own schedule applied to the transfers this run makes. Charges are borne by the project, never deducted from a household.",
      value: figures.estimatedCharges,
      display: formatNaira(figures.estimatedCharges),
    },
    {
      key: "totalNeeded",
      label: "Total needed",
      note: "The amount required plus the estimated charges.",
      value: figures.totalNeeded,
      display: formatNaira(figures.totalNeeded),
    },
    {
      key: "funded",
      label: "Funded",
      note: "What this run is funded with. The disbursement account's own balance, and what it holds for other runs in the period, are on the funding screen.",
      value: figures.funded,
      display: formatNaira(figures.funded),
    },
    {
      key: "shortfall",
      label: "Shortfall",
      note: "The total needed less what is funded. A shortfall does not stop a run; it is recorded in the attestation.",
      value: figures.shortfall,
      display: formatNaira(figures.shortfall),
    },
  ];

  return (
    <section className="panel stack" aria-label={RUN_COPY.arithmeticHeading}>
      <h2 className="h3-display">{RUN_COPY.arithmeticHeading}</h2>
      <p className="note">{RUN_COPY.arithmeticNote}</p>
      <Rule />
      <dl className="arithmetic">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`arithmetic-row${row.key === "shortfall" ? " arithmetic-total" : ""}`}
            data-arithmetic={row.key}
            data-value={row.value}
          >
            <dt>
              <span className="eyebrow">{row.label}</span>
              <span className="note">{row.note}</span>
            </dt>
            <dd className="record-cell">{row.display}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
