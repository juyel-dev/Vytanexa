'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

type FlagMeta = { key: string; emoji: string; bn: string; desc: string };

const FLAGS: FlagMeta[] = [
  { key: 'community_qa', emoji: '🙋', bn: 'কমিউনিটি প্রশ্নোত্তর (Q&A)', desc: 'চালু করলে ইউজাররা প্রশ্ন করতে ও উত্তর দেখতে পারবে, এবং হোমপেজে/মেনুতে এই ফিচার দেখা যাবে। বন্ধ করলে কন্টেন্ট মুছবে না — শুধু লুকাবে।' },
  { key: 'polls', emoji: '📊', bn: 'জরিপ (Polls)', desc: 'চালু করলে /community/polls এবং "আরো" মেনুতে জরিপ দেখা যাবে ও ভোট দেওয়া যাবে; বন্ধ করলে রুট 404 করবে, মেনু থেকে লুকাবে।' },
  { key: 'voice_search', emoji: '🎙️', bn: 'ভয়েস সার্চ', desc: 'সার্চ বারে মাইক বাটন দেখাবে; বন্ধ করলে টেক্সট সার্চ থাকবে, বাটন দেখাবে না।' },
  { key: 'blood_services', emoji: '🩸', bn: 'ব্লাড সার্ভিস', desc: 'চালু থাকলে /health/blood-services পেজ, রক্তদাতা নিবন্ধন ও তালিকা কাজ করবে; বন্ধ করলে পেজ 404 করবে। হোমপেজে ব্যানার দেখানো আলাদাভাবে হোমপেজ সেকশন সেটিংস থেকে নিয়ন্ত্রিত হয়।' },
];

export function FeatureFlags({ initialFeatures }: { initialFeatures: Record<string, boolean> | null }) {
  const toast = useToast();
  const [features, setFeatures] = useState<Record<string, boolean>>(initialFeatures ?? {});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const toggle = async (key: string) => {
    const next = !features[key];
    setBusyKey(key);
    const res = await fetch('/api/admin/app-settings/flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: { [key]: next } }),
    }).catch(() => null);
    setBusyKey(null);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'আপডেট করা যায়নি', 'error');
      return;
    }
    setFeatures((prev) => ({ ...prev, [key]: next }));
    toast.push(`${next ? 'চালু' : 'বন্ধ'} করা হয়েছে ✅`, 'success');
  };

  return (
    <div className="flex flex-col gap-3">
      {FLAGS.map((f) => {
        const on = !!features[f.key];
        return (
          <div key={f.key} className="flex items-center gap-4 rounded-xl border border-admin-border bg-white p-4">
            <span className="text-[20px]">{f.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-admin-body font-medium text-neutral-900">{f.bn}</span>
              <span className="block text-admin-small text-neutral-500">{f.desc}</span>
            </span>
            <button
              onClick={() => toggle(f.key)}
              disabled={busyKey === f.key}
              className={`relative flex h-7 w-12 shrink-0 items-center rounded-full border px-0.5 transition ${on ? 'border-life-600 bg-life-600' : 'border-neutral-300 bg-neutral-200'} disabled:opacity-50`}
              aria-label={on ? 'বন্ধ করুন' : 'চালু করুন'}
            >
              <span className={`h-6 w-6 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className={`w-12 text-admin-small font-medium ${on ? 'text-life-700' : 'text-neutral-500'}`}>{on ? 'চালু' : 'বন্ধ'}</span>
          </div>
        );
      })}
      <p className="text-admin-small text-neutral-400">নতুন ফিচার যোগ করতে শুধু JSON key + এই লিস্টে একটি row — কোনো migration লাগে না (DB Part 1 design)।</p>
    </div>
  );
}
