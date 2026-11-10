import { typeset } from "@/lib/fonts";
import { ButtonLink } from "@/components/Button";
import { Rule } from "@/components/Rule";

/* The second screen in the route transition reference. Going deeper runs
   routeForward; going back reverses the axis. */
export default function DeeperPage() {
  return (
    <div className={`measure section ${typeset}`}>
      <div className="stack-lg">
        <p className="eyebrow">Route transition reference</p>
        <h1 className="h2-display">One level deeper</h1>
        <Rule weight="heavy" />
        <p className="prose-muted">
          Arriving here ran routeForward: the outgoing screen moved 24px along
          the axis while this one entered from the opposite side, starting two
          frames in. Going back reverses it.
        </p>
        <div className="row">
          <ButtonLink href="/dev/kitchen-sink" variant="outline">
            Back to the reference
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
