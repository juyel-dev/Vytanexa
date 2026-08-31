'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';

type Row = {
  id: string;
  placement: string;
  sponsor_name: string;
  image_url: string;
  target_url: string;
  display_order: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
};

export function AdsManager({ ads }: { ads: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<Row | null | undefined>(undefined);
  const [del, setDel] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const [placement, setPlacement] = useState<'homepage_banner' | 'native_feed'>('homepage_banner');
  const [sponsor, setSponsor] = useState('');
  const [image, setImage] = useState('');
  const [target, setTarget] = useState('');
  const [order, setOrder] = useState('0');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setPlacement('homepage_banner'); setSponsor(''); setImage(''); setTarget(''); setOrder('0'); setStart(''); setEnd(''); setIsActive(true);
    setModal(null);
  };
  const openEdit = (r: Row) => {
    setPlacement(r.placement as 'homepage_banner' | 'native_feed'); setSponsor(r.sponsor_name); setImage(r.image_url); setTarget(r.target_url); setOrder(String(r.display_order)); setStart(r.start_date); setEnd(r.end_date); setIsActive(r.is_active);
    setModal(r);
  };

  const handleSave = async () => {
    if (!sponsor.trim() || !image.trim() || !target.trim() || !start || !end) { toast.push('সব আবশ্যক ফিল্ড পূরণ করুন', 'error'); return; }
    setBusy(true);
    const payload = { placement, sponsor_name: sponsor.trim(), image_url: image.trim(), target_url: target.trim(), display_order: Number(order) || 0, start_date: start, end_date: end, is_active: isActive };
    const isEdit = modal && typeof modal !== 'undefined' && (modal as Row).id;
    const url = isEdit ? `/api/admin/ads/${(modal as Row).id}` : '/api/admin/ads';
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
    const res = await fetch(`/api/admin/ads/${del.id}`, { method: 'DELETE' }).catch(() => null);
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
        <button onClick={openCreate} className="h-10 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন বিজ্ঞাপন</button>
      </div>

      <DataTable
        columns={['থাম্বনেইল', 'স্পন্সর', 'প্লেসমেন্ট', 'সক্রিয়', 'ভিউ', 'ক্লিক', 'CTR', 'একশন']}
        rows={ads}
        rowKey={(r) => r.id}
        emptyMessage="কোনো বিজ্ঞাপন নেই।"
        renderRow={(r) => {
          const ctr = r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(1) : '0.0';
          return (
            <>
              <td className="px-3 py-2"><img src={r.image_url} alt={r.sponsor_name} className="h-9 w-14 rounded object-cover" /></td>
              <td className="px-3 py-2 text-admin-body font-medium text-neutral-900">{r.sponsor_name}</td>
              <td className="px-3 py-2 text-admin-small text-neutral-600">{r.placement === 'homepage_banner' ? 'হোমপেজ ব্যানার' : 'নেটিভ ফিড'}</td>
              <td className="px-3 py-2">{r.is_active ? <span className="rounded-full bg-life-100 px-2 py-0.5 text-[11px] font-medium text-life-700">✅</span> : <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600">—</span>}</td>
              <td className="px-3 py-2 text-admin-body text-neutral-700">{r.impressions}</td>
              <td className="px-3 py-2 text-admin-body text-neutral-700">{r.clicks}</td>
              <td className="px-3 py-2 text-admin-small text-neutral-600">{ctr}%</td>
              <td className="px-3 py-2">
                <span className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-neutral-600 hover:bg-neutral-50"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDel(r)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </td>
            </>
          );
        }}
      />

      {modal !== undefined && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setModal(undefined)} />
          <div className="relative w-full max-w-lg rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">{modal ? 'বিজ্ঞাপন সম্পাদনা' : 'নতুন বিজ্ঞাপন'}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <p className="text-admin-small font-medium text-neutral-700">প্লেসমেন্ট *</p>
                <label className="mt-1 flex items-center gap-2 text-admin-body text-neutral-700"><input type="radio" checked={placement === 'homepage_banner'} onChange={() => setPlacement('homepage_banner')} className="h-4 w-4" /> হোমপেজ ব্যানার (2:1)</label>
                <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="radio" checked={placement === 'native_feed'} onChange={() => setPlacement('native_feed')} className="h-4 w-4" /> নেটিভ ফিড (16:6)</label>
              </div>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">স্পন্সরের নাম *</span><input value={sponsor} onChange={(e) => setSponsor(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ছবি * (aspect {placement === 'homepage_banner' ? '2:1' : '16:6'})</span><input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">লিংক (Target URL) *</span><input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ক্রম</span><input value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">শুরু *</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">শেষ *</span><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
              </div>
              <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" /> সক্রিয়</label>
              {modal && typeof modal !== 'undefined' && (modal as Row).impressions !== undefined && (
                <div className="rounded-md border border-admin-border bg-neutral-50 px-3 py-2 text-admin-small text-neutral-600">
                  পারফরম্যান্স — ইমপ্রেশন: {(modal as Row).impressions} · ক্লিক: {(modal as Row).clicks} · CTR: {((modal as Row).clicks / Math.max(1, (modal as Row).impressions) * 100).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(undefined)} className="h-9 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">বাতিল</button>
              <button onClick={handleSave} disabled={busy} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!del} title="বিজ্ঞাপন মুছবেন?" description={del ? `"${del.sponsor_name}" মুছে ফেলা হবে।` : ''} confirmLabel="মুছুন" variant="danger" busy={busy} onConfirm={handleDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
