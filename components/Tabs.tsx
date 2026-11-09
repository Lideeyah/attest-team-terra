"use client";

import { useId, useState, type ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  panel: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  initial?: string;
  /** Names the rail for assistive technology, e.g. "Periods". */
  ariaLabel: string;
};

/** Index-card tabs. The active tab joins the panel below it by breaking the
    rule line, the way a physical divider sits proud of the cards behind it. */
export function Tabs({ items, initial, ariaLabel }: TabsProps) {
  const base = useId();
  const first = items[0];
  const [active, setActive] = useState(initial ?? first?.id ?? "");
  const current = items.find((item) => item.id === active) ?? first;

  if (!current) {
    return null;
  }

  return (
    <div>
      <div className="tab-rail" role="tablist" aria-label={ariaLabel}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${base}-tab-${item.id}`}
            aria-selected={item.id === current.id}
            aria-controls={`${base}-panel-${item.id}`}
            className="tab"
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${current.id}`}
        aria-labelledby={`${base}-tab-${current.id}`}
        className="tab-panel"
      >
        {current.panel}
      </div>
    </div>
  );
}
