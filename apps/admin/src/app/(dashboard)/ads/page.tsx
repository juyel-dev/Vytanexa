import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AdsManager } from '@/components/ads/AdsManager';

export const dynamic = 'force-dynamic';

export default async function AdsPage() {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const { data: ads } = await supabase.from('ads').select('id, placement, sponsor_name, image_url, target_url, display_order, start_date, end_date, is_active, created_at').is('deleted_at', null).order('display_order').limit(100);

  // fetch analytics counts per ad (impressions/clicks)
  const ids = (ads ?? []).map((a) => (a as { id: string }).id);
  const stats = new Map<string, { impressions: number; clicks: number }>();
  if (ids.length > 0) {
    const { data: events } = await supabase.from('analytics_events').select('entity_id, event_type').in('entity_id', ids).in('event_type', ['ad_impression', 'ad_click']).limit(5000);
    for (const e of events ?? []) {
      const ent = (e as { entity_id: string; event_type: string }).entity_id;
      const cur = stats.get(ent) ?? { impressions: 0, clicks: 0 };
      if ((e as { event_type: string }).event_type === 'ad_impression') cur.impressions++;
      else cur.clicks++;
      stats.set(ent, cur);
    }
  }

  const enriched = (ads ?? []).map((a) => ({
    ...(a as object),
    impressions: stats.get((a as { id: string }).id)?.impressions ?? 0,
    clicks: stats.get((a as { id: string }).id)?.clicks ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">বিজ্ঞাপন</h1>
        <p className="mt-1 text-admin-body text-neutral-500">প্লেসমেন্ট, তারিখ পরিসীমা ও সক্রিয় টগল — `ads` টেবিল super_admin নয়, admin-ও পারে।</p>
      </div>
      <AdsManager ads={enriched as never} />
    </div>
  );
}
