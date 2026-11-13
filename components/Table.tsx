import type { ReactNode } from "react";

export type Column<Row> = {
  key: string;
  header: string;
  /** Figures are right-aligned and tabular. */
  numeric?: boolean;
  sorted?: "ascending" | "descending";
  sortable?: boolean;
  cell: (row: Row) => ReactNode;
};

type TableProps<Row> = {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  activeRowKey?: string;
};

/** Ruled, never striped. */
export function Table<Row>({
  caption,
  columns,
  rows,
  rowKey,
  activeRowKey,
}: TableProps<Row>) {
  return (
    <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
    <table className="table">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={column.numeric ? "numeric" : undefined}
              aria-sort={column.sorted}
            >
              {column.header}
              {column.sortable ? (
                <span aria-hidden="true" className="sort-caret">
                  {column.sorted === "descending" ? "▾" : "▴"}
                </span>
              ) : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = rowKey(row);
          return (
            <tr key={key} data-active={key === activeRowKey ? "true" : undefined}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.numeric ? "numeric" : undefined}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
