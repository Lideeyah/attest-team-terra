import Link from "next/link";
import { Lockup } from "@/components/Mark";
import { Rule } from "@/components/Rule";

/* Ruled, raised, three columns at desktop and stacked on a phone. */
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="measure">
        <Rule weight="heavy" />
        <div className="public-footer-columns">
          <div className="stack">
            <Lockup size={17} />
            <p className="prose-muted" style={{ maxWidth: "34ch" }}>
              A settlement record for the money carbon projects promise
              communities. What the register publishes is what the bank
              settled.
            </p>
          </div>
          <div className="stack">
            <p className="eyebrow">The record</p>
            <Link href="/register" className="record-cell">
              Register
            </Link>
            <Link href="/verify" className="record-cell">
              Verify a record
            </Link>
            <Link href="/report" className="record-cell">
              Report a problem
            </Link>
          </div>
          <div className="stack">
            <p className="eyebrow">Attest</p>
            <Link href="/about" className="record-cell">
              About
            </Link>
            <Link href="/privacy" className="record-cell">
              Privacy
            </Link>
            <Link href="/terms" className="record-cell">
              Terms
            </Link>
            <a href="mailto:record@attest.ng" className="record-cell">
              record@attest.ng
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
