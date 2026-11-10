import Link from "next/link";

/* The step indicator. Display face, because it is structure rather than
   prose, and it names what is left as well as what is done.

   A step is a link when it has been reached, not when it is behind the one
   being looked at: going back to step one must not make steps two to five
   unreachable, which would leave redoing every step as the only way
   forward. */
export function Steps({
  steps,
  current,
  reached,
  hrefFor,
}: {
  steps: { key: string; label: string }[];
  current: string;
  /** The furthest step reached. Defaults to the current one. */
  reached?: string;
  hrefFor: (key: string) => string;
}) {
  const index = steps.findIndex((step) => step.key === current);
  const furthest = Math.max(
    index,
    steps.findIndex((step) => step.key === (reached ?? current)),
  );
  return (
    <nav className="steps" aria-label="Onboarding">
      {steps.map((step, position) => {
        const here = position === index;
        const done = position < index;
        const open = position <= furthest && !here;
        return (
          <span
            key={step.key}
            className="step"
            data-state={here ? "here" : done ? "done" : open ? "open" : "ahead"}
            aria-current={here ? "step" : undefined}
          >
            {open ? (
              <Link href={hrefFor(step.key)}>
                {position + 1}. {step.label}
              </Link>
            ) : (
              <span>
                {position + 1}. {step.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
