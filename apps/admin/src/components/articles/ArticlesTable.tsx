'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, MoreHorizontal, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Row = { id: string; slug: string; title_translations: { bn?: string; en?: string } | null; cover_image_url: string | null; category: string | null; is_published: boolean; view_count: number; published_at: string | null; created_at: string };

function titleOf(r: Row) {
  const t = r.title_translations as { bn?: string; en?: string } | null;
  return (t?.bn || t?.en || r.slug) as string;
}

export function ArticlesTable({ articles, total, page, perPage, categories, currentFilters }: { articles: Row[]; total: number; page: number; perPage: number; categories: string[]; currentFilters: { q: string; status: string; category: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [qInput, setQInput] = useState(currentFilters.q);
  const [openId, setOpenId] = useState<string | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const buildUrl = (f: typeof currentFilters & { page?: number }) => {
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.status && f.status !== 'all') p.set('status', f.status);
    if (f.category) p.set('category', f.category);
    if (f.page && f.page > 1) p.set('page', String(f.page));
    const s = p.toString();
    return s ? `/articles?${s}` : '/articles';
  };

  const push = (patch: Partial<typeof currentFilters> & { page?: number }) => {
    const next = { ...currentFilters, ...patch } as typeof currentFilters & { page?: number };
    if (patch.q !== undefined || patch.status !== undefined || patch.category !== undefined) if (patch.page === undefined) next.page = 1;
    router.push(buildUrl(next));
  };

  const handleDelete = async () => {
    if (!del) return;
    setBusy(true);
    const res = await fetch(`/api/admin/articles/${del.id}`, { method: 'DELETE' }).catch(() => null);
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-admin-border bg-white p-3 sm:flex-row sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); push({ q: qInput }); }} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="খুঁজুন... (শিরোনাম / slug)" className="h-9 w-full rounded-md border border-admin-border pl-9 pr-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </form>
        <select value={currentFilters.status} onChange={(e) => push({ status: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="all">সব স্ট্যাটাস</option>
          <option value="published">প্রকাশিত</option>
          <option value="draft">খসড়া</option>
        </select>
        <select value={currentFilters.category} onChange={(e) => push({ category: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="">সব বিভাগ</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
              <tr><th className="px-3 py-2">কভার</th><th className="px-3 py-2">শিরোনাম</th><th className="px-3 py-2">বিভাগ</th><th className="px-3 py-2">স্ট্যাটাস</th><th className="px-3 py-2">ভিউ</th><th className="px-3 py-2">তারিখ</th><th className="px-3 py-2">একশন</th></tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {articles.length === 0 ? <tr><td colSpan={7} className="px-6 py-10 text-center text-admin-body text-neutral-500">কোনো আর্টিকেল নেই।</td></tr> : articles.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2">{a.cover_image_url ? <img src={a.cover_image_url} alt={titleOf(a)} className="h-9 w-14 rounded object-cover" /> : <span className="flex h-9 w-14 items-center justify-center rounded bg-neutral-100 text-[14px]">📰</span>}</td>
                  <td className="px-3 py-2"><a href={`/articles/${a.id}`} className="block text-admin-body font-medium text-neutral-900 hover:text-brand-600">{titleOf(a)}</a><span className="block text-admin-small text-neutral-400">/{a.slug}</span></td>
                  <td className="px-3 py-2 text-admin-body text-neutral-600">{a.category ?? '—'}</td>
                  <td className="px-3 py-2">{a.is_published ? <span className="rounded-full bg-life-100 px-2 py-0.5 text-[11px] font-medium text-life-700">✅ প্রকাশিত</span> : <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">📝 খসড়া</span>}</td>
                  <td className="px-3 py-2 text-admin-body text-neutral-700"><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-neutral-400" />{a.view_count}</span></td>
                  <td className="px-3 py-2 text-admin-small text-neutral-500">{a.published_at ? new Date(a.published_at).toLocaleDateString('bn-BD') : new Date(a.created_at).toLocaleDateString('bn-BD')}</td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-neutral-600 hover:bg-neutral-50"><MoreHorizontal className="h-4 w-4" /></button>
                      {openId === a.id && (
                        <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-admin-border bg-white py-1 shadow-lg">
                          <a href={`/articles/${a.id}`} className="block px-3 py-1.5 text-admin-body text-neutral-700 hover:bg-neutral-50">✏️ এডিট</a>
                          <button onClick={() => { setDel(a); setOpenId(null); }} className="block w-full px-3 py-1.5 text-left text-admin-body text-emergency-600 hover:bg-neutral-50">🗑️ মুছুন</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-admin-border px-3 py-2 text-admin-small">
          <span className="text-neutral-500">{total}টি আর্টিকেল · পৃষ্ঠা {page} / {totalPages}</span>
          <span className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => push({ page: page - 1 })} className="rounded-md border border-admin-border px-2 py-1 text-neutral-700 hover:bg-neutral-50 disabled:opacity-30">◂</button>
            <span className="px-2 text-neutral-600">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => push({ page: page + 1 })} className="rounded-md border border-admin-border px-2 py-1 text-neutral-700 hover:bg-neutral-50 disabled:opacity-30">▸</button>
          </span>
        </div>
      </div>

      <ConfirmDialog open={!!del} title="আর্টিকেল মুছবেন?" description={del ? (del.view_count > 0 ? `এই আর্টিকেলটি ইতিমধ্যে ${del.view_count} বার দেখা হয়েছে — মুছে ফেলবেন?` : `"${titleOf(del)}" মুছে ফেলা হবে।`) : ''} confirmLabel="মুছুন" variant="danger" busy={busy} onConfirm={handleDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
