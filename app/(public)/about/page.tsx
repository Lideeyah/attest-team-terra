import type { Metadata } from "next";
import { PublicMasthead } from "@/components/shells/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Rule } from "@/components/Rule";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Attest is: a settlement record for the money carbon projects promise communities.",
};

export default function AboutPage() {
  return (
    <>
      <PublicMasthead context="About" />
      <div className="measure section-tight stack-lg">
        <div className="stack">
          <p className="eyebrow">About</p>
          <h1 className="h2-display">What Attest is</h1>
          <Rule weight="heavy" />
        </div>
        <div className="stack-lg prose">
          <p>
            Carbon projects promise communities a share of what their work
            earns. The money is paid in cash, which means nobody can prove it
            arrived. Attest moves that money through the bank and emits a record
            that cannot be written after the fact.
          </p>
          <h2 className="h3-display">Three rules govern every screen</h2>
          <p>
            <strong>The record is computed, never typed.</strong> No field
            anywhere in this product lets anyone enter a coverage figure.
            Coverage exists only as a function of transfers that cleared through
            the bank. A developer cannot author their own number, and neither
            can we.
          </p>
          <p>
            <strong>Coverage, not conduct.</strong> The record states what
            fraction of enrolled households were paid and what fraction were
            not. It never states that a project is good, compliant, ethical or
            certified. We publish facts and let institutions form verdicts.
          </p>
          <p>
            <strong>Non-participation is visible.</strong> A project that enrols
            two thousand households and pays four hundred has a coverage of
            twenty percent, and that is published. A system that only shows
            successful payments is a marketing tool. The denominator is the
            product.
          </p>
          <h2 className="h3-display">What is ours and what is the bank&rsquo;s</h2>
          <p>
            Account creation, identity verification, tiered limits, transfers,
            balances and settlement are Access Bank&rsquo;s. Who is entitled,
            whether they were paid, whether they confirmed it, what the
            commitment was and what the record says are ours.
          </p>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
