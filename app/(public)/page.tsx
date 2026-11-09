import { Lockup } from "@/components/Mark";
import { Rule } from "@/components/Rule";

/* Movement 1, Stillness. One sentence, one heavy rule, nothing else. It rises
   in once and then does nothing at all. Movements 2 through 6 are built in
   F-2 against this same page.

   The sentence is the first of the four proposals in foundation 5.1. It is
   the one string on the page and it is Lydia's to settle; it is recorded in
   BUILD_LOG.md under manual review. */
const HERO_SENTENCE =
  "The money is promised, sometimes paid, and never provable.";

export default function Home() {
  return (
    <>
      <header className="measure" style={{ paddingBlock: "var(--stack-lg)" }}>
        <Lockup size={20} />
      </header>
      <div className="measure section">
        <div className="stack-lg anim-record-arrive">
          <h1 className="h1-display">
            {HERO_SENTENCE}
          </h1>
          <Rule weight="heavy" />
        </div>
      </div>
    </>
  );
}
