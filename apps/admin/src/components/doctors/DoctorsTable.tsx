'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreHorizontal, Star } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { doctorName, VERIFICATION_LABEL } from '@/lib/doctor-utils';
import { categoryName } from '@/lib/category-utils';

type DoctorRow = {
  id: string;
  slug: string;
  name_translations: { bn?: string; en?: string } | null;
  photo_url: string | null;
  category_id: string;
  verification_status: string;
  is_available: boolean;
  is_featured: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  categories: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string } | null;
  primary_location_name: string | null;
  primary_chamber_name: string | null;
};

type Props = {
  doctors: DoctorRow[];
  total: number;
  page: number;
  perPage: number;
  categories: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string }[];
  locations: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string; type: string }[];
  currentFilters: { q: string; status: string; categoryId: string; locationId: string; sort: string; order: string };
};

function buildUrl(filters: Props['currentFilters'] & { page?: number }) {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.status && filters.status !== 'all') p.set('status', filters.status);
  if (filters.categoryId) p.set('category', filters.categoryId);
  if (filters.locationId) p.set('location', filters.locationId);
  if (filters.page && filters.page > 1) p.set('page', String(filters.page));
  if (filters.sort && filters.sort !== 'created_at') p.set('sort', filters.sort);
  if (filters.order && filters.order !== 'desc') p.set('order', filters.order);
  const s = p.toString();
  return s ? `/doctors?${s}` : '/doctors';
}

