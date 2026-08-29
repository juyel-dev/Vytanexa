'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Poll = {
  id: string;
  question: string;
  total_votes: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  poll_options: { id: string; option_text: string; vote_count: number; display_order: number }[];
};

function statusOf(p: Poll): { label: string; color: string } {
  if (!p.is_active) return { label: 'বন্ধ', color: 'bg-neutral-200 text-neutral-600' };
  if (p.expires_at && new Date(p.expires_at) < new Date()) return { label: 'মেয়াদ শেষ', color: 'bg-amber-100 text-amber-700' };
  return { label: 'চলমান', color: 'bg-life-100 text-life-700' };
}

export function PollsList({ polls }: { polls: Poll[] }) {
  const router = useRouter();
  const toast = useToast();
  const [del, setDel] = useState<Poll | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!del) return;
    setBusy(true);
    const res = await fetch(`/api/admin/polls/${del.id}`, { method: 'DELETE' }).catch(() => null);
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

  const handleClose = async (p: Poll) => {
    const res = await fetch(`/api/admin/polls/${p.id}/close`, { method: 'POST' }).catch(() => null);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'বন্ধ করা যায়নি', 'error');
      return;
    }
    toast.push('পোল বন্ধ করা হয়েছে', 'success');
    router.refresh();
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
              <tr><th className="px-3 py-2">প্রশ্ন</th><th className="px-3 py-2">ভোট</th><th className="px-3 py-2">স্ট্যাটাস</th><th className="px-3 py-2">মেয়াদ</th><th className="px-3 py-2">একশন</th></tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {polls.length === 0 ? <tr><td colSpan={5} className="px-6 py-10 text-center text-admin-body text-neutral-500">কোনো জরিপ নেই।</td></tr> : polls.map((p) => {
                const st = statusOf(p);
                return (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2"><a href={`/polls/${p.id}`} className="block text-admin-body font-medium text-neutral-900 hover:text-brand-600">{p.question}</a><span className="block text-admin-small text-neutral-400">{p.poll_options.length}টি অপশন</span></td>
                    <td className="px-3 py-2 text-admin-body text-neutral-700">{p.total_votes}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="px-3 py-2 text-admin-small text-neutral-500">{p.expires_at ? new Date(p.expires_at).toLocaleDateString('bn-BD') : '—'}</td>
                    <td className="px-3 py-2">
                      <span className="flex gap-1">
                        <a href={`/polls/${p.id}`} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">✏️</a>
                        {st.label === 'চলমান' && <button onClick={() => handleClose(p)} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-admin-small text-amber-700 hover:bg-amber-100">এখনই বন্ধ</button>}
                        <button onClick={() => setDel(p)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-emergency-600 hover:bg-emergency-50">🗑️</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog open={!!del} title="জরিপ মুছবেন?" description={del ? `"${del.question.slice(0, 40)}" মুছে ফেলা হবে।` : ''} confirmLabel="মুছুন" variant="danger" busy={busy} onConfirm={handleDelete} onCancel={() => setDel(null)} />
    </>
  );
}
