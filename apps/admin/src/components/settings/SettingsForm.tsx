'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

type Props = {
  initial: {
    app_name: string;
    default_locale: string;
    supported_locales: string[];
    seo_defaults: { title?: string; description?: string; og_image?: string } | null;
  };
};

const ALL_LOCALES = ['bn', 'en', 'hi'];

export function SettingsForm({ initial }: Props) {
  const toast = useToast();
  const [appName, setAppName] = useState(initial.app_name);
  const [defaultLocale, setDefaultLocale] = useState(initial.default_locale);
  const [supported, setSupported] = useState<string[]>(initial.supported_locales);
  const [seoTitle, setSeoTitle] = useState(initial.seo_defaults?.title ?? '');
  const [seoDesc, setSeoDesc] = useState(initial.seo_defaults?.description ?? '');
  const [ogImage, setOgImage] = useState(initial.seo_defaults?.og_image ?? '');
  const [busy, setBusy] = useState(false);

  const toggleLocale = (loc: string) => {
    setSupported((prev) => (prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]));
  };

  const handleSave = async () => {
    if (!appName.trim()) { toast.push('অ্যাপের নাম দিন', 'error'); return; }
    if (!supported.includes(defaultLocale)) { toast.push('ডিফল্ট ভাষা সমর্থিত ভাষার মধ্যে থাকতে হবে', 'error'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/app-settings/general', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: appName.trim(),
        default_locale: defaultLocale,
        supported_locales: supported,
        seo_defaults: { title: seoTitle.trim(), description: seoDesc.trim(), og_image: ogImage.trim() || undefined },
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'সংরক্ষণ করা যায়নি', 'error');
      return;
    }
    toast.push('✅ সেটিংস সংরক্ষিত হয়েছে', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">সাধারণ</h2>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-admin-small font-medium text-neutral-700">অ্যাপের নাম</span>
          <input value={appName} onChange={(e) => setAppName(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">ভাষা</h2>
        <p className="mt-1 text-admin-small text-neutral-500">নতুন locale যোগ করলে <code className="rounded bg-neutral-100 px-1">messages/{'{locale}'}.json</code> অনুবাদ ফাইল দরকার — কোড-সাইড টাস্ক।</p>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-admin-small font-medium text-neutral-700">ডিফল্ট ভাষা</span>
          <select value={defaultLocale} onChange={(e) => setDefaultLocale(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
            {ALL_LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <div className="mt-3">
          <p className="text-admin-small font-medium text-neutral-700">সমর্থিত ভাষা</p>
          <div className="mt-1 flex gap-2">
            {ALL_LOCALES.map((loc) => (
              <label key={loc} className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-admin-small ${supported.includes(loc) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-admin-border bg-white text-neutral-600'}`}>
                <input type="checkbox" checked={supported.includes(loc)} onChange={() => toggleLocale(loc)} className="h-3.5 w-3.5" />
                {loc === 'bn' ? 'বাংলা' : loc === 'en' ? 'English' : 'हिन्दी'} ({loc})
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">SEO ডিফল্ট (site-wide meta fallback)</h2>
        <label className="mt-3 flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">Meta title</span><input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Vytanexa — আপনার স্বাস্থ্য" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        <label className="mt-2 flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">Meta description</span><textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} placeholder="Site-wide fallback" className="rounded-md border border-admin-border px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        <label className="mt-2 flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">OG image</span><input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={busy} className="h-10 rounded-lg bg-brand-600 px-6 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</button>
      </div>
    </div>
  );
}
