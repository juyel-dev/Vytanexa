import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AdminsManager } from '@/components/admins/AdminsManager';

export const dynamic = 'force-dynamic';

/**
 * Admin Users — super_admin only. Lists admin_users + auth emails, allows create/edit/suspend.
 */
export default async function AdminsPage() {
  await requireRole('super_admin');
  const supabase = createServiceRoleClient();

  const { data: admins } = await supabase
    .from('admin_users')
    .select('id, name, role, permissions, is_active, last_login_at, created_at')
    .order('created_at');

  // fetch emails via auth admin API
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  for (const u of authUsers?.users ?? []) {
    emailMap.set(u.id, u.email ?? '');
  }

  const enriched = (admins ?? []).map((a) => ({
    ...(a as object),
    email: emailMap.get((a as { id: string }).id) ?? '—',
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">অ্যাডমিন ও রোল</h1>
        <p className="mt-1 text-admin-body text-neutral-500">শুধু super_admin — নতুন অ্যাডমিন যোগ, রোল পরিবর্তন, সাসপেন্ড।</p>
      </div>
      <AdminsManager admins={enriched as never} />
    </div>
  );
}
