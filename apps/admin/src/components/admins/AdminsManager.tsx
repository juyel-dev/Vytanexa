'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type AdminRow = { id: string; name: string; email: string; role: string; is_active: boolean; last_login_at: string | null; created_at: string };

const ROLE_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: 'super_admin', label: 'super_admin', desc: 'সব কিছু — god mode, admin manage' },
  { value: 'admin', label: 'admin', desc: 'CRUD + verify + moderate + publish' },
  { value: 'moderator', label: 'moderator', desc: 'শুধু moderate' },
  { value: 'editor', label: 'editor', desc: 'কন্টেন্ট CRUD, publish নয়' },
];

export function AdminsManager({ admins }: { admins: AdminRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [edit, setEdit] = useState<AdminRow | null>(null);
  const [editRole, setEditRole] = useState('editor');
  const [busy, setBusy] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminRow | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) { toast.push('নাম ও ইমেইল দিন', 'error'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'তৈরি করা যায়নি', 'error');
      return;
    }
    toast.push('✅ অ্যাডমিন তৈরি হয়েছে — ইমেইলে ইনভাইট গেছে', 'success');
    setShowNew(false);
    setName(''); setEmail(''); setRole('editor');
    router.refresh();
  };

  const handleEdit = async () => {
    if (!edit) return;
    setBusy(true);
    const res = await fetch(`/api/admin/admins/${edit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editRole }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'আপডেট করা যায়নি', 'error');
      return;
    }
    toast.push('রোল আপডেট হয়েছে ✅', 'success');
    setEdit(null);
    router.refresh();
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    const res = await fetch(`/api/admin/admins/${suspendTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !suspendTarget.is_active }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'আপডেট করা যায়নি', 'error');
      return;
    }
    toast.push(suspendTarget.is_active ? 'নিষ্ক্রিয় করা হয়েছে' : 'সক্রিয় করা হয়েছে', 'success');
    setSuspendTarget(null);
    router.refresh();
  };

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="h-10 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন অ্যাডমিন</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-admin-small uppercase tracking-wide text-neutral-500">
              <tr><th className="px-3 py-2">নাম</th><th className="px-3 py-2">ইমেইল</th><th className="px-3 py-2">রোল</th><th className="px-3 py-2">সক্রিয়</th><th className="px-3 py-2">শেষ লগইন</th><th className="px-3 py-2">একশন</th></tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 text-admin-body font-medium text-neutral-900">{a.name}</td>
                  <td className="px-3 py-2 text-admin-small text-neutral-600">{a.email}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : a.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-neutral-100 text-neutral-600'}`}>{a.role}</span></td>
                  <td className="px-3 py-2">{a.is_active ? <span className="rounded-full bg-life-100 px-2 py-0.5 text-[11px] font-medium text-life-700">✅</span> : <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600">—</span>}</td>
                  <td className="px-3 py-2 text-admin-small text-neutral-500">{a.last_login_at ? new Date(a.last_login_at).toLocaleDateString('bn-BD') : '—'}</td>
                  <td className="px-3 py-2">
                    <span className="flex gap-1">
                      <button onClick={() => { setEdit(a); setEditRole(a.role); }} className="rounded-md border border-admin-border bg-white px-2 py-1 text-admin-small text-neutral-700 hover:bg-neutral-50">✏️</button>
                      <button onClick={() => setSuspendTarget(a)} className={`rounded-md border px-2 py-1 text-admin-small ${a.is_active ? 'border-emergency-200 bg-emergency-50 text-emergency-700 hover:bg-emergency-100' : 'border-life-200 bg-life-50 text-life-700 hover:bg-life-100'}`}>{a.is_active ? '🚫' : '✅'}</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-admin-border bg-neutral-50 p-4">
        <h3 className="text-admin-small font-medium text-neutral-700">রোল ম্যাট্রিক্স (A02)</h3>
        <ul className="mt-1 list-disc pl-5 text-admin-small text-neutral-600">
          <li>super_admin: সব — god mode, admin manage</li>
          <li>admin: CRUD + verify + moderate + publish</li>
          <li>moderator: শুধু moderate</li>
          <li>editor: কন্টেন্ট CRUD, publish নয় (খসড়া পর্যন্ত)</li>
        </ul>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setShowNew(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">নতুন অ্যাডমিন যোগ করুন</h2>
            <p className="mt-1 text-admin-small text-neutral-500">ইমেইলে ইনভাইট যাবে — পাসওয়ার্ড Supabase Auth এ সেট হবে।</p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">নাম *</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="রহিম" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ইমেইল *</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="rahim@example.com" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">রোল</span>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="h-9 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700">বাতিল</button>
              <button onClick={handleCreate} disabled={busy} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white disabled:opacity-50">{busy ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}</button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={() => setEdit(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-admin-border bg-white p-5 shadow-xl">
            <h2 className="text-admin-h2 text-neutral-900">রোল পরিবর্তন: {edit.name}</h2>
            <label className="mt-4 flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">রোল</span>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="h-9 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700">বাতিল</button>
              <button onClick={handleEdit} disabled={busy} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white disabled:opacity-50">{busy ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!suspendTarget} title={suspendTarget?.is_active ? 'নিষ্ক্রিয় করবেন?' : 'সক্রিয় করবেন?'} description={suspendTarget ? `${suspendTarget.name} (${suspendTarget.role}) — ${suspendTarget.is_active ? 'তৎক্ষণাৎ লগআউট হবে, reversible' : 'আবার লগইন করতে পারবে'}` : ''} confirmLabel={suspendTarget?.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'} variant={suspendTarget?.is_active ? 'danger' : 'info'} busy={busy} onConfirm={handleSuspend} onCancel={() => setSuspendTarget(null)} />
    </>
  );
}
