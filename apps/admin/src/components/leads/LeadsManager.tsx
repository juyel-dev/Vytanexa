'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Phone } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Lead = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  chamber_id: string | null;
  chamber_name: string;
  patient_name: string;
  patient_phone: string;
  preferred_time: string | null;
  message: string | null;
  status: string;
  created_at: string;
  contacted_at: string | null;
};

type Props = {
  leads: Lead[];
  total: number;
  page: number;
  perPage: number;
  counts: Record<string, number>;
  doctorOpts: { id: string; name: string }[];
  currentFilters: { status: string; doctor: string; q: string };
};

const STATUS_TABS: { key: string; bn: string }[] = [
  { key: 'new', bn: 'নতুন' },
  { key: 'contacted', bn: 'যোগাযোগ করা হয়েছে' },
  { key: 'completed', bn: 'সম্পন্ন' },
  { key: 'cancelled', bn: 'বাতিল' },
];

function buildUrl(f: Props['currentFilters'] & { page?: number }) {
  const p = new URLSearchParams();
  if (f.status && f.status !== 'all') p.set('status', f.status);
  if (f.doctor) p.set('doctor', f.doctor);
  if (f.q) p.set('q', f.q);
  if (f.page && f.page > 1) p.set('page', String(f.page));
  const s = p.toString();
  return s ? `/leads?${s}` : '/leads';
}

export function LeadsManager({ leads, total, page, perPage, counts, doctorOpts, currentFilters }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qInput, setQInput] = useState(currentFilters.q);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const push = (patch: Partial<Props['currentFilters']> & { page?: number }) => {
    const next = { ...currentFilters, ...patch } as Props['currentFilters'] & { page?: number };
    if (patch.status !== undefined || patch.doctor !== undefined || patch.q !== undefined) if (patch.page === undefined) next.page = 1;
    router.push(buildUrl(next));
  };

  const setStatus = async (lead: Lead, status: string) => {
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'আপডেট করা যায়নি', 'error');
      return;
    }
    toast.push('স্ট্যাটাস আপডেট হয়েছে ✅', 'success');
    router.refresh();
  };

  const exportCsv = () => {
    const header = 'patient_name,patient_phone,doctor,chamber,status,created_at,message';
    const rows = leads.map((l) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [esc(l.patient_name), esc(l.patient_phone), esc(l.doctor_name), esc(l.chamber_name), esc(l.status), esc(new Date(l.created_at).toLocaleString('bn-BD')), esc(l.message ?? '')].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${currentFilters.status}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* tabs + filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <a
            key={t.key}
            href={buildUrl({ ...currentFilters, status: t.key, page: 1 })}
            className={`h-8 rounded-full px-3 text-admin-small font-medium ${currentFilters.status === t.key ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}
          >
            {t.bn} ({counts[t.key] ?? 0})
          </a>
        ))}
        <a
          href={buildUrl({ ...currentFilters, status: 'all', page: 1 })}
          className={`h-8 rounded-full px-3 text-admin-small font-medium ${currentFilters.status === 'all' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}
        >
          সব
        </a>
        <span className="ml-auto flex items-center gap-2">
          <button onClick={exportCsv} className="h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">📥 CSV এক্সপোর্ট</button>
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-admin-border bg-white p-3 sm:flex-row sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); push({ q: qInput }); }} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="রোগী নাম / ফোন খুঁজুন..." className="h-9 w-full rounded-md border border-admin-border pl-9 pr-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </form>
        <select value={currentFilters.doctor} onChange={(e) => push({ doctor: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="">সব ডাক্তার</option>
          {doctorOpts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
              <tr><th className="px-3 py-2">রোগী</th><th className="px-3 py-2">ফোন</th><th className="px-3 py-2">ডাক্তার</th><th className="px-3 py-2">চেম্বার</th><th className="px-3 py-2">সময়</th><th className="px-3 py-2">স্ট্যাটাস</th></tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {leads.length === 0 ? <tr><td colSpan={6} className="px-6 py-10 text-center text-admin-body text-neutral-500">কোনো লিড নেই।</td></tr> : leads.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <button onClick={() => setExpanded(expanded === l.id ? null : l.id)} className="text-left">
                      <span className="block text-admin-body font-medium text-neutral-900">{l.patient_name}</span>
                      <span className="block text-admin-small text-neutral-500">{expanded === l.id ? '—' : l.message ? `"${l.message.slice(0, 30)}${l.message.length > 30 ? '…' : ''}"` : '— বার্তা নেই'}</span>
                    </button>
                    {expanded === l.id && l.message && <p className="mt-1 rounded-md bg-neutral-50 px-2 py-1 text-admin-small text-neutral-700">{l.message}</p>}
                    {expanded === l.id && l.preferred_time && <p className="mt-1 text-admin-small text-neutral-500">পছন্দের সময়: {l.preferred_time}</p>}
                  </td>
                  <td className="px-3 py-2"><a href={`tel:${l.patient_phone}`} className="inline-flex items-center gap-1 text-admin-body font-medium text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{l.patient_phone}</a></td>
                  <td className="px-3 py-2 text-admin-body text-neutral-700">{l.doctor_name}</td>
                  <td className="px-3 py-2 text-admin-body text-neutral-600">{l.chamber_name}</td>
                  <td className="px-3 py-2 text-admin-small text-neutral-500">{new Date(l.created_at).toLocaleString('bn-BD')}</td>
                  <td className="px-3 py-2">
                    <select value={l.status} onChange={(e) => setStatus(l, e.target.value)} className="h-7 rounded-md border border-admin-border bg-white px-1 text-admin-small">
                      <option value="new">নতুন</option>
                      <option value="contacted">যোগাযোগ করা হয়েছে</option>
                      <option value="completed">সম্পন্ন</option>
                      <option value="cancelled">বাতিল</option>
                      <option value="spam">স্প্যাম</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-admin-border px-3 py-2 text-admin-small">
          <span className="text-neutral-500">{total}টি লিড · পৃষ্ঠা {page} / {totalPages}</span>
          <span className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => push({ page: page - 1 })} className="rounded-md border border-admin-border px-2 py-1 text-neutral-700 hover:bg-neutral-50 disabled:opacity-30">◂</button>
            <span className="px-2 text-neutral-600">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => push({ page: page + 1 })} className="rounded-md border border-admin-border px-2 py-1 text-neutral-700 hover:bg-neutral-50 disabled:opacity-30">▸</button>
          </span>
        </div>
      </div>
    </div>
  );
}
