'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { slugify } from '@/lib/location-utils';

type Initial = {
  id?: string;
  title_translations: { bn?: string; en?: string; hi?: string } | null;
  slug: string;
  cover_image_url: string | null;
  category: string | null;
  body_html: string;
  author_name: string | null;
  author_doctor_id: string | null;
  tags: string[];
  read_time_minutes: number | null;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
};

type Props = { mode: 'create' | 'edit'; initial?: Initial | null; doctors: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string }[] };

function calcReadTime(html: string): number {
  const words = html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function ArticleForm({ mode, initial, doctors }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEditor = false; // role check could be passed from server; for MVP assume admin

  const [titleBn, setTitleBn] = useState(initial?.title_translations?.bn ?? '');
  const [titleEn, setTitleEn] = useState(initial?.title_translations?.en ?? '');
  const [titleHi, setTitleHi] = useState(initial?.title_translations?.hi ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [cover, setCover] = useState(initial?.cover_image_url ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [body, setBody] = useState(initial?.body_html ?? '');
  const [readTime, setReadTime] = useState(String(initial?.read_time_minutes ?? '3'));
  const [authorMode, setAuthorMode] = useState<'doctor' | 'guest'>(initial?.author_doctor_id ? 'doctor' : 'guest');
  const [authorDoctorId, setAuthorDoctorId] = useState(initial?.author_doctor_id ?? '');
  const [authorName, setAuthorName] = useState(initial?.author_name ?? '');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [metaTitle, setMetaTitle] = useState(initial?.meta_title ?? '');
  const [metaDesc, setMetaDesc] = useState(initial?.meta_description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slugTouched) return;
    const n = slugify(titleBn);
    if (n) setSlug(n);
  }, [titleBn, slugTouched]);

  useEffect(() => {
    setReadTime(String(calcReadTime(body)));
  }, [body]);

  // autosave every 30s for edit
  useEffect(() => {
    if (mode !== 'edit' || !initial?.id) return;
    const id = setInterval(async () => {
      setSaving(true);
      await fetch(`/api/admin/articles/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_translations: { bn: titleBn, en: titleEn, hi: titleHi },
          slug,
          cover_image_url: cover || undefined,
          category: category || undefined,
          body_html: body,
          tags,
          read_time_minutes: Number(readTime) || 1,
          author_name: authorMode === 'guest' ? authorName || undefined : undefined,
          author_doctor_id: authorMode === 'doctor' ? authorDoctorId || null : null,
        }),
      }).catch(() => null);
      setSaving(false);
    }, 30000);
    return () => clearInterval(id);
  }, [mode, initial?.id, titleBn, titleEn, titleHi, slug, cover, category, body, tags, readTime, authorMode, authorName, authorDoctorId]);

  const handleSubmit = async (publish: boolean) => {
    if (publish && isEditor) { toast.push('প্রকাশ করার অনুমতি নেই, admin-কে জানান', 'error'); return; }
    setBusy(true);
    setError(null);
    const payload = {
      title_translations: { bn: titleBn.trim(), en: titleEn.trim(), hi: titleHi.trim() },
      slug: slug.trim() ? slugify(slug.trim()) : undefined,
      cover_image_url: cover.trim() || undefined,
      category: category.trim() || undefined,
      body_html: body,
      tags,
      read_time_minutes: Number(readTime) || 1,
      is_published: publish,
      author_name: authorMode === 'guest' ? authorName.trim() || undefined : undefined,
      author_doctor_id: authorMode === 'doctor' ? authorDoctorId || null : null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDesc.trim() || null,
    };
    const url = mode === 'create' ? '/api/admin/articles' : `/api/admin/articles/${initial!.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      setError(d?.error ?? 'সংরক্ষণ করা যায়নি');
      return;
    }
    toast.push(publish ? '✅ প্রকাশিত হয়েছে' : 'খসড়া সংরক্ষিত হয়েছে ✅', 'success');
    router.push('/articles');
    router.refresh();
  };

  const filteredDoctors = doctorSearch.trim()
    ? doctors.filter((d) => {
        const t = d.name_translations as { bn?: string; en?: string } | null;
        const q = doctorSearch.toLowerCase();
        return (t?.bn ?? '').toLowerCase().includes(q) || (t?.en ?? '').toLowerCase().includes(q) || d.slug.toLowerCase().includes(q);
      }).slice(0, 10)
    : [];

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      {error && <div className="rounded-lg border border-emergency-200 bg-emergency-50 px-4 py-3 text-admin-body text-emergency-700">{error}</div>}
      <div className="flex items-center gap-2 text-admin-small text-neutral-500">
        <span>{saving ? 'স্বয়ংক্রিয় সংরক্ষণ হচ্ছে...' : 'স্বয়ংক্রিয় সংরক্ষণ ৩০সে'}</span>
        <span className="ml-auto text-neutral-400">আনুমানিক পড়ার সময়: {readTime} মিনিট (auto)</span>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">▾ মূল বিষয়বস্তু</h2>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">কভার ছবি URL (16:9)</span><input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">শিরোনাম (বাংলা) *</span><input value={titleBn} onChange={(e) => setTitleBn(e.target.value)} required className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">Title (English)</span><input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">शीर्षक (हिन्दी)</span><input value={titleHi} onChange={(e) => setTitleHi(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">স্লাগ</span>
            <div className="flex gap-2">
              <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              <button type="button" onClick={() => { const n = slugify(titleBn); if (n) setSlug(n); setSlugTouched(false); }} className="h-9 rounded-md border border-admin-border px-3 text-admin-small font-medium text-neutral-600 hover:bg-neutral-50">পুনরায় তৈরি</button>
            </div>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">বিভাগ</span><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ডায়াবেটিস টিপস" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
            <div>
              <span className="text-admin-small font-medium text-neutral-700">ট্যাগ</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-admin-small text-neutral-700">{t}<button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-neutral-400 hover:text-neutral-700">✕</button></span>)}
              </div>
              <div className="mt-1 flex gap-2">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = tagInput.trim(); if (v && !tags.includes(v)) setTags([...tags, v]); setTagInput(''); } }} placeholder="ট্যাগ লিখে Enter" className="h-8 flex-1 rounded-md border border-admin-border px-2 text-admin-small" />
                <button type="button" onClick={() => { const v = tagInput.trim(); if (v && !tags.includes(v)) setTags([...tags, v]); setTagInput(''); }} className="h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700">+ যোগ</button>
              </div>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">বিষয়বস্তু * (Rich Text — HTML)</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder="<p>এখানে লিখুন...</p>" className="rounded-md border border-admin-border px-3 py-2 font-mono text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            <span className="text-admin-small text-neutral-400">MVP: textarea for HTML — RichTextEditor toolbar future scope</span>
          </label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">পড়ার সময় (মিনিট)</span><input value={readTime} onChange={(e) => setReadTime(e.target.value)} inputMode="numeric" className="h-9 w-32 rounded-md border border-admin-border px-3 text-admin-body" /></label>
        </div>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">▾ লেখক</h2>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-admin-body text-neutral-700">
            <input type="radio" checked={authorMode === 'doctor'} onChange={() => setAuthorMode('doctor')} className="h-4 w-4" />
            কোনো ডাক্তার লিংক করুন
          </label>
          {authorMode === 'doctor' && (
            <div className="ml-6 flex flex-col gap-2">
              <input value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} placeholder="🔍 ডাক্তার খুঁজুন..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              {doctorSearch && filteredDoctors.length > 0 && (
                <div className="rounded-md border border-admin-border bg-white p-2">
                  {filteredDoctors.map((d) => {
                    const t = d.name_translations as { bn?: string; en?: string } | null;
                    const name = (t?.bn || t?.en || d.slug) as string;
                    return (
                      <button key={d.id} type="button" onClick={() => { setAuthorDoctorId(d.id); setAuthorName(name); setDoctorSearch(''); }} className={`block w-full rounded px-2 py-1 text-left text-admin-body ${authorDoctorId === d.id ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-neutral-50'}`}>{name} {authorDoctorId === d.id ? '✓' : ''}</button>
                    );
                  })}
                </div>
              )}
              {authorDoctorId && <p className="text-admin-small text-neutral-500">নির্বাচিত: {authorName} ({authorDoctorId.slice(0, 8)}…)</p>}
            </div>
          )}
          <label className="flex items-center gap-2 text-admin-body text-neutral-700">
            <input type="radio" checked={authorMode === 'guest'} onChange={() => setAuthorMode('guest')} className="h-4 w-4" />
            শুধু নাম লিখুন
          </label>
          {authorMode === 'guest' && (
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="লেখকের নাম" className="ml-6 h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">▸ SEO</h2>
        <div className="mt-2 grid gap-3">
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">meta_title</span><input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">meta_description</span><textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={2} className="rounded-md border border-admin-border px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => handleSubmit(false)} disabled={busy || !titleBn.trim() || !body.trim()} className="h-10 rounded-md border border-admin-border bg-white px-5 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া সংরক্ষণ'}</button>
        <button type="button" onClick={() => handleSubmit(true)} disabled={busy || !titleBn.trim() || !body.trim()} title={isEditor ? 'প্রকাশ করার অনুমতি নেই' : undefined} className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'প্রকাশ হচ্ছে...' : 'প্রকাশ করুন'}</button>
      </div>
    </form>
  );
}
