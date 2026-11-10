import Link from "next/link";
import { Lockup } from "@/components/Mark";

/* The fourth navigation shell. Every public route carries it, the landing
   page included, and it stays at the top through the whole scroll.

   It does not drop on a phone. The landing page is several screens of
   scroll-linked composition, and a reader three screens down has to stay one
   tap from the register. At phone width the words shorten and the mark loses
   its wordmark, but all three destinations stay their own link: one link
   cannot go to two places, and a reader who came to sign in must not be sent
   to the register instead.

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
          <Link href="/register" className="btn-quiet btn-sm">
            Register
          </Link>
          <Link href="/signin" className="btn-quiet btn-sm">
            Sign in
          </Link>
          <Link href="/get-started" className="btn btn-sm">
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
