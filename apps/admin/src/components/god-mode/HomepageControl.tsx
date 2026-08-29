'use client';

import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Section = { id: string; visible: boolean; order: number };

const LABELS: Record<string, { bn: string; emoji: string }> = {
  announcement: { bn: 'ঘোষণা ব্যানার', emoji: 'ℹ️' },
  hero_slider: { bn: 'হিরো ব্যানার', emoji: '🖼️' },
  quick_stats: { bn: 'কুইক স্ট্যাটস', emoji: '📊' },
  quick_actions: { bn: 'কুইক অ্যাকশন', emoji: '⚡' },
  categories: { bn: 'বিভাগ গ্রিড', emoji: '🏷️' },
  popular_docs: { bn: 'জনপ্রিয় ডাক্তার', emoji: '👨‍⚕️' },
  hospitals: { bn: 'ট্রেন্ডিং হাসপাতাল', emoji: '🏥' },
  symptoms: { bn: 'উপসর্গ', emoji: '🩺' },
  articles: { bn: 'স্বাস্থ্য আর্টিকেল', emoji: '📰' },
  qa_teaser: { bn: 'প্রশ্নোত্তর টিজার', emoji: '🙋' },
  blood_cta: { bn: 'ব্লাড সার্ভিস CTA', emoji: '🩸' },
};

const DEFAULT_IDS = ['announcement', 'hero_slider', 'quick_stats', 'quick_actions', 'categories', 'popular_docs', 'hospitals', 'symptoms', 'articles', 'qa_teaser', 'blood_cta'];

export function HomepageControl({ initialSections }: { initialSections: Section[] | null }) {
  const toast = useToast();
  const initial = useMemo<Section[]>(() => {
    if (initialSections && initialSections.length > 0) return [...initialSections].sort((a, b) => a.order - b.order);
    return DEFAULT_IDS.map((id, i) => ({ id, visible: !['articles', 'qa_teaser'].includes(id), order: i + 1 }));
  }, [initialSections]);

  const [sections, setSections] = useState<Section[]>(initial);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasChanges = useMemo(() => {
    if (initial.length !== sections.length) return true;
    for (let i = 0; i < sections.length; i++) {
      const a = initial[i]!, b = sections[i]!;
      if (a.id !== b.id || a.visible !== b.visible || a.order !== b.order) return true;
    }
    return false;
  }, [initial, sections]);

  const move = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(idx, 1);
    if (!moved) return;
    next.splice(ni, 0, moved);
    // reassign order
    setSections(next.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const toggle = (id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  };

  const handlePublish = async () => {
    setBusy(true);
    const res = await fetch('/api/admin/app-settings/homepage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections }),
    }).catch(() => null);
    setBusy(false);
    setConfirmOpen(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'প্রকাশ করা যায়নি', 'error');
      return;
    }
    toast.push('✅ হোমপেজ আপডেট হয়েছে — পরবর্তী ৫ মিনিটে সব ইউজারের কাছে দেখা যাবে', 'success');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* left: controls */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-admin-border bg-white p-4">
          <h2 className="text-admin-h3 text-neutral-900">সেকশন সাজান</h2>
          <p className="mt-1 text-admin-small text-neutral-500">টেনে-নামিয়ে ক্রম বদলান, ☑ টগল বন্ধ করলে সেকশন লুকাবে। প্রকাশ না করা পর্যন্ত লাইভে যাবে না।</p>
          <ul className="mt-4 flex flex-col gap-1.5">
            {sections.map((s, idx) => {
              const label = LABELS[s.id] ?? { bn: s.id, emoji: '📄' };
              return (
                <li key={s.id} className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${s.visible ? 'border-admin-border bg-white' : 'border-dashed border-neutral-300 bg-neutral-50 opacity-60'}`}>
                  <span className="flex shrink-0 flex-col gap-0.5">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                    <button onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} className="flex h-6 w-6 items-center justify-center rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  </span>
                  <span className="text-[16px]">{label.emoji}</span>
                  <span className="flex-1 truncate text-admin-body font-medium text-neutral-800">{label.bn}</span>
                  <span className="text-admin-small text-neutral-400">{s.id}</span>
                  <label className="ml-1 flex items-center gap-1">
                    <input type="checkbox" checked={s.visible} onChange={() => toggle(s.id)} className="h-4 w-4 rounded border-admin-border" />
                    <span className="text-admin-small text-neutral-600">দেখাবে</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setConfirmOpen(true)} disabled={!hasChanges || busy} className="mt-4 h-10 w-full rounded-lg bg-brand-600 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'প্রকাশ হচ্ছে...' : 'প্রকাশ করুন'}
          </button>
          {!hasChanges && <p className="mt-2 text-center text-admin-small text-neutral-400">কোনো পরিবর্তন নেই</p>}
        </div>
      </div>

      {/* right: preview (MVP: ordered list, not iframe) */}
      <div className="rounded-xl border border-admin-border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-admin-h3 text-neutral-900">লাইভ প্রিভিউ (MVP)</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">iframe preview — পরবর্তী ধাপে</span>
        </div>
        <p className="mt-1 text-admin-small text-neutral-500">ডান পাশে আসল <code className="rounded bg-neutral-100 px-1">/?preview=true</code> iframe দেখাবে (spec A07 Live Preview)। আপাতত এখানে ক্রম ও দৃশ্যমানতা তালিকা দেখানো হচ্ছে — ডেটা সঠিক, রেন্ডার মক নয়।</p>
        <div className="mt-4 overflow-hidden rounded-lg border border-admin-border bg-neutral-50">
          <div className="bg-white px-3 py-2 text-center text-admin-small font-medium text-neutral-500">মোবাইল প্রিভিউ — /home</div>
          <div className="flex flex-col">
            {sections.filter((s) => s.visible).map((s) => {
              const label = LABELS[s.id] ?? { bn: s.id, emoji: '📄' };
              return (
                <div key={s.id} className="flex items-center gap-2 border-t border-admin-border bg-white px-3 py-3">
                  <span className="text-[14px]">{label.emoji}</span>
                  <span className="text-admin-body font-medium text-neutral-800">{label.bn}</span>
                  <span className="ml-auto text-admin-small text-neutral-400">{s.id}</span>
                </div>
              );
            })}
            {sections.filter((s) => s.visible).length === 0 && <div className="px-3 py-8 text-center text-admin-body text-neutral-400">কোনো সেকশন দৃশ্যমান নেই</div>}
          </div>
        </div>
        <p className="mt-3 text-admin-small text-neutral-400">প্রকাশ করলে <code className="rounded bg-neutral-100 px-1">app_settings.homepage_settings.sections</code> আপডেট হবে; ISR 5 মিনিটে সব ক্যাশে পৌঁছাবে।</p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="হোমপেজ পরিবর্তন প্রকাশ করবেন?"
        description="এই পরিবর্তন সাথে সাথে সব ইউজারের কাছে দেখা যাবে। নিশ্চিত হয়ে প্রকাশ করুন।"
        confirmLabel="হ্যাঁ, প্রকাশ করুন"
        variant="warning"
        busy={busy}
        onConfirm={handlePublish}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
