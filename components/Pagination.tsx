import Link from "next/link";
import type { Meta } from "@/lib/api/contract";
import { formatCount } from "@/lib/record";

/* The contract paginates every list the same way, so one component reads
   every one of them. Ruled, record face, with the page size alongside. */

const SIZES = [20, 50, 100];

export function Pagination({
  meta,
  hrefFor,
  label,
}: {
  meta: Meta;
  hrefFor: (next: { page?: number; per_page?: number }) => string;
  label: string;
}) {
  const first = meta.page <= 1;
  const last = meta.page >= meta.total_pages;

  return (
    <nav className="pagination" aria-label={label}>
      <span className="row">
        {first ? (
          <span className="btn-outline btn-sm" aria-disabled="true">
            ← Previous
          </span>
        ) : (
          <Link href={hrefFor({ page: meta.page - 1 })} className="btn-outline btn-sm">
            ← Previous
          </Link>
        )}
        <span className="record-cell">
          Page {meta.page} of {meta.total_pages} · {formatCount(meta.total)} altogether
        </span>
        {last ? (
          <span className="btn-outline btn-sm" aria-disabled="true">
            Next →
          </span>
        ) : (
          <Link href={hrefFor({ page: meta.page + 1 })} className="btn-outline btn-sm">
            Next →
          </Link>
        )}
      </span>
      <span className="row">
        <span className="eyebrow">Per page</span>
        {SIZES.map((size) => (
          <Link
            key={size}
            href={hrefFor({ page: 1, per_page: size })}
            className="record-cell"
            aria-current={meta.per_page === size ? "true" : undefined}
            data-page-size={size}
          >
            {size}
          </Link>
        ))}
      </span>
    </nav>
  );
}
