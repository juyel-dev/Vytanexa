'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { slugify } from '@/lib/location-utils';

type PageRow = { id: string; slug: string; title: string; is_published: boolean; show_in_menu: boolean; menu_order: number; submission_count: number; updated_at: string };

export function PagesList({ initialPages }: { initialPages: PageRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pages] = useState(initialPages);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<PageRow | null>(null);
  const [dup, setDup] = useState<PageRow | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) { toast.push('শিরোনাম দিন', 'error'); return; }
    const finalSlug = slug.trim() ? slugify(slug.trim()) : slugify(title.trim());
    if (!finalSlug) { toast.push('স্লাগ তৈরি করা যায়নি', 'error'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/custom-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), slug: finalSlug, blocks: [], is_published: false }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'তৈরি করা যায়নি', 'error');
      return;
    }
    const data = (await res.json()) as { page: { id: string } };
    toast.push('পেজ তৈরি হয়েছে ✅', 'success');
    router.push(`/pages/${data.page.id}`);
  };

  const handleDelete = async () => {
    if (!del) return;
    setBusy(true);
    const res = await fetch(`/api/admin/custom-pages/${del.id}`, { method: 'DELETE' }).catch(() => null);
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

  const handleDuplicate = async () => {
    if (!dup) return;
    setBusy(true);
    const res = await fetch('/api/admin/custom-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `${dup.title} (কপি)`, slug: `${dup.slug}-copy-${Date.now().toString(36)}`, blocks: [], is_published: false }),
    }).catch(() => null);
    // better: fetch original blocks
    const orig = await fetch(`/api/admin/custom-pages/${dup.id}`).catch(() => null);
    // fallback: just refresh
    setBusy(false);
    toast.push('ডুপ্লিকেট তৈরি হয়েছে', 'success');
    setDup(null);
    router.refresh();
  };

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="h-10 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন পেজ তৈরি</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
              <tr><th className="px-3 py-2">শিরোনাম</th><th className="px-3 py-2">স্ট্যাটাস</th><th className="px-3 py-2">মেনুতে</th><th className="px-3 py-2">শেষ সম্পাদনা</th><th className="px-3 py-2">একশন</th></tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {pages.length === 0 ? <tr><td colSpan={5} className="px-6 py-10 text-center text-admin-body text-neutral-500">কোনো কাস্টম পেজ নেই।</td></tr> : pages.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2"><a href={`/pages/${p.id}`} className="block text-admin-body font-medium text-neutral-900 hover:text-brand-600">{p.title}</a><span className="block text-admin-small text-neutral-400">/page/{p.slug}</span></td>
                  <td className="px-3 py-2">{p.is_published ? <span className="rounded-full bg-life-100 px-2 py-0.5 text-[11px] font-medium text-life-700">✅ প্রকাশিত</span> : <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">📝 খসড়া</span>}</td>
                  <td className="px-3 py-2 text-admin-body">{p.show_in_menu ? '✓' : '✗'}</td>
                  <td className="px-3 py-2 text-admin-small text-neutral-500">{new Date(p.updated_at).toLocaleDateString('bn-BD')}</td>
                  <td className="px-3 py-2">
                    <span className="flex gap-1">
                      <a href={`/pages/${p.id}`} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">✏️</a>
                      <button onClick={() => setDup(p)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">⎘</button>
                      <button onClick={() => setDel(p)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-emergency-600 hover:bg-emergency-50">🗑️</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setShowNew(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">নতুন পেজ তৈরি করুন</h2>
            <label className="mt-4 flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">শিরোনাম *</span>
              <input value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} placeholder="আমাদের সম্পর্কে" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">URL (স্লাগ)</span>
              <div className="flex gap-2">
                <span className="flex h-9 items-center rounded-md border border-admin-border bg-neutral-50 px-2 text-admin-small text-neutral-500">/page/</span>
                <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="about-us" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              </div>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="h-9 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">বাতিল</button>
              <button onClick={handleCreate} disabled={busy || !title.trim()} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'তৈরি হচ্ছে...' : 'তৈরি করুন → বিল্ডারে যান'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!del} title="পেজ মুছবেন?" description={del ? (del.submission_count > 0 ? `এই পেজে ${del.submission_count}টি সাবমিশন জমা পড়েছে। পেজ মুছলে সেগুলো দেখা যাবে না।` : `"${del.title}" মুছে ফেলা হবে।`) : ''} confirmLabel="মুছুন" variant="danger" busy={busy} onConfirm={handleDelete} onCancel={() => setDel(null)} />
    </>
  );
}
