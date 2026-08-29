'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

type Log = {
  id: number;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: unknown | null;
  after_data: unknown | null;
  ip_address: unknown | null;
  created_at: string;
  admin_users: { name: string } | null;
};

type Props = {
  logs: Log[];
  total: number;
  page: number;
  perPage: number;
  admins: { id: string; name: string }[];
  currentFilters: { q: string; admin: string; action: string; entity: string };
};

function buildUrl(f: Props['currentFilters'] & { page?: number }) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.admin) p.set('admin', f.admin);
  if (f.action) p.set('action', f.action);
  if (f.entity) p.set('entity', f.entity);
  if (f.page && f.page > 1) p.set('page', String(f.page));
  const s = p.toString();
  return s ? `/audit-log?${s}` : '/audit-log';
}

export function AuditLogViewer({ logs, total, page, perPage, admins, currentFilters }: Props) {
  const router = useRouter();
  const [qInput, setQInput] = useState(currentFilters.q);
  const [expanded, setExpanded] = useState<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const push = (patch: Partial<Props['currentFilters']> & { page?: number }) => {
    const next = { ...currentFilters, ...patch } as Props['currentFilters'] & { page?: number };
    if (patch.q !== undefined || patch.admin !== undefined || patch.action !== undefined || patch.entity !== undefined) if (patch.page === undefined) next.page = 1;
    router.push(buildUrl(next));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-admin-border bg-white p-3 sm:flex-row sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); push({ q: qInput }); }} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="খুঁজুন... (entity/action/id)" className="h-9 w-full rounded-md border border-admin-border pl-9 pr-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </form>
        <select value={currentFilters.admin} onChange={(e) => push({ admin: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="">সব অ্যাডমিন</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={currentFilters.action} onChange={(e) => push({ action: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="">সব অ্যাকশন</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
          <option value="publish">publish</option>
        </select>
        <select value={currentFilters.entity} onChange={(e) => push({ entity: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
          <option value="">সব entity</option>
          <option value="doctor">doctor</option>
          <option value="hospital">hospital</option>
          <option value="location">location</option>
          <option value="category">category</option>
          <option value="article">article</option>
          <option value="app_settings">app_settings</option>
          <option value="admin_user">admin_user</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
              <tr><th className="px-3 py-2">সময়</th><th className="px-3 py-2">অ্যাডমিন</th><th className="px-3 py-2">অ্যাকশন</th><th className="px-3 py-2">entity</th><th className="px-3 py-2">ID</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">বিস্তারিত</th></tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {logs.length === 0 ? <tr><td colSpan={7} className="px-6 py-10 text-center text-admin-body text-neutral-500">কোনো লগ নেই।</td></tr> : logs.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 text-admin-small text-neutral-600">{new Date(l.created_at).toLocaleString('bn-BD')}</td>
                  <td className="px-3 py-2 text-admin-body text-neutral-700">{l.admin_users?.name ?? l.admin_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${l.action === 'create' ? 'bg-life-100 text-life-700' : l.action === 'delete' ? 'bg-emergency-100 text-emergency-700' : l.action === 'publish' ? 'bg-brand-100 text-brand-700' : 'bg-neutral-100 text-neutral-600'}`}>{l.action}</span></td>
                  <td className="px-3 py-2 text-admin-small text-neutral-600">{l.entity_type}</td>
                  <td className="px-3 py-2 text-admin-small text-neutral-500">{l.entity_id ? l.entity_id.slice(0, 8) : '—'}</td>
                  <td className="px-3 py-2 text-admin-small text-neutral-400">{String(l.ip_address ?? '—')}</td>
                  <td className="px-3 py-2"><button onClick={() => setExpanded(expanded === l.id ? null : l.id)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">{expanded === l.id ? 'লুকান' : 'দেখুন'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.some((l) => expanded === l.id) && (
          <div className="border-t border-admin-border bg-neutral-50 p-3">
            {logs.filter((l) => l.id === expanded).map((l) => (
              <div key={l.id} className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-admin-small font-medium text-neutral-700">Before</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-white p-2 font-mono text-[11px] text-neutral-600">{l.before_data ? JSON.stringify(l.before_data, null, 2) : '—'}</pre>
                </div>
                <div>
                  <p className="text-admin-small font-medium text-neutral-700">After</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-white p-2 font-mono text-[11px] text-neutral-600">{l.after_data ? JSON.stringify(l.after_data, null, 2) : '—'}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-admin-border px-3 py-2 text-admin-small">
          <span className="text-neutral-500">{total}টি লগ · পৃষ্ঠা {page} / {totalPages}</span>
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
