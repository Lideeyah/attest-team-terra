import Link from "next/link";

/* The step indicator. Display face, because it is structure rather than
   prose, and it names what is left as well as what is done. */
export function Steps({
  steps,
  current,
  hrefFor,
}: {
  steps: { key: string; label: string }[];
  current: string;
  hrefFor: (key: string) => string;
}) {
  const index = steps.findIndex((step) => step.key === current);
  return (
    <nav className="steps" aria-label="Onboarding">
      {steps.map((step, position) => {
        const done = position < index;
        const here = position === index;
        return (
          <span key={step.key} className="step" data-state={here ? "here" : done ? "done" : "ahead"}>
            {done ? (
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
