'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

type Plan = { id: string; tier: string; name_translations: { bn?: string; en?: string } | null; applies_to: string[]; price_monthly: number; price_yearly: number | null; benefits: Record<string, unknown> | null; is_active: boolean };
type Sub = { id: string; entity_type: string; entity_id: string; entity_name: string; plan_id: string; status: string; expires_at: string | null; created_at: string; subscription_plans: { tier: string; name_translations: { bn?: string } | null } | null };

const TIER_EMOJI: Record<string, string> = { free: '🆓', basic: '🟢', pro: '🔵', premium: '🟣' };

export function SubscriptionsManager({ plans, subscriptions, tab }: { plans: Plan[]; subscriptions: Sub[]; tab: 'plans' | 'entities' }) {
  const router = useRouter();
  const toast = useToast();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [priceM, setPriceM] = useState('');
  const [priceY, setPriceY] = useState('');
  const [appliesDoctor, setAppliesDoctor] = useState(true);
  const [appliesHospital, setAppliesHospital] = useState(true);
  const [benefits, setBenefits] = useState<Record<string, unknown>>({});
  const [customKey, setCustomKey] = useState('');
  const [customVal, setCustomVal] = useState('');
  const [busy, setBusy] = useState(false);

  // assignment
  const [assignOpen, setAssignOpen] = useState(false);
  const [entityType, setEntityType] = useState<'doctor' | 'hospital'>('doctor');
  const [entityId, setEntityId] = useState('');
  const [planId, setPlanId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const openEdit = (p: Plan) => {
    setEditPlan(p);
    setPriceM(String(p.price_monthly));
    setPriceY(p.price_yearly != null ? String(p.price_yearly) : '');
    setAppliesDoctor(p.applies_to.includes('doctor'));
    setAppliesHospital(p.applies_to.includes('hospital'));
    setBenefits((p.benefits as Record<string, unknown>) ?? {});
  };

  const handleSavePlan = async () => {
    if (!editPlan) return;
    setBusy(true);
    const applies_to: string[] = [];
    if (appliesDoctor) applies_to.push('doctor');
    if (appliesHospital) applies_to.push('hospital');
    const res = await fetch(`/api/admin/subscription-plans/${editPlan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_monthly: Number(priceM) || 0, price_yearly: priceY ? Number(priceY) : null, applies_to, benefits }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'আপডেট করা যায়নি', 'error');
      return;
    }
    toast.push('প্ল্যান আপডেট হয়েছে ✅', 'success');
    setEditPlan(null);
    router.refresh();
  };

  const handleAddCustom = () => {
    if (!customKey.trim()) return;
    let val: unknown = customVal.trim();
    try { val = JSON.parse(customVal); } catch { /* keep string */ }
    setBenefits((prev) => ({ ...prev, [customKey.trim()]: val }));
    setCustomKey('');
    setCustomVal('');
  };

  const handleAssign = async () => {
    if (!entityId.trim() || !planId) { toast.push('এন্টিটি ও প্ল্যান নির্বাচন করুন', 'error'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId.trim(), plan_id: planId, expires_at: expiresAt ? new Date(expiresAt).toISOString() : null }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'সাবস্ক্রিপশন তৈরি করা যায়নি', 'error');
      return;
    }
    toast.push('সাবস্ক্রিপশন যোগ হয়েছে ✅', 'success');
    setAssignOpen(false);
    setEntityId('');
    router.refresh();
  };

  const handleCancelSub = async (id: string) => {
    const res = await fetch(`/api/admin/subscriptions/${id}`, { method: 'DELETE' }).catch(() => null);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'বাতিল করা যায়নি', 'error');
      return;
    }
    toast.push('বাতিল করা হয়েছে', 'success');
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <a href="/subscriptions" className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'plans' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700'}`}>প্ল্যান</a>
        <a href="/subscriptions?tab=entities" className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'entities' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700'}`}>সক্রিয় সাবস্ক্রিপশন</a>
      </div>

      {tab === 'plans' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => {
            const t = p.name_translations as { bn?: string; en?: string } | null;
            return (
              <div key={p.id} className="rounded-xl border border-admin-border bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{TIER_EMOJI[p.tier] ?? '📦'}</span>
                  <span className="text-admin-h3 text-neutral-900">{t?.bn || p.tier}</span>
                  <span className="ml-auto text-admin-small text-neutral-500">₹{Number(p.price_monthly).toLocaleString('bn-BD')}/মাস</span>
                </div>
                <p className="mt-1 text-admin-small text-neutral-500">প্রয়োগ: {p.applies_to.join(', ')}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries((p.benefits as Record<string, unknown>) ?? {}).slice(0, 4).map(([k, v]) => <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">{k}: {String(v)}</span>)}
                </div>
                <button onClick={() => openEdit(p)} className="mt-3 h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">✏️ সম্পাদনা</button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button onClick={() => setAssignOpen(true)} className="h-9 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ সাবস্ক্রিপশন যোগ করুন</button>
          </div>
          <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
                  <tr><th className="px-3 py-2">এন্টিটি</th><th className="px-3 py-2">প্ল্যান</th><th className="px-3 py-2">স্ট্যাটাস</th><th className="px-3 py-2">মেয়াদ শেষ</th><th className="px-3 py-2">একশন</th></tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {subscriptions.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-admin-body text-neutral-500">কোনো সক্রিয় সাবস্ক্রিপশন নেই।</td></tr> : subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2"><span className="block text-admin-body font-medium text-neutral-900">{s.entity_name}</span><span className="block text-admin-small text-neutral-400">{s.entity_type} · {s.entity_id.slice(0, 8)}</span></td>
                      <td className="px-3 py-2 text-admin-body text-neutral-700">{TIER_EMOJI[s.subscription_plans?.tier ?? ''] ?? ''} {s.subscription_plans?.tier ?? s.plan_id.slice(0, 6)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === 'active' ? 'bg-life-100 text-life-700' : 'bg-neutral-100 text-neutral-600'}`}>{s.status}</span></td>
                      <td className="px-3 py-2 text-admin-small text-neutral-500">{s.expires_at ? new Date(s.expires_at).toLocaleDateString('bn-BD') : '—'}</td>
                      <td className="px-3 py-2"><button onClick={() => handleCancelSub(s.id)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-emergency-600 hover:bg-emergency-50">✕ বাতিল</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editPlan && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setEditPlan(null)} />
          <div className="relative w-full max-w-lg rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">প্ল্যান সম্পাদনা: {editPlan.tier}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">মাসিক মূল্য *</span><input value={priceM} onChange={(e) => setPriceM(e.target.value)} inputMode="decimal" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
                <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">বার্ষিক মূল্য</span><input value={priceY} onChange={(e) => setPriceY(e.target.value)} inputMode="decimal" placeholder="ঐচ্ছিক" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
              </div>
              <div>
                <p className="text-admin-small font-medium text-neutral-700">প্রয়োগযোগ্য</p>
                <label className="mt-1 flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={appliesDoctor} onChange={(e) => setAppliesDoctor(e.target.checked)} className="h-4 w-4" /> ডাক্তার</label>
                <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={appliesHospital} onChange={(e) => setAppliesHospital(e.target.checked)} className="h-4 w-4" /> হাসপাতাল</label>
              </div>
              <div>
                <p className="text-admin-small font-medium text-neutral-700">সুবিধা (Benefits)</p>
                <label className="mt-1 flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={!!benefits['featured_listing']} onChange={(e) => setBenefits((prev) => ({ ...prev, featured_listing: e.target.checked }))} className="h-4 w-4" /> ফিচার্ড লিস্টিং</label>
                <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={!!benefits['analytics_access']} onChange={(e) => setBenefits((prev) => ({ ...prev, analytics_access: e.target.checked }))} className="h-4 w-4" /> অ্যানালিটিক্স অ্যাক্সেস</label>
                <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={!!benefits['priority_support']} onChange={(e) => setBenefits((prev) => ({ ...prev, priority_support: e.target.checked }))} className="h-4 w-4" /> প্রায়োরিটি সাপোর্ট</label>
                <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">সর্বোচ্চ চেম্বার সংখ্যা</span><input value={String(benefits['max_chambers'] ?? '')} onChange={(e) => { const v = e.target.value === '' ? undefined : Number(e.target.value); setBenefits((prev) => { const n = { ...prev }; if (v == null || isNaN(v as number)) delete n['max_chambers']; else n['max_chambers'] = v; return n; }); }} inputMode="numeric" placeholder="যেমন 5" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(benefits).map(([k, v]) => <span key={k} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[11px] text-neutral-700">{k}: {String(v)}<button onClick={() => setBenefits((prev) => { const n = { ...prev }; delete n[k]; return n; })} className="text-neutral-400 hover:text-neutral-700">✕</button></span>)}
                </div>
                <div className="mt-2 flex gap-2">
                  <input value={customKey} onChange={(e) => setCustomKey(e.target.value)} placeholder="key (যেমন vip_badge)" className="h-8 flex-1 rounded-md border border-admin-border px-2 text-admin-small" />
                  <input value={customVal} onChange={(e) => setCustomVal(e.target.value)} placeholder='value (JSON বা tekst)' className="h-8 flex-1 rounded-md border border-admin-border px-2 text-admin-small" />
                  <button onClick={handleAddCustom} className="h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700">+ যোগ</button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditPlan(null)} className="h-9 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">বাতিল</button>
              <button onClick={handleSavePlan} disabled={busy} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</button>
            </div>
          </div>
        </div>
      )}

      {assignOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setAssignOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">সাবস্ক্রিপশন যোগ করুন</h2>
            <p className="mt-1 text-admin-small text-neutral-500">পেমেন্ট গেটওয়ের আগে ম্যানুয়াল গ্রান্ট — UPI/bank-এর পর এখানে যোগ করুন।</p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">এন্টিটি ধরন</span>
                <select value={entityType} onChange={(e) => setEntityType(e.target.value as 'doctor' | 'hospital')} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body"><option value="doctor">ডাক্তার</option><option value="hospital">হাসপাতাল</option></select>
              </label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">এন্টিটি ID (UUID)</span><input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="doctor/hospital id" className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">প্ল্যান</span>
                <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                  <option value="">নির্বাচন করুন</option>
                  {plans.map((p) => { const t = p.name_translations as { bn?: string } | null; return <option key={p.id} value={p.id}>{TIER_EMOJI[p.tier] ?? ''} {(t?.bn || p.tier) as string} — ₹{Number(p.price_monthly).toString()}</option>; })}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">মেয়াদ শেষ (ঐচ্ছিক)</span><input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setAssignOpen(false)} className="h-9 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700">বাতিল</button>
              <button onClick={handleAssign} disabled={busy} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white disabled:opacity-50">{busy ? 'যোগ হচ্ছে...' : 'যোগ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
