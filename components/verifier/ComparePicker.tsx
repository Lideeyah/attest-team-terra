"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { COMPARE_COPY } from "@/lib/copy/verifier";

/* Two or three projects. More than three is a table nobody reads, and one is
   not a comparison. */
export function ComparePicker({
  options,
  selected,
}: {
  options: { id: string; name: string }[];
  selected: string[];
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>(selected);

  function toggle(id: string): void {
    setChosen((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : current.length >= 3
          ? current
          : [...current, id],
    );
  }

  return (
    <section className="panel stack" aria-label="Choose projects">
      <p className="note">{COMPARE_COPY.nothing}</p>
      <ul className="compare-options">
        {options.map((option) => (
          <li key={option.id}>
            <label className="punch-label" data-selected={chosen.includes(option.id)}>
              <input
                className="punch"
                type="checkbox"
                checked={chosen.includes(option.id)}
                onChange={() => toggle(option.id)}
                data-compare-option={option.id}
              />
              <span>{option.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        disabled={chosen.length < 2}
        onClick={() => router.push(`/verifier/compare?ids=${chosen.join(",")}`)}
        data-compare-go
        aria-describedby="compare-help"
      >
        Compare {chosen.length > 0 ? `${chosen.length} projects` : ""}
      </Button>
      <p id="compare-help" className="note" aria-live="polite">
        {chosen.length < 2 ? "Select at least two projects to compare." : `${chosen.length} of 3 projects selected.`}
      </p>
    </section>
  );
}
