'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

type Broadcast = { id: string; type: string; title: string; body: string; target_url: string | null; show_as_banner: boolean; is_active: boolean; expires_at: string | null; created_at: string };
type Personal = { id: string; type: string; title: string; body: string; target_user_id: string | null; created_at: string };

export function NotificationsManager({ broadcasts, personals, tab }: { broadcasts: Broadcast[]; personals: Personal[]; tab: 'broadcasts' | 'personal' }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'general' | 'emergency'>('general');
  const [targetUrl, setTargetUrl] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { toast.push('শিরোনাম ও বিবরণ দিন', 'error'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        title: title.trim(),
        body: body.trim(),
        target_url: targetUrl.trim() || undefined,
        show_as_banner: showBanner,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'পাঠানো যায়নি', 'error');
      return;
    }
    toast.push('✅ নোটিফিকেশন পাঠানো হয়েছে', 'success');
    setTitle(''); setBody(''); setTargetUrl(''); setShowBanner(false); setExpiresAt('');
    location.reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <a href="/notifications" className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'broadcasts' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>পাঠানো ঘোষণা</a>
        <a href="/notifications?tab=personal" className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'personal' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>ব্যক্তিগত লগ</a>
      </div>

      {tab === 'broadcasts' ? (
        <>
          <div className="rounded-xl border border-admin-border bg-white p-4">
            <h2 className="text-admin-h3 text-neutral-900">নতুন ঘোষণা পাঠান</h2>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">ধরন</span>
                <select value={type} onChange={(e) => setType(e.target.value as 'general' | 'emergency')} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                  <option value="general">সাধারণ</option>
                  <option value="emergency">জরুরি</option>
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">শিরোনাম *</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ডেঙ্গু সতর্কতা" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">বিবরণ *</span><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="বিবরণ লিখুন..." className="rounded-md border border-admin-border px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">লক্ষ্য URL (ঐচ্ছিক)</span><input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="/emergency বা https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={showBanner} onChange={(e) => setShowBanner(e.target.checked)} className="h-4 w-4" /> ব্যানার হিসেবে দেখাবে (S04 SEC-01)</label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">মেয়াদ শেষ (ঐচ্ছিক)</span><input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body" /></label>
              <button onClick={handleSend} disabled={busy} className="h-10 self-start rounded-lg bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'পাঠানো হচ্ছে...' : 'পাঠান'}</button>
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-white">
            <div className="px-4 py-2 text-admin-small font-medium text-neutral-500">পাঠানো ঘোষণা ({broadcasts.length})</div>
            <div className="divide-y divide-admin-border">
              {broadcasts.length === 0 ? <div className="px-4 py-8 text-center text-admin-body text-neutral-500">কোনো ঘোষণা নেই।</div> : broadcasts.map((b) => (
                <div key={b.id} className="px-4 py-3">
                  <p className="text-admin-body font-medium text-neutral-900">{b.type === 'emergency' ? '🚨' : 'ℹ️'} {b.title} {b.show_as_banner && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">ব্যানার</span>} {!b.is_active && <span className="ml-1 text-admin-small text-neutral-400">(নিষ্ক্রিয়)</span>}</p>
                  <p className="mt-1 text-admin-small text-neutral-600">{b.body}</p>
                  <p className="mt-1 text-admin-small text-neutral-400">{new Date(b.created_at).toLocaleString('bn-BD')} {b.target_url ? `· ${b.target_url}` : ''} {b.expires_at ? `· মেয়াদ ${new Date(b.expires_at).toLocaleDateString('bn-BD')}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-admin-border bg-white">
          <div className="px-4 py-2 text-admin-small font-medium text-neutral-500">ব্যক্তিগত নোটিফিকেশন লগ ({personals.length}) — read-only, troubleshooting-এর জন্য</div>
          <div className="divide-y divide-admin-border">
            {personals.length === 0 ? <div className="px-4 py-8 text-center text-admin-body text-neutral-500">কোনো ব্যক্তিগত নোটিফিকেশন নেই।</div> : personals.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <p className="text-admin-body font-medium text-neutral-900">💬 {p.title}</p>
                <p className="mt-1 text-admin-small text-neutral-600">{p.body}</p>
                <p className="mt-1 text-admin-small text-neutral-400">{new Date(p.created_at).toLocaleString('bn-BD')} · user {p.target_user_id?.slice(0, 8) ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
