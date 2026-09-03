'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { sortLocationsHierarchically } from '@/lib/location-hierarchy';

type Donor = { id: string; name: string; phone: string; blood_group: string; location_id: string; location_name: string; last_donated_at: string | null; is_active: boolean };
type HospInv = { id: string; name: string; inventory: { blood_group: string; stock_level: string; reported_at: string }[] };

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
const STOCK_LABEL: Record<string, string> = { available: '✅ উপলব্ধ', low: '⚠️ কম', unavailable: '❌ নেই', unknown: '—' };

export function BloodManager({ donors, hospitals, locations }: { donors: Donor[]; hospitals: HospInv[]; locations: import('@/lib/location-hierarchy').LocationNode[] }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<'donors' | 'inventory'>('donors');
  const [qGroup, setQGroup] = useState('');
  const [qLoc, setQLoc] = useState('');
  const [del, setDel] = useState<Donor | null>(null);
  const [busy, setBusy] = useState(false);

  // inventory editing state: hospId -> group -> stock
  const [invEdits, setInvEdits] = useState<Record<string, Record<string, string>>>({});

  const filteredDonors = donors.filter((d) => {
    if (qGroup && d.blood_group !== qGroup) return false;
    if (qLoc && d.location_id !== qLoc) return false;
    return true;
  });

  const handleToggleActive = async (d: Donor) => {
    const res = await fetch(`/api/admin/blood-donors/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !d.is_active }) }).catch(() => null);
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
          <div className="flex gap-2">
            <select value={qGroup} onChange={(e) => setQGroup(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
              <option value="">সব গ্রুপ</option>
              {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={qLoc} onChange={(e) => setQLoc(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
              <option value="">সব এলাকা</option>
              {sortLocationsHierarchically(locations).map((l) => (
                <option key={l.id} value={l.id}>{'\u00A0\u00A0'.repeat(l.depth)}{l.label}</option>
              ))}
            </select>
          </div>

          <DataTable
            columns={['নাম', 'গ্রুপ', 'এলাকা', 'শেষ দান', 'ফোন', 'স্ট্যাটাস', 'একশন']}
            rows={filteredDonors}
            rowKey={(d) => d.id}
            emptyMessage="কোনো রক্তদাতা নেই।"
            renderRow={(d) => (
              <>
                <td className="px-3 py-2 text-admin-body font-medium text-neutral-900">{d.name}</td>
                <td className="px-3 py-2"><span className="rounded-full bg-emergency-100 px-2 py-0.5 text-[12px] font-bold text-emergency-700">{d.blood_group}</span></td>
                <td className="px-3 py-2 text-admin-body text-neutral-600">{d.location_name}</td>
                <td className="px-3 py-2 text-admin-body text-neutral-600">{d.last_donated_at ? new Date(d.last_donated_at).toLocaleDateString('bn-BD') : '—'}</td>
                <td className="px-3 py-2 text-admin-body text-neutral-700">{d.phone}</td>
                <td className="px-3 py-2">{d.is_active ? <span className="rounded-full bg-life-100 px-2 py-0.5 text-[11px] font-medium text-life-700">✅ সক্রিয়</span> : <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600">নিষ্ক্রিয়</span>}</td>
                <td className="px-3 py-2">
                  <span className="flex gap-1">
                    <button onClick={() => handleToggleActive(d)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">{d.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}</button>
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
          {hospitals.length === 0 ? <div className="rounded-lg border border-admin-border bg-white p-6 text-admin-body text-neutral-500">কোনো হাসপাতালে ব্লাড ব্যাংক ট্যাগ নেই — হাসপাতাল ফর্মে facility_tags এ "ব্লাড ব্যাংক" টিক দিন।</div> : hospitals.map((h) => {
            const base = h.inventory;
            const edits = invEdits[h.id] ?? {};
            const updatedAt = base.length ? new Date(Math.max(...base.map((b) => new Date(b.reported_at).getTime()))).toLocaleString('bn-BD') : '—';
            return (
              <div key={h.id} className="rounded-xl border border-admin-border bg-white p-4">
                <h3 className="text-admin-h3 text-neutral-900">{h.name}</h3>
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
