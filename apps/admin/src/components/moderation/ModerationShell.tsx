'use client';

import { useState, type ReactNode } from 'react';

/**
 * ModerationShell — ADMIN-PANEL-SPEC.md A03 "UNIFIED MODERATION QUEUE
 * PATTERN": "Reviews, Q&A, and Data Reports... share ONE interaction
 * pattern end-to-end... each route is a thin data-binding on top of
 * this shared <ModerationQueue> component." TODO.md Phase 9.4.
 *
 * Same extraction philosophy as DataTable.tsx: pulls out only what's
 * genuinely identical across all three queues — status tabs, a search
 * box, the bulk-select sticky action bar, and the empty state — and
 * leaves each queue's actual card content (which is completely
 * different per entity: star ratings for reviews, question stats for
 * Q&A, entity+reason for reports) to the caller via `renderItem`.
 *
 * Tabs are URL-driven links (matches LeadsManager's exact pattern —
 * server re-fetches on tab change, so the "pending (8)" count is
 * always live, not stale client state). Search is client-side over
 * the already-fetched page of items (matches BloodManager's donor
 * search) since a single moderation queue page is never more than a
 * few dozen rows at once.
 */
export function ModerationShell<T>({
  title,
  description,
  tabs,
  activeTab,
  search,
  onSearchChange,
  searchPlaceholder,
  items,
  itemKey,
  renderItem,
  selectedIds,
  onToggleSelect,
  bulkActions,
  bulkBusy,
  emptyMessage,
}: {
  title: string;
  description: string;
  tabs: { key: string; href: string; label: string; count?: number }[];
  activeTab: string;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T, ctx: { selected: boolean; onToggleSelect: () => void }) => ReactNode;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  bulkActions: { label: string; onClick: () => void; variant?: 'primary' | 'danger' }[];
  bulkBusy?: boolean;
  emptyMessage: string;
}) {
  const selectedCount = selectedIds.size;

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">{title}</h1>
        <p className="mt-1 text-admin-body text-neutral-500">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={t.href}
              className={`h-9 rounded-lg px-4 text-admin-body font-medium leading-9 ${
                activeTab === t.key
                  ? 'bg-brand-600 text-white'
                  : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {t.label}
              {t.count !== undefined ? ` (${t.count})` : ''}
            </a>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-56 rounded-md border border-admin-border bg-white px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-admin-border bg-white p-10 text-center text-admin-body text-neutral-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) =>
            renderItem(item, {
              selected: selectedIds.has(itemKey(item)),
              onToggleSelect: () => onToggleSelect(itemKey(item)),
            })
          )}
        </div>
      )}

      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[200] flex items-center justify-between border-t border-admin-border bg-white px-6 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:left-[240px]">
          <span className="text-admin-body font-medium text-neutral-700">{selectedCount} টি নির্বাচিত</span>
          <div className="flex gap-2">
            {bulkActions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                disabled={bulkBusy}
                className={`h-9 rounded-md px-4 text-admin-body font-semibold disabled:opacity-50 ${
                  a.variant === 'danger'
                    ? 'bg-emergency-600 text-white hover:bg-emergency-700'
                    : 'bg-life-600 text-white hover:bg-life-700'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
