'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModerationShell } from '@/components/moderation/ModerationShell';

const REASON_LABEL: Record<string, string> = {
  wrong_phone: 'ভুল ফোন নম্বর',
  wrong_address: 'ভুল ঠিকানা',
  wrong_hours: 'ভুল সময়সূচি',
  closed: 'বন্ধ হয়ে গেছে',
  other: 'অন্যান্য',
};

type Report = {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  entity_name: string;
  entity_href: string;
};

/** Data Reports Moderation Queue — A03 unified pattern, reports variant. TODO.md Phase 9.4. */
export function ReportsQueue({
  reports,
  tab,
  counts,
}: {
  reports: Report[];
  tab: string;
  counts: { open: number; resolved: number; dismissed: number };
}) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<'resolved' | 'dismissed' | null>(null);

  const filtered = useMemo(
    () =>
      search.trim()
        ? reports.filter(
            (r) =>
              r.entity_name.toLowerCase().includes(search.toLowerCase()) ||
              (r.detail ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : reports,
    [reports, search]
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const act = async (id: string, status: 'resolved' | 'dismissed') => {
    setBusyId(id);
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) return toast.push('আপডেট করা যায়নি', 'error');
    toast.push(status === 'resolved' ? '✅ সমাধান হয়েছে' : '🚫 বাতিল করা হয়েছে', 'success');
    router.refresh();
  };

  const runBulk = async (action: 'resolved' | 'dismissed') => {
    setBulkBusy(true);
    const res = await fetch('/api/admin/reports/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], action }),
    }).catch(() => null);
    setBulkBusy(false);
    setBulkConfirm(null);
    if (!res || !res.ok) return toast.push('বাল্ক অ্যাকশন করা যায়নি', 'error');
    toast.push(action === 'resolved' ? `✅ ${selected.size} টি সমাধান হয়েছে` : `🚫 ${selected.size} টি বাতিল করা হয়েছে`, 'success');
    setSelected(new Set());
    router.refresh();
  };

  return (
    <>
      <ModerationShell
        title="তথ্য রিপোর্ট"
        description="ব্যবহারকারীরা ভুল তথ্য (ফোন, ঠিকানা, সময়সূচি) ফ্ল্যাগ করেছে — যাচাই করে সংশ্লিষ্ট পেজে সরাসরি ঠিক করুন।"
        tabs={[
          { key: 'open', href: '/moderation/reports?status=open', label: 'খোলা', count: counts.open },
          { key: 'resolved', href: '/moderation/reports?status=resolved', label: 'সমাধান হয়েছে', count: counts.resolved },
          { key: 'dismissed', href: '/moderation/reports?status=dismissed', label: 'বাতিল', count: counts.dismissed },
        ]}
        activeTab={tab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="🔍 এন্টিটি বা বিবরণ খুঁজুন..."
        items={filtered}
        itemKey={(r) => r.id}
        selectedIds={selected}
        onToggleSelect={toggleSelect}
        bulkBusy={bulkBusy}
        bulkActions={
          tab === 'open'
            ? [
                { label: '✅ সব সমাধান করুন', onClick: () => setBulkConfirm('resolved'), variant: 'primary' },
                { label: '🚫 সব বাতিল করুন', onClick: () => setBulkConfirm('dismissed'), variant: 'danger' },
              ]
            : []
        }
        emptyMessage="🎉 এই মুহূর্তে অপেক্ষমাণ রিপোর্ট নেই"
        renderItem={(r, { selected: isSelected, onToggleSelect: toggle }) => (
          <div key={r.id} className="rounded-xl border border-admin-border bg-white p-4">
            <div className="flex items-start gap-3">
              {tab === 'open' && (
                <input type="checkbox" checked={isSelected} onChange={toggle} className="mt-1 h-4 w-4 rounded border-admin-border" />
              )}
              <div className="min-w-0 flex-1">
                <a href={r.entity_href} target="_blank" rel="noopener noreferrer" className="text-admin-body font-medium text-brand-700 hover:underline">
                  {r.entity_name} ↗
                </a>
                <span className="ml-2 rounded-full bg-emergency-100 px-2 py-0.5 text-[11px] font-medium text-emergency-700">
                  {REASON_LABEL[r.reason] ?? r.reason}
                </span>
                {r.detail && <p className="mt-1 text-admin-small text-neutral-600">{r.detail}</p>}
                <p className="mt-1 text-admin-small text-neutral-500">{new Date(r.created_at).toLocaleDateString('bn-BD')}</p>
                {r.status === 'open' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => act(r.id, 'resolved')} disabled={busyId === r.id} className="h-8 rounded-md bg-life-600 px-3 text-admin-small font-semibold text-white hover:bg-life-700 disabled:opacity-50">✅ সমাধান হয়েছে চিহ্নিত করুন</button>
                    <button onClick={() => act(r.id, 'dismissed')} disabled={busyId === r.id} className="h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">🚫 বাতিল করুন</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      />

      <ConfirmDialog
        open={bulkConfirm !== null}
        title={bulkConfirm === 'resolved' ? `${selected.size} টি রিপোর্ট সমাধান হয়েছে চিহ্নিত করবেন?` : `${selected.size} টি রিপোর্ট বাতিল করবেন?`}
        description="এই পরিবর্তন এখনই কার্যকর হবে।"
        confirmLabel={bulkConfirm === 'resolved' ? 'সব সমাধান করুন' : 'সব বাতিল করুন'}
        variant={bulkConfirm === 'resolved' ? 'info' : 'danger'}
        busy={bulkBusy}
        onConfirm={() => bulkConfirm && runBulk(bulkConfirm)}
        onCancel={() => setBulkConfirm(null)}
      />
    </>
  );
}
