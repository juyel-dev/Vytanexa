'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModerationShell } from '@/components/moderation/ModerationShell';

type Question = {
  id: string;
  title: string;
  body: string | null;
  category_name: string;
  is_anonymous: boolean;
  author_name: string | null;
  upvote_count: number;
  answer_count: number;
  status: string;
  created_at: string;
};

/** Questions Moderation Queue — A03 unified pattern, Q&A variant. TODO.md Phase 9.4. */
export function QuestionsQueue({
  questions,
  tab,
  counts,
}: {
  questions: Question[];
  tab: string;
  counts: { pending: number; approved: number; rejected: number };
}) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Question | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState<'approve' | 'reject' | null>(null);

  const filtered = useMemo(
    () =>
      search.trim()
        ? questions.filter(
            (q) =>
              q.title.toLowerCase().includes(search.toLowerCase()) ||
              (q.body ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : questions,
    [questions, search]
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) return toast.push('অনুমোদন করা যায়নি', 'error');
    toast.push('✅ অনুমোদিত', 'success');
    router.refresh();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    const res = await fetch(`/api/admin/questions/${rejectTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', reason: rejectReason.trim() || undefined }),
    }).catch(() => null);
    setBusyId(null);
    setRejectTarget(null);
    setRejectReason('');
    if (!res || !res.ok) return toast.push('প্রত্যাখ্যান করা যায়নি', 'error');
    toast.push('❌ প্রত্যাখ্যাত', 'success');
    router.refresh();
  };

  const runBulk = async (action: 'approve' | 'reject') => {
    setBulkBusy(true);
    const res = await fetch('/api/admin/questions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], action }),
    }).catch(() => null);
    setBulkBusy(false);
    setBulkConfirm(null);
    if (!res || !res.ok) return toast.push('বাল্ক অ্যাকশন করা যায়নি', 'error');
    toast.push(action === 'approve' ? `✅ ${selected.size} টি অনুমোদিত` : `❌ ${selected.size} টি প্রত্যাখ্যাত`, 'success');
    setSelected(new Set());
    router.refresh();
  };

  return (
    <>
      <ModerationShell
        title="প্রশ্ন মডারেশন"
        description="কমিউনিটি Q&A-তে জমা হওয়া প্রশ্ন — অনুমোদিত হলেই সাইটে দেখা যাবে।"
        tabs={[
          { key: 'pending', href: '/moderation/qa?status=pending', label: 'অপেক্ষমাণ', count: counts.pending },
          { key: 'approved', href: '/moderation/qa?status=approved', label: 'অনুমোদিত', count: counts.approved },
          { key: 'rejected', href: '/moderation/qa?status=rejected', label: 'প্রত্যাখ্যাত', count: counts.rejected },
        ]}
        activeTab={tab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="🔍 প্রশ্ন খুঁজুন..."
        items={filtered}
        itemKey={(q) => q.id}
        selectedIds={selected}
        onToggleSelect={toggleSelect}
        bulkBusy={bulkBusy}
        bulkActions={
          tab === 'pending'
            ? [
                { label: '✅ সব অনুমোদন করুন', onClick: () => setBulkConfirm('approve'), variant: 'primary' },
                { label: '❌ সব প্রত্যাখ্যান', onClick: () => setBulkConfirm('reject'), variant: 'danger' },
              ]
            : []
        }
        emptyMessage="🎉 এই মুহূর্তে অনুমোদনের অপেক্ষায় কিছু নেই"
        renderItem={(q, { selected: isSelected, onToggleSelect: toggle }) => (
          <div key={q.id} className="rounded-xl border border-admin-border bg-white p-4">
            <div className="flex items-start gap-3">
              {tab === 'pending' && (
                <input type="checkbox" checked={isSelected} onChange={toggle} className="mt-1 h-4 w-4 rounded border-admin-border" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-admin-body font-medium text-neutral-900">❓ {q.title}</p>
                {q.body && <p className="mt-1 line-clamp-2 text-admin-small text-neutral-600">{q.body}</p>}
                <p className="mt-1 text-admin-small text-neutral-500">
                  বিভাগ: {q.category_name} · {q.is_anonymous ? 'বেনামী' : (q.author_name ?? '—')} ·{' '}
                  {new Date(q.created_at).toLocaleDateString('bn-BD')} · {q.answer_count} উত্তর · {q.upvote_count} আপভোট
                </p>
                {q.status === 'pending' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => approve(q.id)} disabled={busyId === q.id} className="h-8 rounded-md bg-life-600 px-3 text-admin-small font-semibold text-white hover:bg-life-700 disabled:opacity-50">✅ অনুমোদন করুন</button>
                    <button onClick={() => setRejectTarget(q)} disabled={busyId === q.id} className="h-8 rounded-md bg-emergency-600 px-3 text-admin-small font-semibold text-white hover:bg-emergency-700 disabled:opacity-50">❌ প্রত্যাখ্যান করুন</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        title="প্রশ্ন প্রত্যাখ্যান করবেন?"
        description="কারণ (ঐচ্ছিক, শুধু অভ্যন্তরীণ রেকর্ডের জন্য):"
        confirmLabel="প্রত্যাখ্যান করুন"
        variant="danger"
        busy={busyId === rejectTarget?.id}
        onConfirm={confirmReject}
        onCancel={() => { setRejectTarget(null); setRejectReason(''); }}
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={2}
          placeholder="যেমন: স্প্যাম, অপ্রাসঙ্গিক..."
          className="mt-2 w-full rounded-md border border-admin-border bg-white px-3 py-2 text-admin-small outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={bulkConfirm !== null}
        title={bulkConfirm === 'approve' ? `${selected.size} টি প্রশ্ন অনুমোদন করবেন?` : `${selected.size} টি প্রশ্ন প্রত্যাখ্যান করবেন?`}
        description="এই পরিবর্তন এখনই কার্যকর হবে।"
        confirmLabel={bulkConfirm === 'approve' ? 'সব অনুমোদন করুন' : 'সব প্রত্যাখ্যান করুন'}
        variant={bulkConfirm === 'approve' ? 'info' : 'danger'}
        busy={bulkBusy}
        onConfirm={() => bulkConfirm && runBulk(bulkConfirm)}
        onCancel={() => setBulkConfirm(null)}
      />
    </>
  );
}
