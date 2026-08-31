import type { ReactNode } from 'react';

/**
 * DataTable — TODO.md Phase 8.6 / DEEPDIVE-REFACTOR-PLAN.md H3.
 * Before this, 14 admin table components each hand-rolled the same
 * wrapper markup (rounded-xl border, overflow-x-auto, thead styling,
 * tbody divide-y hover rows) and the same easy-to-get-wrong empty-state
 * `colSpan` (has to match the live column count exactly, silently
 * wrong if a column is added/removed later without updating it).
 *
 * Deliberately NOT abstracting cell rendering into a column-render-fn
 * API — every table's `<td>` content is genuinely bespoke (thumbnails,
 * status badges with different logic per entity, inline vs. dropdown
 * actions) and forcing that into a generic column config would be a
 * much bigger, riskier rewrite of each table's actual business logic
 * for little real gain. This extracts only the part that was pure,
 * verbatim duplication: the shell, the empty state, and the optional
 * pagination footer. Callers keep full control via `renderRow`.
 *
 * Pagination is optional — some tables (e.g. AdminsManager) show every
 * row with no server-side paging; passing no `pagination` prop omits
 * the footer entirely rather than rendering a broken/disabled one.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  renderRow,
  emptyMessage,
  pagination,
}: {
  columns: ReactNode[];
  rows: T[];
  rowKey: (row: T) => string;
  renderRow: (row: T) => ReactNode;
  emptyMessage: string;
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    itemLabel: string;
  };
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="px-3 py-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-admin-body text-neutral-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-neutral-50">
                  {renderRow(row)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t border-admin-border px-3 py-2 text-admin-small">
          <span className="text-neutral-500">
            {pagination.total}
            {pagination.itemLabel} · পৃষ্ঠা {pagination.page} / {pagination.totalPages}
          </span>
          <span className="flex items-center gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={pagination.onPrev}
              className="rounded-md border border-admin-border px-2 py-1 text-neutral-700 hover:bg-neutral-50 disabled:opacity-30"
            >
              ◂
            </button>
            <span className="px-2 text-neutral-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={pagination.onNext}
              className="rounded-md border border-admin-border px-2 py-1 text-neutral-700 hover:bg-neutral-50 disabled:opacity-30"
            >
              ▸
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
