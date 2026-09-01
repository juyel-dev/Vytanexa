'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModerationShell } from '@/components/moderation/ModerationShell';

type Review = {
  id: string;
  entity_type: 'doctor' | 'hospital';
  entity_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  admin_reply: string | null;
  status: string;
  created_at: string;
  entity_name: string;
  entity_href: string;
};

/**
 * Reviews Moderation Queue — ADMIN-PANEL-SPEC.md A03 unified pattern,
 * reviews variant. TODO.md Phase 9.4.
 */
export function ReviewsQueue({
  reviews,
  tab,
  counts,
}: {
  reviews: Review[];
  tab: string;
  counts: { pending: number; approved: number; rejected: number };
}) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Review | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState<'approve' | 'reject' | null>(null);

  const filtered = useMemo(
    () =>
      search.trim()
        ? reviews.filter(
            (r) =>
              r.reviewer_name.toLowerCase().includes(search.toLowerCase()) ||
              r.review_text.toLowerCase().includes(search.toLowerCase()) ||
              r.entity_name.toLowerCase().includes(search.toLowerCase())
          )
        : reviews,
    [reviews, search]
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) {
      toast.push('অনুমোদন করা যায়নি', 'error');
      return;
    }
    toast.push('✅ অনুমোদিত', 'success');
    router.refresh();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    const res = await fetch(`/api/admin/reviews/${rejectTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', reason: rejectReason.trim() || undefined }),
    }).catch(() => null);
    setBusyId(null);
    setRejectTarget(null);
    setRejectReason('');
    if (!res || !res.ok) {
      toast.push('প্রত্যাখ্যান করা যায়নি', 'error');
      return;
    }
    toast.push('❌ প্রত্যাখ্যাত', 'success');
    router.refresh();
  };

  const saveReply = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_reply: replyText.trim() || null }),
    }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) {
      toast.push('জবাব সংরক্ষণ করা যায়নি', 'error');
      return;
    }
    toast.push('✅ জবাব সংরক্ষিত হয়েছে', 'success');
    setReplyOpenId(null);
    setReplyText('');
    router.refresh();
  };

  const runBulk = async (action: 'approve' | 'reject') => {
    setBulkBusy(true);
    const res = await fetch('/api/admin/reviews/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], action }),
    }).catch(() => null);
    setBulkBusy(false);
    setBulkConfirm(null);
    if (!res || !res.ok) {
      toast.push('বাল্ক অ্যাকশন করা যায়নি', 'error');
      return;
    }
    toast.push(action === 'approve' ? `✅ ${selected.size} টি অনুমোদিত` : `❌ ${selected.size} টি প্রত্যাখ্যাত`, 'success');
    setSelected(new Set());
    router.refresh();
  };

  return (
    <>
      <ModerationShell
        title="রিভিউ মডারেশন"
        description="ডাক্তার ও হাসপাতালের জন্য জমা হওয়া রিভিউ — অনুমোদিত হলেই রেটিং-এ যোগ হয়।"
        tabs={[
          { key: 'pending', href: '/moderation/reviews?status=pending', label: 'অপেক্ষমাণ', count: counts.pending },
          { key: 'approved', href: '/moderation/reviews?status=approved', label: 'অনুমোদিত', count: counts.approved },
          { key: 'rejected', href: '/moderation/reviews?status=rejected', label: 'প্রত্যাখ্যাত', count: counts.rejected },
        ]}
        activeTab={tab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="🔍 নাম, লেখা বা এন্টিটি খুঁজুন..."
        items={filtered}
        itemKey={(r) => r.id}
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
        renderItem={(r, { selected: isSelected, onToggleSelect: toggle }) => (
          <div key={r.id} className="rounded-xl border border-admin-border bg-white p-4">
            <div className="flex items-start gap-3">
              {tab === 'pending' && (
                <input type="checkbox" checked={isSelected} onChange={toggle} className="mt-1 h-4 w-4 rounded border-admin-border" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-accent-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-accent-400' : 'text-neutral-200'}`} />
                  ))}
                  <a href={r.entity_href} target="_blank" rel="noopener noreferrer" className="ml-2 text-admin-small font-medium text-brand-700 hover:underline">
                    {r.entity_name} ↗
                  </a>
                </div>
                <p className="mt-1.5 text-admin-body text-neutral-800">&ldquo;{r.review_text}&rdquo;</p>
                <p className="mt-1 text-admin-small text-neutral-500">
                  — {r.reviewer_name} · {new Date(r.created_at).toLocaleDateString('bn-BD')}
                </p>

                {r.admin_reply && replyOpenId !== r.id && (
                  <p className="mt-2 rounded-md bg-brand-50 px-3 py-2 text-admin-small text-brand-800">💬 জবাব: {r.admin_reply}</p>
                )}

                {replyOpenId === r.id ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      placeholder="জবাব লিখুন..."
                      className="w-full rounded-md border border-admin-border bg-white px-3 py-2 text-admin-small outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveReply(r.id)} disabled={busyId === r.id} className="h-8 rounded-md bg-brand-600 px-3 text-admin-small font-semibold text-white hover:bg-brand-700 disabled:opacity-50">সংরক্ষণ করুন</button>
                      <button onClick={() => { setReplyOpenId(null); setReplyText(''); }} className="h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small text-neutral-700 hover:bg-neutral-50">বাতিল</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => approve(r.id)} disabled={busyId === r.id} className="h-8 rounded-md bg-life-600 px-3 text-admin-small font-semibold text-white hover:bg-life-700 disabled:opacity-50">✅ অনুমোদন করুন</button>
                        <button onClick={() => setRejectTarget(r)} disabled={busyId === r.id} className="h-8 rounded-md bg-emergency-600 px-3 text-admin-small font-semibold text-white hover:bg-emergency-700 disabled:opacity-50">❌ প্রত্যাখ্যান করুন</button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <button onClick={() => { setReplyOpenId(r.id); setReplyText(r.admin_reply ?? ''); }} className="flex h-8 items-center gap-1 rounded-md border border-admin-border bg-white px-3 text-admin-small text-neutral-700 hover:bg-neutral-50">
                        <MessageSquare className="h-3.5 w-3.5" /> {r.admin_reply ? 'জবাব সম্পাদনা করুন' : 'জবাব দিন'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        title="রিভিউ প্রত্যাখ্যান করবেন?"
        description="কারণ (ঐচ্ছিক, শুধু অভ্যন্তরীণ রেকর্ডের জন্য — জমাদাতাকে দেখানো হবে না):"
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
        title={bulkConfirm === 'approve' ? `${selected.size} টি রিভিউ অনুমোদন করবেন?` : `${selected.size} টি রিভিউ প্রত্যাখ্যান করবেন?`}
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
