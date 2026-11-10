import type { Metadata } from "next";
import { PublicMasthead } from "@/components/shells/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy for attest.ng.",
};

export default function PrivacyPage() {
  return (
    <>
      <PublicMasthead context="Privacy" />
      <div className="measure section-tight stack-lg">
        <div className="stack">
          <p className="eyebrow">Privacy</p>
          <h1 className="h2-display">Privacy</h1>
          <Rule weight="heavy" />
        </div>
        <Notice title="This page is waiting on its text">
          The privacy text is written by Attest rather than generated, and it is
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
