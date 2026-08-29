import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NotificationsManager } from '@/components/notifications/NotificationsManager';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const tab = searchParams.tab === 'personal' ? 'personal' : 'broadcasts';

  const [{ data: broadcasts }, { data: personals }] = await Promise.all([
    supabase.from('notifications').select('id, type, title, body, target_url, show_as_banner, is_active, expires_at, created_at').in('type', ['general', 'emergency']).order('created_at', { ascending: false }).limit(100),
    supabase.from('notifications').select('id, type, title, body, target_user_id, created_at').eq('type', 'personal').order('created_at', { ascending: false }).limit(100),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">নোটিফিকেশন</h1>
        <p className="mt-1 text-admin-body text-neutral-500">ব্রডকাস্ট পাঠান বা ব্যক্তিগত লগ দেখুন।</p>
      </div>
      <NotificationsManager broadcasts={(broadcasts ?? []) as never} personals={(personals ?? []) as never} tab={tab} />
    </div>
  );
}
