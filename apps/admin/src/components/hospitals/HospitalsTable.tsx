'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, MoreHorizontal, Star } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { hospitalName, HOSPITAL_TYPE_LABEL } from '@/lib/hospital-utils';
import { sortLocationsHierarchically } from '@/lib/location-hierarchy';

type Row = {
  id: string;
  slug: string;
  name_translations: { bn?: string; en?: string } | null;
  type: string;
  cover_image_url: string | null;
  location_name: string;
  has_emergency_dept: boolean;
  verification_status: string;
  is_featured: boolean;
  is_trending: boolean;
  rating_avg: number;
  rating_count: number;
};

type Props = {
  hospitals: Row[];
  total: number;
  page: number;
  perPage: number;
  locations: import('@/lib/location-hierarchy').LocationNode[];
  currentFilters: { q: string; status: string; type: string; locationId: string; emergency: string };
};

function buildUrl(f: Props['currentFilters'] & { page?: number }) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.status && f.status !== 'all') p.set('status', f.status);
  if (f.type) p.set('type', f.type);
  if (f.locationId) p.set('location', f.locationId);
  if (f.emergency) p.set('emergency', '1');
  if (f.page && f.page > 1) p.set('page', String(f.page));
  const s = p.toString();
  return s ? `/hospitals?${s}` : '/hospitals';
}

export function HospitalsTable({ hospitals, total, page, perPage, locations, currentFilters }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [qInput, setQInput] = useState(currentFilters.q);
  const [openId, setOpenId] = useState<string | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const push = (patch: Partial<Props['currentFilters']> & { page?: number }) => {
    const next: Props['currentFilters'] & { page?: number } = { ...currentFilters, ...patch };
    if (patch.q !== undefined || patch.status !== undefined || patch.type !== undefined || patch.locationId !== undefined || patch.emergency !== undefined) {
      if (patch.page === undefined) next.page = 1;
    }
    router.push(buildUrl(next));
  };

  const handleDelete = async () => {
    if (!del) return;
    setBusy(true);
    const res = await fetch(`/api/admin/hospitals/${del.id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'মুছে ফেলা যায়নি', 'error');
      return;
    }
    toast.push('মুছে ফেলা হয়েছে', 'success');
    setDel(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-admin-border bg-white p-3 sm:flex-row sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); push({ q: qInput }); }} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="খুঁজুন... (নাম / slug)" className="h-9 w-full rounded-md border border-admin-border pl-9 pr-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </form>
        <select value={currentFilters.status} onChange={(e) => push({ status: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="all">সব স্ট্যাটাস</option>
          <option value="pending">পেন্ডিং</option>
          <option value="verified">ভেরিফাইড</option>
          <option value="rejected">প্রত্যাখ্যাত</option>
          <option value="suspended">সাসপেন্ডেড</option>
        </select>
        <select value={currentFilters.type} onChange={(e) => push({ type: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="">সব ধরন</option>
          <option value="hospital">হাসপাতাল</option>
          <option value="clinic">ক্লিনিক</option>
          <option value="diagnostic">ডায়াগনস্টিক</option>
          <option value="nursing_home">নার্সিং হোম</option>
        </select>
        <select value={currentFilters.locationId} onChange={(e) => push({ locationId: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="">সব এলাকা</option>
          {sortLocationsHierarchically(locations).map((l) => (
            // Filter context (unlike a required create-field): every level
            // stays selectable — "just West Bengal" is a legitimate filter.
            <option key={l.id} value={l.id}>{'\u00A0\u00A0'.repeat(l.depth)}{l.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-admin-small text-neutral-600">
          <input type="checkbox" checked={currentFilters.emergency === '1'} onChange={(e) => push({ emergency: e.target.checked ? '1' : '' })} className="h-4 w-4 rounded border-admin-border" />
          শুধু জরুরি
        </label>
      </div>

      <DataTable
        columns={['ফটো', 'নাম', 'ধরন', 'এলাকা', 'জরুরি', 'স্ট্যাটাস', 'রেটিং', 'একশন']}
        rows={hospitals}
        rowKey={(h) => h.id}
        emptyMessage="কোনো হাসপাতাল পাওয়া যায়নি।"
        pagination={{
          total,
          page,
          totalPages,
          itemLabel: 'টি হাসপাতাল',
          onPrev: () => push({ page: page - 1 }),
          onNext: () => push({ page: page + 1 }),
        }}
        renderRow={(h) => (
          <>
            <td className="px-3 py-2">
              {h.cover_image_url ? <img src={h.cover_image_url} alt={hospitalName(h)} className="h-9 w-14 rounded object-cover" /> : <span className="flex h-9 w-14 items-center justify-center rounded bg-neutral-100 text-[14px]">🏥</span>}
            </td>
            <td className="px-3 py-2">
              <a href={`/hospitals/${h.id}`} className="block text-admin-body font-medium text-neutral-900 hover:text-brand-600">{hospitalName(h)}</a>
              <span className="block text-admin-small text-neutral-400">/{h.slug}</span>
            </td>
            <td className="px-3 py-2 text-admin-body text-neutral-700">{HOSPITAL_TYPE_LABEL[h.type as keyof typeof HOSPITAL_TYPE_LABEL]?.bn ?? h.type}</td>
            <td className="px-3 py-2 text-admin-body text-neutral-600">{h.location_name}</td>
            <td className="px-3 py-2">{h.has_emergency_dept ? <span className="rounded-full bg-emergency-100 px-2 py-0.5 text-[11px] font-medium text-emergency-700">🚨 আছে</span> : <span className="text-admin-small text-neutral-400">—</span>}</td>
            <td className="px-3 py-2"><StatusBadge status={h.verification_status === 'verified' ? 'verified' : h.verification_status === 'pending' ? 'pending' : 'rejected'} label={h.verification_status} />{h.is_featured && <span className="ml-1">⭐</span>}</td>
            <td className="px-3 py-2 text-admin-body text-neutral-700">{h.rating_count > 0 ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />{Number(h.rating_avg).toFixed(1)}</span> : <span className="text-neutral-400">—</span>}</td>
            <td className="px-3 py-2">
              <div className="relative">
                <button onClick={() => setOpenId(openId === h.id ? null : h.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-neutral-600 hover:bg-neutral-50"><MoreHorizontal className="h-4 w-4" /></button>
                {openId === h.id && (
                  <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-admin-border bg-white py-1 shadow-lg">
                    <a href={`/hospitals/${h.id}`} className="block px-3 py-1.5 text-admin-body text-neutral-700 hover:bg-neutral-50">✏️ এডিট</a>
                    <button onClick={() => { setDel(h); setOpenId(null); }} className="block w-full px-3 py-1.5 text-left text-admin-body text-emergency-600 hover:bg-neutral-50">🗑️ মুছুন</button>
                    <a href={`https://vytanexa.app/hospitals/${h.slug}`} target="_blank" rel="noopener noreferrer" className="block px-3 py-1.5 text-admin-body text-brand-600 hover:bg-neutral-50">👁️ দেখুন ↗</a>
                  </div>
                )}
              </div>
            </td>
          </>
        )}
      />

      <ConfirmDialog open={!!del} title="হাসপাতাল মুছবেন?" description={del ? `"${hospitalName(del)}" সফট-ডিলিট হবে।` : ''} confirmLabel="মুছুন" variant="danger" busy={busy} onConfirm={handleDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
