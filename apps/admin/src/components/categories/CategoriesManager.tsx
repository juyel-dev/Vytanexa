'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Pencil, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CategoryModal } from './CategoryModal';
import { categoryName, iconEmoji } from '@/lib/category-utils';

type CatRow = {
  id: string;
  name_translations: { bn?: string; en?: string; hi?: string } | null;
  slug: string;
  icon_key: string | null;
  search_keywords: string[];
  display_order: number;
  is_visible_home: boolean;
  is_active: boolean;
  doctor_count?: number;
};

type Props = { initialCategories: CatRow[] };

export function CategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [cats, setCats] = useState<CatRow[]>(() => [...initialCategories].sort((a, b) => a.display_order - b.display_order));
  const [query, setQuery] = useState('');
  const [modalCat, setModalCat] = useState<CatRow | null | undefined>(undefined); // undefined = closed, null = create, CatRow = edit
  const [deleteTarget, setDeleteTarget] = useState<CatRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);

  useEffect(() => {
    setCats([...initialCategories].sort((a, b) => a.display_order - b.display_order));
  }, [initialCategories]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return cats;
    return cats.filter((c) => {
      const t = (c.name_translations ?? {}) as { bn?: string; en?: string; hi?: string };
      const hay = [t.bn ?? '', t.en ?? '', t.hi ?? '', c.slug, ...(c.search_keywords ?? [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [cats, query]);

  const move = async (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= cats.length) return;
    // only allow moves within the full ordered list, not filtered — reorder the cats array directly
    const next = [...cats];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(newIdx, 0, moved);
    setCats(next);
    setReorderBusy(true);
    const res = await fetch('/api/admin/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: next.map((c) => c.id) }),
    }).catch(() => null);
    setReorderBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast.push(data?.error ?? 'ক্রম সংরক্ষণ করা যায়নি', 'error');
      setCats([...initialCategories].sort((a, b) => a.display_order - b.display_order));
      return;
    }
    toast.push('ক্রম সংরক্ষিত হয়েছে ✅', 'success');
    router.refresh();
  };

  const toggleHome = async (cat: CatRow) => {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible_home: !cat.is_visible_home }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast.push(data?.error ?? 'আপডেট করা যায়নি', 'error');
      return;
    }
    toast.push('আপডেট হয়েছে ✅', 'success');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast.push(data?.error ?? 'মুছে ফেলা যায়নি', 'error');
      return;
    }
    toast.push('মুছে ফেলা হয়েছে', 'success');
    setDeleteTarget(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="বিভাগ খুঁজুন... (বাংলা / English / slug)"
            className="h-10 w-full rounded-lg border border-admin-border bg-white pl-9 pr-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button
          onClick={() => setModalCat(null)}
          className="h-10 shrink-0 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700"
        >
          + নতুন বিভাগ যোগ করুন
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-admin-body text-neutral-500">
            {cats.length === 0 ? 'এখনো কোনো বিভাগ যোগ করা হয়নি।' : `“${query}” এর সাথে মিলে এমন কোনো বিভাগ নেই।`}
          </div>
        ) : (
          <ul className="divide-y divide-admin-border">
            {filtered.map((cat) => {
              // find index in the full cats array for reorder correctness
              const idx = cats.findIndex((c) => c.id === cat.id);
              return (
                <li key={cat.id} className={`flex items-center gap-2 px-3 py-2.5 ${!cat.is_active ? 'opacity-60' : ''}`}>
                  {/* reorder handles */}
                  <span className="flex shrink-0 flex-col gap-0.5">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || reorderBusy}
                      className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"
                      aria-label="উপরে সরান"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === cats.length - 1 || reorderBusy}
                      className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"
                      aria-label="নিচে সরান"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </span>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[18px]" aria-hidden>
                    {iconEmoji(cat.icon_key)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-admin-body font-medium text-neutral-900">{categoryName(cat)}</span>
                    <span className="block truncate text-admin-small text-neutral-400">
                      /{cat.slug} · {cat.doctor_count ?? 0} জন ডাক্তার
                      {cat.search_keywords?.length ? ` · ${cat.search_keywords.slice(0, 3).join(', ')}` : ''}
                    </span>
                  </span>

                  <label className="hidden shrink-0 items-center gap-1.5 text-admin-small text-neutral-600 sm:flex">
                    <input type="checkbox" checked={cat.is_visible_home} onChange={() => toggleHome(cat)} className="h-4 w-4 rounded border-admin-border" />
                    হোমপেজে
                  </label>

                  {!cat.is_active && <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600">নিষ্ক্রিয়</span>}

                  <span className="ml-1 flex shrink-0 items-center gap-1">
                    <button onClick={() => setModalCat(cat)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-neutral-600 hover:bg-neutral-50" aria-label="সম্পাদনা">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(cat)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50" aria-label="মুছুন">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-admin-small text-neutral-400">
        মোট {cats.length}টি বিভাগ · display_order হোমপেজের Category Grid-এ সরাসরি প্রতিফলিত হয়
      </p>

      {modalCat !== undefined && (
        <CategoryModal
          open
          category={modalCat}
          onClose={() => setModalCat(undefined)}
          onSaved={() => {
            toast.push('সংরক্ষিত হয়েছে ✅', 'success');
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="বিভাগ মুছবেন?"
        description={deleteTarget ? `"${categoryName(deleteTarget)}" মুছে ফেলা হবে। এই বিভাগে ডাক্তার যুক্ত থাকলে প্রথমে তাদের অন্য বিভাগে সরাতে হবে।` : ''}
        confirmLabel="মুছুন"
        variant="danger"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
