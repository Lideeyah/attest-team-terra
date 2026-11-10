import Link from "next/link";
import { Lockup } from "@/components/Mark";

/* The fourth navigation shell. Every public route carries it, the landing
   page included, and it stays at the top through the whole scroll.

   It does not drop on a phone. The landing page is several screens of
   scroll-linked composition, and a reader three screens down has to stay one
   tap from the register. At phone width the mark stays, Register and Sign in
   collapse behind one text link, and Get started stays a button.

   Navigation lives here and the argument lives in the composition, which is
   why Movement 1 carries no buttons of its own. */

export function PublicMasthead({ context }: { context?: string }) {
  return (
    <header className="public-masthead" data-shell="public-masthead">
      <div className="measure public-masthead-row">
        <Link href="/" className="public-masthead-mark" aria-label="Attest, home">
          <Lockup size={18} />
        </Link>
        {context ? <span className="eyebrow public-masthead-context">{context}</span> : null}
        <nav className="public-masthead-nav" aria-label="Attest">
          <Link href="/register" className="btn-quiet btn-sm public-masthead-wide">
            Register
          </Link>
          <Link href="/signin" className="btn-quiet btn-sm public-masthead-wide">
            Sign in
          </Link>
          <Link href="/register" className="btn-quiet btn-sm public-masthead-narrow">
            Register and sign in
          </Link>
          <Link href="/get-started" className="btn btn-sm">
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
