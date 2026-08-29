'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type PageRow = { id: string; slug: string; title: string; show_in_menu: boolean; menu_order: number; menu_icon: string | null; is_published: boolean };

export function MenuManager({ initialPages }: { initialPages: PageRow[] }) {
  const toast = useToast();
  const [pages, setPages] = useState<PageRow[]>(() => [...initialPages].sort((a, b) => a.menu_order - b.menu_order));
  const [busy, setBusy] = useState(false);

  const move = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= pages.length) return;
    const next = [...pages];
    const [m] = next.splice(idx, 1);
    if (!m) return;
    next.splice(ni, 0, m);
    setPages(next.map((p, i) => ({ ...p, menu_order: i })));
  };

  const toggle = (id: string) => setPages((prev) => prev.map((p) => (p.id === id ? { ...p, show_in_menu: !p.show_in_menu } : p)));

  const save = async () => {
    setBusy(true);
    const visibility: Record<string, boolean> = {};
    for (const p of pages) visibility[p.id] = p.show_in_menu;
    const res = await fetch('/api/admin/custom-pages/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: pages.map((p) => p.id), visibility }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'মেনু আপডেট করা যায়নি', 'error');
      return;
    }
    toast.push('✅ মেনু আপডেট হয়েছে', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">স্ট্যাটিক আইটেম (কোড থেকে আসে, ক্রম পরিবর্তনযোগ্য নয়)</h2>
        <p className="mt-1 text-admin-small text-neutral-500">আমার অ্যাকাউন্ট, স্বাস্থ্য টুলস, কমিউনিটি, সেটিংস, সহায়তা — S16-এ fixed</p>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-admin-h3 text-neutral-900">কাস্টম পেজ (আপনার তৈরি করা, এখানে সাজান)</h2>
          <a href="/pages" className="rounded-md border border-admin-border bg-white px-3 py-1 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">+ নতুন কাস্টম পেজ →</a>
        </div>
        {pages.length === 0 ? (
          <p className="mt-4 text-admin-body text-neutral-500">এখনো কোনো কাস্টম পেজ নেই — A09 থেকে তৈরি করুন।</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {pages.map((p, idx) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg border border-admin-border bg-white px-3 py-2">
                <span className="flex shrink-0 flex-col gap-0.5">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === pages.length - 1} className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                </span>
                <span className="text-[16px]">{p.menu_icon ?? '📄'}</span>
                <span className="flex-1 truncate text-admin-body font-medium text-neutral-900">{p.title}</span>
                <span className="hidden text-admin-small text-neutral-400 sm:inline">/{p.slug} {p.is_published ? '✅' : '📝'}</span>
                <label className="ml-2 flex items-center gap-1.5 text-admin-small text-neutral-700">
                  <input type="checkbox" checked={p.show_in_menu} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-admin-border" />
                  মেনুতে দেখাবে
                </label>
                <a href={`/pages/${p.id}`} className="ml-1 rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-600 hover:bg-neutral-50">✏️</a>
              </li>
            ))}
          </ul>
        )}
        {pages.length > 0 && (
          <button onClick={save} disabled={busy} className="mt-4 h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'মেনু সংরক্ষণ করুন'}</button>
        )}
      </div>
    </div>
  );
}
