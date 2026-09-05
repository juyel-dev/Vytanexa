'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Search } from 'lucide-react';

type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
type Donor = { id: string; name: string; phone: string; blood_group: string; location_id: string; location_name: string; last_donated_at: string | null; verification_status: VerificationStatus };
type HospInv = { id: string; name: string; inventory: { blood_group: string; stock_level: string; reported_at: string }[] };
type District = { id: string; name_translations: { bn?: string; en?: string } | null; slug: string };
type Filters = { q: string; group: string; locationId: string };

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
const STOCK_LABEL: Record<string, string> = { available: '✅ উপলব্ধ', low: '⚠️ কম', unavailable: '❌ নেই', unknown: '—' };

function districtName(d: District) {
  return d.name_translations?.bn || d.name_translations?.en || d.slug;
}

function buildUrl(filters: Filters & { page?: number }) {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.group) p.set('group', filters.group);
  if (filters.locationId) p.set('location', filters.locationId);
  if (filters.page && filters.page > 1) p.set('page', String(filters.page));
  const s = p.toString();
  return s ? `/blood-donors?${s}` : '/blood-donors';
}

export function BloodManager({
  donors,
  total,
  page,
  perPage,
  currentFilters,
  hospitals,
  districts,
}: {
  donors: Donor[];
  total: number;
  page: number;
  perPage: number;
  currentFilters: Filters;
  hospitals: HospInv[];
  districts: District[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<'donors' | 'inventory'>('donors');
  const [qInput, setQInput] = useState(currentFilters.q);
  const [del, setDel] = useState<Donor | null>(null);
  const [busy, setBusy] = useState(false);

  // inventory editing state: hospId -> group -> stock
  const [invEdits, setInvEdits] = useState<Record<string, Record<string, string>>>({});

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // BLOOD-SERVICE-PLAN.md Phase A.7/A.8 — filters are now URL-driven
  // (server re-queries with search + pagination), matching the same
  // pattern DoctorsTable already uses, rather than filtering a
  // client-side array capped at 200 rows.
  const pushFilters = (patch: Partial<Filters> & { page?: number }) => {
    const next: Filters & { page?: number } = { ...currentFilters, ...patch };
    if (patch.q !== undefined || patch.group !== undefined || patch.locationId !== undefined) {
      if (patch.page === undefined) next.page = 1;
    }
    router.push(buildUrl(next));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushFilters({ q: qInput });
  };

  // BLOOD-SERVICE-PLAN.md follow-up (login-gate + scalability pass) —
  // is_active replaced by the same verification_status enum
  // hospitals/ambulance_services already use. Donors publish instantly
  // (default 'verified'); this is the moderator's manual-WhatsApp-check
  // suspend/reinstate action, not an approval queue.
  const handleSetStatus = async (d: Donor, status: VerificationStatus) => {
    const res = await fetch(`/api/admin/blood-donors/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verification_status: status }) }).catch(() => null);
    if (!res || !res.ok) { const j = res ? await res.json().catch(() => null) : null; toast.push(j?.error ?? 'আপডেট করা যায়নি', 'error'); return; }
    toast.push('আপডেট হয়েছে ✅', 'success');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!del) return;
    setBusy(true);
    const res = await fetch(`/api/admin/blood-donors/${del.id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) { const j = res ? await res.json().catch(() => null) : null; toast.push(j?.error ?? 'মুছে ফেলা যায়নি', 'error'); return; }
    toast.push('মুছে ফেলা হয়েছে', 'success');
    setDel(null);
    router.refresh();
  };

  const setInv = (hospId: string, group: string, level: string) => {
    setInvEdits((prev) => ({ ...prev, [hospId]: { ...(prev[hospId] ?? {}), [group]: level } }));
  };

  const saveInventory = async (hospId: string) => {
    const edits = invEdits[hospId] ?? {};
    const hosp = hospitals.find((h) => h.id === hospId);
    const base = hosp?.inventory ?? [];
    const inventory: { blood_group: string; stock_level: string }[] = GROUPS.map((g) => {
      const edited = edits[g];
      if (edited) return { blood_group: g, stock_level: edited };
      const existing = base.find((b) => b.blood_group === g);
      return { blood_group: g, stock_level: existing?.stock_level ?? 'unknown' };
    });
    const res = await fetch('/api/admin/blood-inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hospital_id: hospId, inventory }) }).catch(() => null);
    if (!res || !res.ok) { const j = res ? await res.json().catch(() => null) : null; toast.push(j?.error ?? 'স্টক আপডেট করা যায়নি', 'error'); return; }
    toast.push('স্টক সংরক্ষিত হয়েছে ✅', 'success');
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button onClick={() => setTab('donors')} className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'donors' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>রক্তদাতা তালিকা</button>
        <button onClick={() => setTab('inventory')} className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'inventory' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>ব্লাড ব্যাংক স্টক</button>
      </div>

      {tab === 'donors' ? (
        <>
          <div className="flex flex-wrap gap-2">
            <form onSubmit={handleSearchSubmit} className="flex h-9">
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="নাম বা ফোন দিয়ে খুঁজুন"
                className="h-9 w-48 rounded-l-md border border-r-0 border-admin-border bg-white px-2 text-admin-body"
              />
              <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-r-md border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50">
                <Search className="h-4 w-4" />
              </button>
            </form>
            <select
              value={currentFilters.group}
              onChange={(e) => pushFilters({ group: e.target.value })}
              className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body"
            >
              <option value="">সব গ্রুপ</option>
              {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={currentFilters.locationId}
              onChange={(e) => pushFilters({ locationId: e.target.value })}
              className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body"
            >
              <option value="">সব জেলা</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{districtName(d)}</option>
              ))}
            </select>
          </div>

          <DataTable
            columns={['নাম', 'গ্রুপ', 'এলাকা', 'শেষ দান', 'ফোন', 'স্ট্যাটাস', 'একশন']}
            rows={donors}
            rowKey={(d) => d.id}
            emptyMessage="কোনো রক্তদাতা নেই।"
            pagination={{
              total,
              page,
              totalPages,
              itemLabel: 'জন দাতা',
              onPrev: () => pushFilters({ page: page - 1 }),
              onNext: () => pushFilters({ page: page + 1 }),
            }}
            renderRow={(d) => (
              <>
                <td className="px-3 py-2 text-admin-body font-medium text-neutral-900">{d.name}</td>
                <td className="px-3 py-2"><span className="rounded-full bg-emergency-100 px-2 py-0.5 text-[12px] font-bold text-emergency-700">{d.blood_group}</span></td>
                <td className="px-3 py-2 text-admin-body text-neutral-600">{d.location_name}</td>
                <td className="px-3 py-2 text-admin-body text-neutral-600">{d.last_donated_at ? new Date(d.last_donated_at).toLocaleDateString('bn-BD') : '—'}</td>
                <td className="px-3 py-2 text-admin-body text-neutral-700">{d.phone}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    status={d.verification_status === 'verified' ? 'verified' : d.verification_status === 'suspended' ? 'suspended' : d.verification_status === 'rejected' ? 'rejected' : 'pending'}
                    label={d.verification_status === 'verified' ? '✅ সক্রিয়' : d.verification_status === 'suspended' ? 'স্থগিত' : d.verification_status === 'rejected' ? 'প্রত্যাখ্যাত' : 'পর্যালোচনাধীন'}
                  />
                </td>
                <td className="px-3 py-2">
                  <span className="flex gap-1">
                    {d.verification_status === 'verified' ? (
                      <button onClick={() => handleSetStatus(d, 'suspended')} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">স্থগিত করুন</button>
                    ) : (
                      <button onClick={() => handleSetStatus(d, 'verified')} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">সক্রিয় করুন</button>
                    )}
                    <button onClick={() => setDel(d)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-emergency-600 hover:bg-emergency-50">মুছুন</button>
                  </span>
                </td>
              </>
            )}
          />
          <ConfirmDialog open={!!del} title="রক্তদাতা মুছবেন?" description={del ? `"${del.name}" সফট-ডিলিট হবে।` : ''} confirmLabel="মুছুন" variant="danger" busy={busy} onConfirm={handleDelete} onCancel={() => setDel(null)} />
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {(() => {
            const staleCount = hospitals.filter((h) => {
              const latest = h.inventory.length ? Math.max(...h.inventory.map((b) => new Date(b.reported_at).getTime())) : null;
              return latest === null || Date.now() - latest > 48 * 60 * 60 * 1000;
            }).length;
            return staleCount > 0 ? (
              <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 text-admin-body text-accent-700">
                ⚠️ {staleCount}টি ব্যাংকের স্টক পুরনো বা রিপোর্ট করা নেই — ব্যবহারকারী অ্যাপে এগুলোর স্টক দেখানো হচ্ছে না।
              </div>
            ) : null;
          })()}
          {hospitals.length === 0 ? <div className="rounded-lg border border-admin-border bg-white p-6 text-admin-body text-neutral-500">কোনো হাসপাতালে ব্লাড ব্যাংক ট্যাগ নেই — হাসপাতাল ফর্মে facility_tags এ "ব্লাড ব্যাংক" টিক দিন।</div> : hospitals.map((h) => {
            const base = h.inventory;
            const edits = invEdits[h.id] ?? {};
            const latestMs = base.length ? Math.max(...base.map((b) => new Date(b.reported_at).getTime())) : null;
            const updatedAt = latestMs ? new Date(latestMs).toLocaleString('bn-BD') : '—';
            // BLOOD-SERVICE-PLAN.md Phase D — public read RLS hides stock
            // past 48h with no admin-facing signal at all; a bank could
            // go silently blank on the user app and nobody here would know.
            const isStale = latestMs === null || Date.now() - latestMs > 48 * 60 * 60 * 1000;
            return (
              <div key={h.id} className="rounded-xl border border-admin-border bg-white p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-admin-h3 text-neutral-900">{h.name}</h3>
                  {isStale && (
                    <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-medium text-accent-700">
                      ⚠️ স্টক পুরনো — ব্যবহারকারী অ্যাপে দেখানো হচ্ছে না
                    </span>
                  )}
                </div>
                <p className="text-admin-small text-neutral-400">সর্বশেষ আপডেট: {updatedAt}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GROUPS.map((g) => {
                    const existing = base.find((b) => b.blood_group === g)?.stock_level ?? 'unknown';
                    const val = edits[g] ?? existing;
                    return (
                      <label key={g} className="flex flex-col gap-1">
                        <span className="text-admin-small font-medium text-neutral-700">{g}</span>
                        <select value={val} onChange={(e) => setInv(h.id, g, e.target.value)} className="h-8 rounded-md border border-admin-border bg-white px-2 text-admin-small">
                          <option value="available">✅ উপলব্ধ</option>
                          <option value="low">⚠️ কম</option>
                          <option value="unavailable">❌ নেই</option>
                          <option value="unknown">—</option>
                        </select>
                      </label>
                    );
                  })}
                </div>
                <button onClick={() => saveInventory(h.id)} className="mt-3 h-9 rounded-md bg-brand-600 px-4 text-admin-body font-medium text-white hover:bg-brand-700">সংরক্ষণ করুন</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
