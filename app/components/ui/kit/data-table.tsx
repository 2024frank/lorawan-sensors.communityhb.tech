"use client";
import * as React from "react";
import { SkeletonList } from "./query-state";

/**
 * DataTable<T> — a generic, accessible, responsive table.
 *
 * Reusability: describe columns once, pass rows; the component owns loading,
 * empty, sorting, keyboard interaction, and mobile behaviour.
 *
 * Accessibility: real <table> semantics, a visually-hidden <caption>,
 * `scope="col"` headers, `aria-sort` on sortable columns, and — when rows are
 * clickable — each row is focusable and activates on Enter/Space.
 *
 * Responsive: the table lives in a labelled, keyboard-scrollable region so wide
 * data never forces the page to scroll sideways. Columns can opt out of narrow
 * screens with `hideOnMobile`.
 *
 * @example
 * <DataTable
 *   caption="Sensors"
 *   rows={devices} rowKey={(d) => d.eui} onRowClick={(d) => go(d.eui)}
 *   isLoading={q.isLoading}
 *   empty={<EmptyState title="No sensors" />}
 *   columns={[
 *     { key: "name", header: "Sensor", render: (d) => <b>{d.name}</b> },
 *     { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
 *     { key: "battery", header: "Battery", align: "right", hideOnMobile: true,
 *       sortValue: (d) => d.battery ?? -1, render: (d) => `${d.battery ?? "—"}%` },
 *   ]}
 * />
 */
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
  /** Hide this column below the `sm` breakpoint to keep phones legible. */
  hideOnMobile?: boolean;
  /** Provide to make the column sortable; return a comparable primitive. */
  sortValue?: (row: T) => string | number;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes rows interactive (cursor, hover, focus, Enter/Space). */
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  empty?: React.ReactNode;
  /** Screen-reader table name. Always provide one. */
  caption: string;
  className?: string;
}

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, isLoading, empty, caption, className,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }

  if (isLoading) return <SkeletonList rows={5} />;
  if (!rows.length) return <>{empty ?? <div className="p-8 text-center text-[0.9375rem] text-muted">There is nothing to list yet.</div>}</>;

  return (
    // Labelled + focusable so wide tables scroll without the page scrolling.
    <div role="region" aria-label={caption} tabIndex={0}
      className={`relative overflow-x-auto rounded-[1.25rem] border border-line ${className ?? ""}`}>
      <table className="w-full min-w-[32rem] border-collapse text-[0.9375rem]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-field">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const ariaSort = !c.sortValue ? undefined : active ? (sort!.dir === 1 ? "ascending" : "descending") : "none";
              return (
                <th key={c.key} scope="col" aria-sort={ariaSort as any}
                  className={`px-4 py-3 text-[0.875rem] font-semibold text-ink ${c.align === "right" ? "text-right" : "text-left"} ${c.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                  style={c.width ? { width: c.width } : undefined}>
                  {c.sortValue ? (
                    <button onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-pine">
                      {c.header}
                      <span aria-hidden="true" className="text-[10px]">{active ? (sort!.dir === 1 ? "▲" : "▼") : "↕"}</span>
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            const interactive = Boolean(onRowClick);
            return (
              <tr key={key}
                {...(interactive && {
                  tabIndex: 0, role: "button",
                  onClick: () => onRowClick!(row),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick!(row); }
                  },
                })}
                className={`border-b border-line last:border-0 ${interactive ? "cursor-pointer hover:bg-field focus-visible:bg-field" : ""}`}>
                {columns.map((c) => (
                  <td key={c.key}
                    className={`px-4 py-3 ${c.align === "right" ? "text-right tabular-nums" : "text-left"} ${c.hideOnMobile ? "hidden sm:table-cell" : ""}`}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
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
