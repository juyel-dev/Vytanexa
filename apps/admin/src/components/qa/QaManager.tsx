'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

type Q = { id: string; title: string; category: string | null; answer_count: number; upvote_count: number; created_at: string; status: string };
type Doc = { id: string; name_translations: { bn?: string; en?: string } | null; slug: string };

function docName(d: Doc) {
  const t = d.name_translations as { bn?: string; en?: string } | null;
  return (t?.bn || t?.en || d.slug) as string;
}

export function QaManager({ questions, doctors, tab, badgeUnanswered }: { questions: Q[]; doctors: Doc[]; tab: 'unanswered' | 'all'; badgeUnanswered: number }) {
  const router = useRouter();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const filteredDocs = doctorSearch.trim()
    ? doctors.filter((d) => docName(d).toLowerCase().includes(doctorSearch.toLowerCase())).slice(0, 10)
    : [];

  const handlePublish = async (questionId: string) => {
    if (!doctorId) { toast.push('ভেরিফাইড ডাক্তার নির্বাচন করুন', 'error'); return; }
    if (!body.trim()) { toast.push('উত্তর লিখুন', 'error'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/qa/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, doctor_id: doctorId, body: body.trim() }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'উত্তর প্রকাশ করা যায়নি', 'error');
      return;
    }
    toast.push('✅ উত্তর প্রকাশিত হয়েছে', 'success');
    setOpenId(null);
    setBody('');
    setDoctorId('');
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <a href="/qa" className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'unanswered' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>অনুত্তরিত ({badgeUnanswered})</a>
        <a href="/qa?tab=all" className={`h-9 rounded-lg px-4 text-admin-body font-medium ${tab === 'all' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>সব প্রশ্ন</a>
      </div>

      <div className="flex flex-col gap-3">
        {questions.length === 0 ? (
          <div className="rounded-xl border border-admin-border bg-white p-8 text-center text-admin-body text-neutral-500">কোনো প্রশ্ন নেই।</div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-admin-border bg-white p-4">
              <p className="text-admin-body font-medium text-neutral-900">❓ {q.title}</p>
              <p className="mt-1 text-admin-small text-neutral-500">বিভাগ: {q.category ?? '—'} · {new Date(q.created_at).toLocaleDateString('bn-BD')} · {q.answer_count} উত্তর · {q.upvote_count} আপভোট · {q.status}</p>

              {openId === q.id ? (
                <div className="mt-3 rounded-lg border border-admin-border bg-neutral-50 p-3">
                  <p className="text-admin-small font-medium text-neutral-700">উত্তর দিন এই ডাক্তারের পক্ষ থেকে:</p>
                  <div className="mt-2">
                    <input value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} placeholder="🔍 ডাক্তার খুঁজুন... (শুধু ভেরিফাইড)" className="h-9 w-full rounded-md border border-admin-border bg-white px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
                    {doctorSearch && filteredDocs.length > 0 && (
                      <div className="mt-1 rounded-md border border-admin-border bg-white p-1">
                        {filteredDocs.map((d) => (
                          <button key={d.id} onClick={() => { setDoctorId(d.id); setDoctorSearch(''); }} className={`block w-full rounded px-2 py-1 text-left text-admin-body ${doctorId === d.id ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-neutral-50'}`}>{docName(d)} {doctorId === d.id ? '✓' : ''}</button>
                        ))}
                      </div>
                    )}
                    {doctorId && <p className="mt-1 text-admin-small text-neutral-600">নির্বাচিত: {docName(doctors.find((x) => x.id === doctorId)!)}</p>}
                  </div>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="উত্তর লিখুন..." className="mt-3 w-full rounded-md border border-admin-border bg-white px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setOpenId(null)} className="h-9 rounded-md border border-admin-border bg-white px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">বাতিল</button>
                    <button onClick={() => handlePublish(q.id)} disabled={busy || !doctorId || !body.trim()} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'প্রকাশ হচ্ছে...' : 'উত্তর প্রকাশ করুন'}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOpenId(q.id)} className="mt-3 h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">উত্তর দিন</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
