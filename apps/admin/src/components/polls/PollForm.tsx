'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

type Initial = { id: string; question: string; options: string[]; expires_at: string; total_votes: number; voteCounts: { text: string; count: number }[] } | null;

export function PollForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: Initial }) {
  const router = useRouter();
  const toast = useToast();
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', '']);
  const [expires, setExpires] = useState(initial?.expires_at ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVotes = (initial?.total_votes ?? 0) > 0;
  const totalVotes = initial?.total_votes ?? 0;

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!question.trim()) { setError('প্রশ্ন দিন'); return; }
    const cleanOpts = options.map((s) => s.trim()).filter(Boolean);
    if (cleanOpts.length < 2) { setError('অন্তত ২টি অপশন দিন'); return; }
    if (hasVotes) { setError('ভোট পড়ার পর অপশন পরিবর্তন করা যায় না'); return; }
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      question: question.trim(),
      options: cleanOpts,
      expires_at: expires ? new Date(expires).toISOString() : null,
    };
    const url = mode === 'create' ? '/api/admin/polls' : `/api/admin/polls/${(initial as { id: string }).id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      setError(d?.error ?? 'সংরক্ষণ করা যায়নি');
      return;
    }
    toast.push('সংরক্ষিত হয়েছে ✅', 'success');
    router.push('/polls');
    router.refresh();
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      {error && <div className="rounded-lg border border-emergency-200 bg-emergency-50 px-4 py-3 text-admin-body text-emergency-700">{error}</div>}
      {hasVotes && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-admin-body text-amber-700">🔒 ভোট পড়ার পর অপশন লক — পরিবর্তন করা যাবে না।</div>}

      <label className="flex flex-col gap-1">
        <span className="text-admin-small font-medium text-neutral-700">প্রশ্ন *</span>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="আপনি কি নিয়মিত স্বাস্থ্য পরীক্ষা করান?" className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-admin-small font-medium text-neutral-700">অপশন (২-৬টি)</span>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 text-admin-small text-neutral-400">{idx + 1}.</span>
            <input
              value={opt}
              onChange={(e) => updateOption(idx, e.target.value)}
              disabled={hasVotes}
              placeholder={`অপশন ${idx + 1}`}
              className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:bg-neutral-50 disabled:opacity-60"
            />
            <button type="button" onClick={() => removeOption(idx)} disabled={hasVotes || options.length <= 2} className="flex h-8 w-8 items-center justify-center rounded-md border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50 disabled:opacity-30">🗑️</button>
          </div>
        ))}
        <button type="button" onClick={addOption} disabled={hasVotes || options.length >= 6} className="self-start rounded-md border border-admin-border bg-white px-3 py-1 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-30">+ আরেকটি অপশন যোগ করুন</button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-admin-small font-medium text-neutral-700">মেয়াদ শেষ হবে (ঐচ্ছিক — ফাঁকা = চলতে থাকবে)</span>
        <input type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
      </label>

      {hasVotes && initial?.voteCounts && (
        <div className="rounded-xl border border-admin-border bg-white p-4">
          <h3 className="text-admin-h3 text-neutral-900">ফলাফল</h3>
          <div className="mt-3 flex flex-col gap-2">
            {initial.voteCounts.map((vc) => {
              const pct = totalVotes > 0 ? Math.round((vc.count / totalVotes) * 100) : 0;
              return (
                <div key={vc.text}>
                  <div className="flex justify-between text-admin-small text-neutral-600"><span>{vc.text}</span><span>{pct}% ({vc.count})</span></div>
                  <div className="mt-1 h-2 rounded-full bg-neutral-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            <p className="mt-1 text-admin-small text-neutral-500">মোট: {totalVotes} ভোট</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <a href="/polls" className="h-10 rounded-md border border-admin-border bg-white px-5 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">বাতিল</a>
        <button onClick={handleSubmit} disabled={busy} className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : mode === 'create' ? 'পোল প্রকাশ করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );
}
