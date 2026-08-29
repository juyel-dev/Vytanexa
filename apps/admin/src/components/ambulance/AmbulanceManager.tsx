'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';

type Row = {
  id: string;
  name_translations: { bn?: string; en?: string } | null;
  location_id: string;
  location_name: string;
  phone: string;
  whatsapp_number: string | null;
  hospital_id: string | null;
  hospital_name: string;
  vehicle_count: number | null;
  is_icu_equipped: boolean;
  per_km_rate: number | null;
  coverage_radius_km: number | null;
  is_24x7: boolean;
  verification_status: string;
  is_active: boolean;
};

type Props = {
  ambulances: Row[];
  locations: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string }[];
  hospitals: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string }[];
};

function nameOf(r: Row) {
  const t = r.name_translations as { bn?: string; en?: string } | null;
  return (t?.bn || t?.en || '—') as string;
}

export function AmbulanceManager({ ambulances, locations, hospitals }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<Row | null | undefined>(undefined);
  const [del, setDel] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  // form state for modal
  const [bn, setBn] = useState('');
  const [en, setEn] = useState('');
  const [locId, setLocId] = useState('');
  const [phone, setPhone] = useState('');
  const [wa, setWa] = useState('');
  const [hospId, setHospId] = useState('');
  const [vehicles, setVehicles] = useState('');
  const [icu, setIcu] = useState(false);
  const [rate, setRate] = useState('');
  const [radius, setRadius] = useState('');
  const [is24x7, setIs24x7] = useState(true);
  const [verification, setVerification] = useState('pending');

  const openCreate = () => {
    setBn(''); setEn(''); setLocId(''); setPhone(''); setWa(''); setHospId(''); setVehicles(''); setIcu(false); setRate(''); setRadius(''); setIs24x7(true); setVerification('pending');
    setModal(null);
  };
  const openEdit = (r: Row) => {
    const t = r.name_translations as { bn?: string; en?: string } | null;
    setBn(t?.bn ?? ''); setEn(t?.en ?? ''); setLocId(r.location_id); setPhone(r.phone); setWa(r.whatsapp_number ?? ''); setHospId(r.hospital_id ?? ''); setVehicles(r.vehicle_count != null ? String(r.vehicle_count) : ''); setIcu(r.is_icu_equipped); setRate(r.per_km_rate != null ? String(r.per_km_rate) : ''); setRadius(r.coverage_radius_km != null ? String(r.coverage_radius_km) : ''); setIs24x7(r.is_24x7); setVerification(r.verification_status);
    setModal(r);
  };

  const handleSave = async () => {
    if (!bn.trim() || !locId || !phone.trim()) { toast.push('বাংলা নাম, এলাকা ও ফোন বাধ্যতামূলক', 'error'); return; }
    setBusy(true);
    const payload = {
      name_translations: { bn: bn.trim(), en: en.trim(), hi: '' },
      location_id: locId,
      phone: phone.trim(),
      whatsapp_number: wa.trim() || undefined,
      hospital_id: hospId || null,
      vehicle_count: vehicles === '' ? null : Number(vehicles),
      is_icu_equipped: icu,
      per_km_rate: rate === '' ? null : Number(rate),
      coverage_radius_km: radius === '' ? null : Number(radius),
      is_24x7: is24x7,
      verification_status: verification,
    };
    const isEdit = modal && typeof modal !== 'undefined' && (modal as Row).id;
    const url = isEdit ? `/api/admin/ambulance/${(modal as Row).id}` : '/api/admin/ambulance';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'সংরক্ষণ করা যায়নি', 'error');
      return;
    }
    toast.push('সংরক্ষিত হয়েছে ✅', 'success');
    setModal(undefined);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!del) return;
    setBusy(true);
    const res = await fetch(`/api/admin/ambulance/${del.id}`, { method: 'DELETE' }).catch(() => null);
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
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="h-10 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন অ্যাম্বুলেন্স</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">নাম</th>
                <th className="px-3 py-2">এলাকা</th>
                <th className="px-3 py-2">ফোন</th>
                <th className="px-3 py-2">হাসপাতাল</th>
                <th className="px-3 py-2">গাড়ি</th>
                <th className="px-3 py-2">ICU</th>
                <th className="px-3 py-2">স্ট্যাটাস</th>
                <th className="px-3 py-2">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {ambulances.length === 0 ? <tr><td colSpan={8} className="px-6 py-10 text-center text-admin-body text-neutral-500">কোনো অ্যাম্বুলেন্স নেই।</td></tr> : ambulances.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 text-admin-body font-medium text-neutral-900">{nameOf(r)}</td>
                  <td className="px-3 py-2 text-admin-body text-neutral-600">{r.location_name}</td>
                  <td className="px-3 py-2 text-admin-body text-neutral-700">{r.phone}</td>
                  <td className="px-3 py-2 text-admin-body text-neutral-600">{r.hospital_name}</td>
                  <td className="px-3 py-2 text-admin-body text-neutral-700">{r.vehicle_count ?? '—'}</td>
                  <td className="px-3 py-2">{r.is_icu_equipped ? '✅' : '—'}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.verification_status === 'verified' ? 'verified' : 'pending'} label={r.verification_status} />{r.is_24x7 && <span className="ml-1 text-[11px]">24/7</span>}</td>
                  <td className="px-3 py-2">
                    <span className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-neutral-600 hover:bg-neutral-50"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDel(r)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== undefined && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setModal(undefined)} />
          <div className="relative w-full max-w-lg rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">{modal ? 'অ্যাম্বুলেন্স সম্পাদনা' : 'নতুন অ্যাম্বুলেন্স'}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">নাম (বাংলা) *</span><input value={bn} onChange={(e) => setBn(e.target.value)} placeholder="সিটি অ্যাম্বুলেন্স" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">Name (English)</span><input value={en} onChange={(e) => setEn(e.target.value)} placeholder="City Ambulance" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">এলাকা *</span>
                <select value={locId} onChange={(e) => setLocId(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                  <option value="">নির্বাচন করুন</option>
                  {locations.map((l) => {
                    const t = l.name_translations as { bn?: string; en?: string } | null;
                    return <option key={l.id} value={l.id}>{(t?.bn || t?.en || l.slug) as string}</option>;
                  })}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ফোন *</span><input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">WhatsApp</span><input value={wa} onChange={(e) => setWa(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              </div>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">সংযুক্ত হাসপাতাল (ঐচ্ছিক)</span>
                <select value={hospId} onChange={(e) => setHospId(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                  <option value="">— স্বাধীন —</option>
                  {hospitals.map((h) => {
                    const t = h.name_translations as { bn?: string; en?: string } | null;
                    return <option key={h.id} value={h.id}>{(t?.bn || t?.en || h.slug) as string}</option>;
                  })}
                </select>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">গাড়ি সংখ্যা</span><input value={vehicles} onChange={(e) => setVehicles(e.target.value)} inputMode="numeric" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">প্রতি কিমি ভাড়া</span><input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">কভারেজ (কিমি)</span><input value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="decimal" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
              </div>
              <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={icu} onChange={(e) => setIcu(e.target.checked)} className="h-4 w-4" /> ICU সুবিধা</label>
              <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={is24x7} onChange={(e) => setIs24x7(e.target.checked)} className="h-4 w-4" /> ২৪/৭</label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ভেরিফিকেশন</span>
                <select value={verification} onChange={(e) => setVerification(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                  <option value="pending">পেন্ডিং</option><option value="verified">ভেরিফাইড</option><option value="rejected">প্রত্যাখ্যাত</option><option value="suspended">সাসপেন্ডেড</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(undefined)} className="h-10 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">বাতিল</button>
              <button onClick={handleSave} disabled={busy} className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!del} title="অ্যাম্বুলেন্স মুছবেন?" description={del ? `"${nameOf(del)}" সফট-ডিলিট হবে।` : ''} confirmLabel="মুছুন" variant="danger" busy={busy} onConfirm={handleDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