export function DoctorsTable({ doctors, total, page, perPage, categories, locations, currentFilters }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qInput, setQInput] = useState(currentFilters.q);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoctorRow | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<DoctorRow | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const allSelected = doctors.length > 0 && doctors.every((d) => selected.has(d.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(doctors.map((d) => d.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pushFilters = (patch: Partial<Props['currentFilters']> & { page?: number }) => {
    const next: Props['currentFilters'] & { page?: number } = { ...currentFilters, ...patch };
    // reset page when filters change (unless page explicitly patched)
    if (patch.q !== undefined || patch.status !== undefined || patch.categoryId !== undefined || patch.locationId !== undefined) {
      if (patch.page === undefined) next.page = 1;
    }
    router.push(buildUrl(next));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushFilters({ q: qInput });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/admin/doctors/${deleteTarget.id}`, { method: 'DELETE' }).catch(() => null);
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

  const handleVerify = async (status: 'verified' | 'suspended' | 'rejected') => {
    if (!verifyTarget) return;
    setBusy(true);
    const res = await fetch(`/api/admin/doctors/${verifyTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_status: status }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast.push(data?.error ?? 'স্ট্যাটাস পরিবর্তন করা যায়নি', 'error');
      return;
    }
    toast.push('স্ট্যাটাস আপডেট হয়েছে ✅', 'success');
    setVerifyTarget(null);
    router.refresh();
  };

  const handleBulk = async (action: 'verify' | 'suspend' | 'reject' | 'feature' | 'unfeature') => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    const res = await fetch('/api/admin/doctors/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast.push(data?.error ?? 'বাল্ক অ্যাকশন করা যায়নি', 'error');
      return;
    }
    toast.push(`${ids.length} জন আপডেট হয়েছে ✅`, 'success');
    setSelected(new Set());
    router.refresh();
  };

  const catMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, categoryName(c));
    return m;
  }, [categories]);

  return (
    <div className="flex flex-col gap-3">
      {/* filters */}
      <div className="flex flex-col gap-2 rounded-xl border border-admin-border bg-white p-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="খুঁজুন... (নাম / slug)"
            className="h-9 w-full rounded-md border border-admin-border pl-9 pr-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </form>

        <select
          value={currentFilters.status}
          onChange={(e) => pushFilters({ status: e.target.value })}
          className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body"
        >
          <option value="all">সব স্ট্যাটাস</option>
          <option value="pending">পেন্ডিং</option>
          <option value="verified">ভেরিফাইড</option>
          <option value="rejected">প্রত্যাখ্যাত</option>
          <option value="suspended">সাসপেন্ডেড</option>
        </select>

        <select
          value={currentFilters.categoryId}
          onChange={(e) => pushFilters({ categoryId: e.target.value })}
          className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body"
        >
          <option value="">সব বিভাগ</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryName(c)}
            </option>
          ))}
        </select>

        <select
          value={currentFilters.locationId}
          onChange={(e) => pushFilters({ locationId: e.target.value })}
          className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body"
        >
          <option value="">সব এলাকা</option>
          {locations.map((l) => {
            const t = l.name_translations as { bn?: string; en?: string } | null;
            const name = (t?.bn || t?.en || l.slug) as string;
            return (
              <option key={l.id} value={l.id}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      {/* bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-admin-body">
          <span className="font-medium text-brand-700">{selected.size} জন নির্বাচিত</span>
          <span className="ml-auto flex flex-wrap gap-1.5">
            <button onClick={() => handleBulk('verify')} disabled={busy} className="rounded-md bg-life-600 px-3 py-1 text-admin-small font-medium text-white hover:bg-life-700 disabled:opacity-50">
              ✅ ভেরিফাই
            </button>
            <button onClick={() => handleBulk('suspend')} disabled={busy} className="rounded-md bg-neutral-700 px-3 py-1 text-admin-small font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              🚫 সাসপেন্ড
            </button>
            <button onClick={() => handleBulk('feature')} disabled={busy} className="rounded-md bg-brand-600 px-3 py-1 text-admin-small font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              ⭐ ফিচার
            </button>
            <button onClick={() => handleBulk('unfeature')} disabled={busy} className="rounded-md border border-admin-border bg-white px-3 py-1 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
              আন-ফিচার
            </button>
            <button onClick={() => setSelected(new Set())} className="rounded-md px-2 py-1 text-admin-small text-neutral-500 hover:text-neutral-700">
              ✕ বাতিল
            </button>
          </span>
        </div>
      )}

      {/* table */}
      <DataTable
        columns={[
          <input key="select-all" type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-admin-border" />,
          'ফটো',
          'নাম',
          'বিভাগ',
          'এলাকা',
          'স্ট্যাটাস',
          'রেটিং',
          'একশন',
        ]}
        rows={doctors}
        rowKey={(d) => d.id}
        emptyMessage="কোনো ডাক্তার পাওয়া যায়নি। ফিল্টার বদলান বা নতুন ডাক্তার যোগ করুন।"
        pagination={{
          total,
          page,
          totalPages,
          itemLabel: ' জন ডাক্তার',
          onPrev: () => pushFilters({ page: page - 1 }),
          onNext: () => pushFilters({ page: page + 1 }),
        }}
        renderRow={(doc) => {
          const st = VERIFICATION_LABEL[doc.verification_status as keyof typeof VERIFICATION_LABEL] ?? VERIFICATION_LABEL.pending;
          return (
            <>
              <td className="px-3 py-2">
                <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleOne(doc.id)} className="h-4 w-4 rounded border-admin-border" />
              </td>
              <td className="px-3 py-2">
                {doc.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.photo_url} alt={doctorName(doc)} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-[14px]">👤</span>
                )}
              </td>
              <td className="px-3 py-2">
                <a href={`/doctors/${doc.id}`} className="block text-admin-body font-medium text-neutral-900 hover:text-brand-600">
                  {doctorName(doc)}
                </a>
                <span className="block text-admin-small text-neutral-400">/{doc.slug}</span>
              </td>
              <td className="px-3 py-2 text-admin-body text-neutral-700">{doc.categories ? categoryName(doc.categories) : catMap.get(doc.category_id) ?? '—'}</td>
              <td className="px-3 py-2 text-admin-body text-neutral-600">{doc.primary_location_name ?? '—'}</td>
              <td className="px-3 py-2">
                <StatusBadge status={st.color} label={st.bn} />
                {!doc.is_available && <span className="ml-1 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-600">অফলাইন</span>}
                {doc.is_featured && <span className="ml-1 text-[12px]">⭐</span>}
              </td>
              <td className="px-3 py-2 text-admin-body text-neutral-700">
                {doc.rating_count > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" /> {Number(doc.rating_avg).toFixed(1)}
                  </span>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="relative">
                  <button onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-neutral-600 hover:bg-neutral-50" aria-label="একশন">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenuId === doc.id && (
                    <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-admin-border bg-white py-1 shadow-lg">
                      <a href={`/doctors/${doc.id}`} className="block px-3 py-1.5 text-admin-body text-neutral-700 hover:bg-neutral-50">
                        ✏️ এডিট
                      </a>
                      <button onClick={() => { setVerifyTarget(doc); setOpenMenuId(null); }} className="block w-full px-3 py-1.5 text-left text-admin-body text-neutral-700 hover:bg-neutral-50">
                        ✅ ভেরিফাই / সাসপেন্ড
                      </button>
                      <a href={`/doctors/${doc.id}`} className="block px-3 py-1.5 text-admin-body text-neutral-700 hover:bg-neutral-50">
                        🚫 সাসপেন্ড
                      </a>
                      <button onClick={() => { setDeleteTarget(doc); setOpenMenuId(null); }} className="block w-full px-3 py-1.5 text-left text-admin-body text-emergency-600 hover:bg-neutral-50">
                        🗑️ মুছুন
                      </button>
                      <a href={`https://vytanexa.app/doctors/${doc.slug}`} target="_blank" rel="noopener noreferrer" className="block px-3 py-1.5 text-admin-body text-brand-600 hover:bg-neutral-50">
                        👁️ প্রোফাইল দেখুন ↗
                      </a>
                    </div>
                  )}
                </div>
              </td>
            </>
          );
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="ডাক্তার মুছবেন?"
        description={deleteTarget ? `"${doctorName(deleteTarget)}" সফট-ডিলিট হবে (deleted_at)। প্রোফাইল পাবলিক অ্যাপে আর দেখাবে না, কিন্তু রিভিউ/অডিট ইতিহাস থাকবে।` : ''}
        confirmLabel="মুছুন"
        variant="danger"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* verification modal — simple */}
      {verifyTarget && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setVerifyTarget(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">ভেরিফিকেশন স্ট্যাটাস পরিবর্তন</h2>
            <p className="mt-1 text-admin-body text-neutral-500">বর্তমান: {VERIFICATION_LABEL[verifyTarget.verification_status as keyof typeof VERIFICATION_LABEL]?.bn ?? verifyTarget.verification_status}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => handleVerify('verified')} disabled={busy} className="h-10 rounded-md bg-life-600 px-4 text-admin-body font-semibold text-white hover:bg-life-700 disabled:opacity-50">
                ✅ ভেরিফাই করুন (পাবলিক অ্যাপে দেখা যাবে)
              </button>
              <button onClick={() => handleVerify('rejected')} disabled={busy} className="h-10 rounded-md border border-emergency-200 bg-emergency-50 px-4 text-admin-body font-medium text-emergency-700 hover:bg-emergency-100 disabled:opacity-50">
                ❌ প্রত্যাখ্যান করুন
              </button>
              <button onClick={() => handleVerify('suspended')} disabled={busy} className="h-10 rounded-md border border-admin-border bg-white px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
                🚫 সাসপেন্ড করুন
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setVerifyTarget(null)} className="h-9 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
