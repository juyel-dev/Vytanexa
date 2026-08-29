'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LocationModal } from './LocationModal';
import { LocationImportDialog } from './LocationImportDialog';
import {
  buildLocationTree,
  locationName,
  LOCATION_TYPE_LABEL,
  type AdminLocation,
} from '@/lib/location-utils';

type Props = { initialLocations: AdminLocation[] };

function filterTree(nodes: AdminLocation[], q: string): AdminLocation[] {
  const needle = q.toLowerCase().trim();
  if (!needle) return nodes;
  const matches = (n: AdminLocation) => {
    const t = n.name_translations as { bn?: string; en?: string; hi?: string } | null;
    const hay = [t?.bn ?? '', t?.en ?? '', t?.hi ?? '', n.slug].join(' ').toLowerCase();
    return hay.includes(needle);
  };
  const out: AdminLocation[] = [];
  for (const n of nodes) {
    const filteredChildren = n.children ? filterTree(n.children, q) : [];
    if (matches(n) || filteredChildren.length > 0) {
      out.push({ ...n, children: filteredChildren.length ? filteredChildren : n.children });
    }
  }
  return out;
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
}: {
  node: AdminLocation;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (n: AdminLocation) => void;
  onAddChild: (n: AdminLocation) => void;
  onDelete: (n: AdminLocation) => void;
}) {
  const hasChildren = !!(node.children && node.children.length > 0);
  const isExpanded = expanded.has(node.id);
  const canAddChild = node.type !== 'ward';

  return (
    <>
      <div
        className={`flex items-center gap-2 border-b border-admin-border px-3 py-2.5 hover:bg-neutral-50 ${!node.is_active ? 'opacity-60' : ''}`}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
      >
        {/* expand chevron */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-neutral-100"
            aria-label={isExpanded ? 'সংকুচিত করুন' : 'প্রসারিত করুন'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-neutral-500" /> : <ChevronRight className="h-4 w-4 text-neutral-500" />}
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden>
            <span className="mx-auto mt-[11px] block h-1.5 w-1.5 rounded-full bg-neutral-300" />
          </span>
        )}

        <span className="shrink-0 text-[14px]" aria-hidden>
          {node.type === 'state' ? '🏳️' : node.type === 'district' ? '📍' : node.type === 'sub_district' ? '📌' : '🏘️'}
        </span>

        <span className="min-w-0 flex-1 truncate text-admin-body font-medium text-neutral-900">{locationName(node)}</span>

        <span className="hidden shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 sm:inline">
          {LOCATION_TYPE_LABEL[node.type]}
        </span>

        <span className="hidden max-w-[140px] truncate text-admin-small text-neutral-400 sm:inline">/{node.slug}</span>

        {!node.is_active && (
          <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600">নিষ্ক্রিয়</span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {canAddChild && (
            <button
              onClick={() => onAddChild(node)}
              title="চাইল্ড যোগ করুন"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-brand-600 hover:bg-brand-50"
              aria-label={`Add child under ${locationName(node)}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onEdit(node)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-neutral-600 hover:bg-neutral-50"
            aria-label="সম্পাদনা"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50"
            aria-label="মুছুন"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {hasChildren && isExpanded && node.children!.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export function LocationsManager({ initialLocations }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialLocations.filter((l) => l.type === 'state').map((l) => l.id)));
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; parent: AdminLocation | null; target: AdminLocation | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminLocation | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const tree = useMemo(() => buildLocationTree(initialLocations), [initialLocations]);
  const filtered = useMemo(() => filterTree(tree, query), [tree, query]);

  // when searching, auto-expand ancestors of matches
  const effectiveExpanded = useMemo(() => {
    if (!query.trim()) return expanded;
    const collect = new Set<string>();
    const walk = (nodes: AdminLocation[]) => {
      for (const n of nodes) {
        if (n.children?.length) {
          collect.add(n.id);
          walk(n.children);
        }
      }
    };
    walk(filtered);
    return collect;
  }, [expanded, filtered, query]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSaved = () => {
    toast.push('সংরক্ষিত হয়েছে ✅', 'success');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/admin/locations/${deleteTarget.id}`, { method: 'DELETE' }).catch(() => null);
    setDeleteBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast.push(data?.error ?? 'মুছে ফেলা যায়নি', 'error');
      return;
    }
    toast.push('মুছে ফেলা হয়েছে', 'success');
    setDeleteTarget(null);
    router.refresh();
  };

  const totalCount = initialLocations.length;

  return (
    <div className="flex flex-col gap-4">
      {/* toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="এলাকা খুঁজুন... (বাংলা / English / slug)"
            className="h-10 w-full rounded-lg border border-admin-border bg-white pl-9 pr-3 text-admin-body outline-none placeholder:text-neutral-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="h-10 shrink-0 rounded-lg border border-admin-border bg-white px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50"
          >
            📥 CSV থেকে আমদানি
          </button>
          <button
            onClick={() => setModal({ mode: 'create', parent: null, target: null })}
            className="h-10 shrink-0 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700"
          >
            + নতুন এলাকা যোগ করুন
          </button>
        </div>
      </div>

      {/* tree card */}
      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        {totalCount === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-admin-body text-neutral-500">এখনো কোনো এলাকা যোগ করা হয়নি। উপরের বোতাম দিয়ে প্রথম State যোগ করুন, বা CSV আমদানি ব্যবহার করুন।</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-admin-body text-neutral-500">“{query}” এর সাথে মিলে এমন কোনো এলাকা পাওয়া যায়নি।</div>
        ) : (
          <div className="divide-y-0">
            {filtered.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                expanded={effectiveExpanded}
                onToggle={toggle}
                onEdit={(n) => setModal({ mode: 'edit', parent: null, target: n })}
                onAddChild={(n) => setModal({ mode: 'create', parent: n, target: null })}
                onDelete={(n) => setDeleteTarget(n)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-admin-small text-neutral-400">মোট {totalCount}টি এলাকা · {query ? `ফিল্টার: “${query}”` : 'সব দেখানো হচ্ছে'}</p>

      {/* modals */}
      {modal && (
        <LocationModal
          open
          mode={modal.mode}
          parent={modal.parent}
          locationToEdit={modal.target}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <LocationImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={() => router.refresh()} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="এলাকা মুছবেন?"
        description={
          deleteTarget
            ? `"${locationName(deleteTarget)}" মুছে ফেলা হবে। ফাঁকা পাতা ছাড়া মোছা ব্লক করা হয় — ভেতরে সাব-এলাকা বা হাসপাতাল/চেম্বার থাকলে প্রথমে সেগুলো সরাতে হবে।`
            : ''
        }
        confirmLabel="মুছুন"
        variant="danger"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
