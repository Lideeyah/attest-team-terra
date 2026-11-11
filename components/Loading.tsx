/* The loading convention. A screen shows the shape of what is coming rather
   than a spinner, because a spinner states nothing. */
export function Loading({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <div className="skeleton" role="status" aria-busy="true" aria-live="polite">
      <p className="eyebrow">{label ?? "Loading your page…"}</p>
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          className="skeleton-bar"
          aria-hidden="true"
          style={{ width: `${100 - index * 11}%` }}
        />
      ))}
    </div>
  );
}
