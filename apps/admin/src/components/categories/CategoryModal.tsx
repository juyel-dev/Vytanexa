'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { autoSlug, slugify } from '@/lib/location-utils';
import { CATEGORY_ICONS } from '@/lib/category-utils';

type CatRow = {
  id: string;
  name_translations: { bn?: string; en?: string; hi?: string } | null;
  slug: string;
  icon_key: string | null;
  search_keywords: string[];
  is_visible_home: boolean;
  is_active: boolean;
};

type Props = {
  open: boolean;
  category?: CatRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export function CategoryModal({ open, category, onClose, onSaved }: Props) {
  const isEdit = !!category;
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [iconKey, setIconKey] = useState<string | null>(null);
  const [keywords, setKeywords] = useState('');
  const [visibleHome, setVisibleHome] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (category) {
      const t = (category.name_translations ?? {}) as { bn?: string; en?: string; hi?: string };
      setNameBn(t.bn ?? '');
      setNameEn(t.en ?? '');
      setNameHi(t.hi ?? '');
      setSlug(category.slug ?? '');
      setSlugTouched(true);
      setIconKey(category.icon_key ?? null);
      setKeywords((category.search_keywords ?? []).join(', '));
      setVisibleHome(category.is_visible_home);
      setIsActive(category.is_active);
    } else {
      setNameBn('');
      setNameEn('');
      setNameHi('');
      setSlug('');
      setSlugTouched(false);
      setIconKey(null);
      setKeywords('');
      setVisibleHome(true);
      setIsActive(true);
    }
    setError(null);
    setBusy(false);
  }, [open, category]);

  useEffect(() => {
    if (slugTouched) return;
    const next = autoSlug(nameBn, nameEn);
    if (next) setSlug(next);
  }, [nameBn, nameEn, slugTouched]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const kw = keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      name_translations: { bn: nameBn.trim(), en: nameEn.trim(), hi: nameHi.trim() },
      slug: slug.trim() ? slugify(slug.trim()) : undefined,
      icon_key: iconKey,
      search_keywords: kw,
      is_visible_home: visibleHome,
      is_active: isActive,
    };

    const url = isEdit ? `/api/admin/categories/${category!.id}` : '/api/admin/categories';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? 'সংরক্ষণ করা যায়নি');
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-admin-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-3">
          <h2 className="text-admin-h2 text-neutral-900">{isEdit ? 'বিভাগ সম্পাদনা' : 'নতুন বিভাগ যোগ করুন'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-neutral-500 hover:bg-neutral-50" aria-label="বন্ধ করুন">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">নাম (বাংলা) <span className="text-emergency-600">*</span></span>
            <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} required placeholder="যেমন: হৃদরোগ" className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">Name (English)</span>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Cardiology" className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">नाम (हिन्दी)</span>
            <input value={nameHi} onChange={(e) => setNameHi(e.target.value)} placeholder="हिन्दी नाम" className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">স্লাগ (URL)</span>
            <div className="flex gap-2">
              <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto-generated" className="h-10 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              <button type="button" onClick={() => { const n = autoSlug(nameBn, nameEn); if (n) setSlug(n); setSlugTouched(false); }} className="h-10 shrink-0 rounded-md border border-admin-border px-3 text-admin-small font-medium text-neutral-600 hover:bg-neutral-50">পুনরায় তৈরি</button>
            </div>
            <span className="text-admin-small text-neutral-400">ফাঁকা রাখলে নাম থেকে স্বয়ংক্রিয়ভাবে তৈরি হবে</span>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">আইকন</span>
            <div className="grid grid-cols-6 gap-1.5">
              {CATEGORY_ICONS.map((ic) => (
                <button
                  key={ic.key}
                  type="button"
                  onClick={() => setIconKey(ic.key === iconKey ? null : ic.key)}
                  title={ic.label}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] ${iconKey === ic.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-admin-border bg-white text-neutral-600 hover:bg-neutral-50'}`}
                >
                  <span className="text-[18px]">{ic.emoji}</span>
                  <span className="truncate">{ic.key}</span>
                </button>
              ))}
            </div>
            <span className="text-admin-small text-neutral-400">ছোট curated সেট — দৃশ্যগত সামঞ্জস্য বজায় রাখতে arbitrary upload নেই</span>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">সার্চ কিওয়ার্ড (comma-separated)</span>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="কার্ডিও, heart, হৃদ" className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            <span className="text-admin-small text-neutral-400">S05-এর Bengali-English alias resolution এই কিওয়ার্ডগুলো ব্যবহার করে</span>
          </label>

          <label className="flex items-center gap-2 text-admin-body text-neutral-700">
            <input type="checkbox" checked={visibleHome} onChange={(e) => setVisibleHome(e.target.checked)} className="h-4 w-4 rounded border-admin-border" />
            হোমপেজে দেখাবে
          </label>

          <label className="flex items-center gap-2 text-admin-body text-neutral-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-admin-border" />
            সক্রিয় (Active)
          </label>

          {error && <p className="rounded-md bg-emergency-50 px-3 py-2 text-admin-body text-emergency-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-admin-border px-5 py-3">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">বাতিল</button>
          <button type="submit" disabled={busy || !nameBn.trim()} className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50"> {busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'} </button>
        </div>
      </form>
    </div>
  );
}
