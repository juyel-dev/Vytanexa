'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

type LinkItem = { label: string; href: string };

type Props = {
  initial: {
    footer_links: LinkItem[] | null;
    social_links: { facebook?: string; instagram?: string; twitter?: string; youtube?: string } | null;
    contact_phone: string | null;
    contact_email: string | null;
    contact_whatsapp: string | null;
    tagline: string;
  };
};

export function FooterEditor({ initial }: Props) {
  const toast = useToast();
  const [tagline, setTagline] = useState(initial.tagline ?? '');
  const [facebook, setFacebook] = useState(initial.social_links?.facebook ?? '');
  const [instagram, setInstagram] = useState(initial.social_links?.instagram ?? '');
  const [twitter, setTwitter] = useState(initial.social_links?.twitter ?? '');
  const [youtube, setYoutube] = useState(initial.social_links?.youtube ?? '');
  const [phone, setPhone] = useState(initial.contact_phone ?? '');
  const [email, setEmail] = useState(initial.contact_email ?? '');
  const [whatsapp, setWhatsapp] = useState(initial.contact_whatsapp ?? '');
  const [links, setLinks] = useState<LinkItem[]>(initial.footer_links ?? []);
  const [busy, setBusy] = useState(false);

  const move = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= links.length) return;
    const next = [...links];
    const [m] = next.splice(idx, 1);
    if (!m) return;
    next.splice(ni, 0, m);
    setLinks(next);
  };

  const handleSave = async () => {
    setBusy(true);
    const res = await fetch('/api/admin/app-settings/footer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tagline,
        social_links: { facebook, instagram, twitter, youtube },
        contact_phone: phone || null,
        contact_email: email || null,
        contact_whatsapp: whatsapp || null,
        footer_links: links,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'সংরক্ষণ করা যায়নি', 'error');
      return;
    }
    toast.push('✅ ফুটার আপডেট হয়েছে', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">ট্যাগলাইন</h2>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="আপনার স্বাস্থ্য, আপনার সংযোগ" className="mt-2 h-9 w-full rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">সোশ্যাল লিংক</h2>
        <p className="mt-1 text-admin-small text-neutral-500">ফাঁকা রাখলে আইকন লুকাবে — dead link হবে না।</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">📘 Facebook</span><input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">📸 Instagram</span><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">🐦 Twitter/X</span><input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">▶️ YouTube</span><input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        </div>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">যোগাযোগ তথ্য</h2>
        <p className="mt-1 text-admin-small text-neutral-500">S16 সহায়তা ও S22 কন্ট্যাক্টে এই তথ্য দেখাবে — single source।</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ফোন</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ইমেইল</span><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@vytanexa.app" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">WhatsApp</span><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="98xxxxxxxx" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        </div>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-admin-h3 text-neutral-900">কুইক লিংক (ফুটারে দেখাবে)</h2>
          <button onClick={() => setLinks([...links, { label: '', href: '' }])} className="h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">+ লিংক যোগ করুন</button>
        </div>
        <p className="mt-1 text-admin-small text-neutral-500">যেমন: শর্তাবলী → /terms, গোপনীয়তা → /privacy, বা /page/slug — dropdown নয়, free-text (MVP)।</p>
        <div className="mt-3 flex flex-col gap-2">
          {links.length === 0 ? <p className="text-admin-body text-neutral-400">কোনো লিংক নেই।</p> : links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex shrink-0 flex-col gap-0.5">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === links.length - 1} className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
              </span>
              <input value={link.label} onChange={(e) => { const n = [...links]; n[idx] = { ...n[idx]!, label: e.target.value }; setLinks(n); }} placeholder="শর্তাবলী" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              <input value={link.href} onChange={(e) => { const n = [...links]; n[idx] = { ...n[idx]!, href: e.target.value }; setLinks(n); }} placeholder="/terms" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              <button onClick={() => setLinks(links.filter((_, i) => i !== idx))} className="flex h-9 w-9 items-center justify-center rounded-md border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={busy} className="h-10 rounded-lg bg-brand-600 px-6 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</button>
      </div>
    </div>
  );
}
