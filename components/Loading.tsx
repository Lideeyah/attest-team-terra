/* The loading convention. A screen shows the shape of what is coming rather
   than a spinner, because a spinner states nothing. */
export function Loading({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      {label ? <p className="eyebrow">{label}</p> : null}
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          className="skeleton-bar"
          style={{ width: `${100 - index * 11}%` }}
        />
      ))}
    </div>
  );
}
