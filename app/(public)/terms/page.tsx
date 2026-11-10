import type { Metadata } from "next";
import { PublicMasthead } from "@/components/shells/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";

export const metadata: Metadata = {
  title: "Terms · Attest",
  description: "Terms for attest.ng.",
};

export default function TermsPage() {
  return (
    <>
      <PublicMasthead context="Terms" />
      <div className="measure section-tight stack-lg">
        <div className="stack">
          <p className="eyebrow">Terms</p>
          <h1 className="h2-display">Terms</h1>
          <Rule weight="heavy" />
        </div>
        <Notice title="This page is waiting on its text">
          The terms text is written by Attest rather than generated, and it is
          recorded in the build log as content to supply. What the product does
          with a household&rsquo;s data is described on this page when it
          arrives: identity numbers are held as a hash and their last four
          digits, phone numbers are masked in every list, and no household
          location is published at any zoom.
        </Notice>
      </div>
      <PublicFooter />
    </>
  );
}
