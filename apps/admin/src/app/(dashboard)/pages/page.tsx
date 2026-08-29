import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PagesList } from '@/components/custom-pages/PagesList';

export const dynamic = 'force-dynamic';

/**
 * Custom Pages List — A09. Server fetches pages + submission counts for delete warning.
 */
export default async function CustomPagesPage() {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const { data: pages } = await supabase
    .from('custom_pages')
    .select('id, slug, title, is_published, show_in_menu, menu_order, blocks, updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  // submission counts per page (for delete warning)
  const pageIds = (pages ?? []).map((p) => (p as { id: string }).id);
  const counts = new Map<string, number>();
  if (pageIds.length > 0) {
    const { data: subs } = await supabase.from('page_submissions').select('page_id').in('page_id', pageIds);
    for (const s of subs ?? []) counts.set((s as { page_id: string }).page_id, (counts.get((s as { page_id: string }).page_id) ?? 0) + 1);
  }

  const enriched = (pages ?? []).map((p) => ({
    ...(p as object),
    submission_count: counts.get((p as { id: string }).id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">কাস্টম পেজ</h1>
        <p className="mt-1 text-admin-body text-neutral-500">S19 ব্লক বিল্ডার — শিরোনাম + স্লাগ দিয়ে শুরু, বিল্ডারে ব্লক সাজান।</p>
      </div>
      <PagesList initialPages={enriched as never} />
    </div>
  );
}
