import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';

export const dynamic = 'force-dynamic';

type SP = { q?: string; admin?: string; action?: string; entity?: string; page?: string };

export default async function AuditLogPage({ searchParams }: { searchParams: SP }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const q = (searchParams.q ?? '').trim();
  const adminFilter = (searchParams.admin ?? '').trim();
  const actionFilter = (searchParams.action ?? '').trim();
  const entityFilter = (searchParams.entity ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const perPage = 25;

  const [{ data: admins }] = await Promise.all([
    supabase.from('admin_users').select('id, name').order('name').limit(100),
  ]);

  let query = supabase.from('audit_logs').select('id, admin_id, action, entity_type, entity_id, before_data, after_data, ip_address, created_at, admin_users(name)', { count: 'exact' }).order('created_at', { ascending: false });

  if (adminFilter) query = query.eq('admin_id', adminFilter);
  if (actionFilter) query = query.eq('action', actionFilter);
  if (entityFilter) query = query.eq('entity_type', entityFilter);
  if (q) {
    const esc = q.replace(/%/g, '\\%');
    query = query.or(`entity_type.ilike.%${esc}%,entity_id.ilike.%${esc}%,action.ilike.%${esc}%`);
  }

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data: logs, count, error } = await query;

  if (error) return <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-6 text-admin-body text-emergency-700">অডিট লগ লোড করা যায়নি: {error.message}</div>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">অডিট লগ</h1>
        <p className="mt-1 text-admin-body text-neutral-500">প্রতিটি অ্যাডমিন পরিবর্তনের before/after — accountability।</p>
      </div>
      <AuditLogViewer logs={(logs ?? []) as never} total={count ?? 0} page={page} perPage={perPage} admins={(admins ?? []) as never} currentFilters={{ q, admin: adminFilter, action: actionFilter, entity: entityFilter }} />
    </div>
  );
}
