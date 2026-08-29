import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { MenuManager } from '@/components/god-mode/MenuManager';

export const dynamic = 'force-dynamic';

export default async function GodMenuPage() {
  await requireRole('super_admin');
  const supabase = createServiceRoleClient();
  const { data: pages } = await supabase
    .from('custom_pages')
    .select('id, slug, title, show_in_menu, menu_order, menu_icon, is_published')
    .is('deleted_at', null)
    .order('menu_order')
    .limit(200);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">মেনু ম্যানেজার</h1>
        <p className="mt-1 text-admin-body text-neutral-500">হ্যামবার্গ মেনুতে কী দেখাবে — শুধু কাস্টম পেজ সাজাতে পারবেন; স্ট্যাটিক ৫ গ্রুপ কোডে fixed। super_admin।</p>
      </div>
      <MenuManager initialPages={(pages ?? []) as never} />
    </div>
  );
}
