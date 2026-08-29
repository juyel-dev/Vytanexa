import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export const dynamic = 'force-dynamic';

type SP = { range?: string };

export default async function AnalyticsPage({ searchParams }: { searchParams: SP }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const range = searchParams.range === '7d' ? '7d' : searchParams.range === '90d' ? '90d' : '30d';
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const sincePrev = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();

  // cards: counts for current range and previous range for % delta
  const [{ count: pageViews }, { count: pageViewsPrev }, { count: callClicks }, { count: waClicks }, { count: newLeads }] = await Promise.all([
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).in('event_type', ['doctor_view', 'hospital_view', 'article_view', 'page_view', 'search']).gte('created_at', since),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).in('event_type', ['doctor_view', 'hospital_view', 'article_view', 'page_view', 'search']).gte('created_at', sincePrev).lt('created_at', since),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'call_click').gte('created_at', since),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'whatsapp_click').gte('created_at', since),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ]);

  // daily traffic: group by day
  const { data: dailyRows } = await supabase.from('analytics_events').select('created_at').gte('created_at', since).limit(5000);
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  for (const r of dailyRows ?? []) {
    const key = (r as { created_at: string }).created_at.slice(0, 10);
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const daily = [...dailyMap.entries()].map(([date, count]) => ({ date, count }));

  // top doctors
  const { data: docViews } = await supabase.from('analytics_events').select('entity_id').eq('entity_type', 'doctor').eq('event_type', 'doctor_view').gte('created_at', since).limit(5000);
  const docCounts = new Map<string, number>();
  for (const r of docViews ?? []) {
    const id = (r as { entity_id: string | null }).entity_id;
    if (!id) continue;
    docCounts.set(id, (docCounts.get(id) ?? 0) + 1);
  }
  const topDocIds = [...docCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  let topDoctors: { id: string; name: string; views: number }[] = [];
  if (topDocIds.length > 0) {
    const { data: docs } = await supabase.from('doctors').select('id, name_translations, slug').in('id', topDocIds);
    const nameMap = new Map<string, string>();
    for (const d of docs ?? []) {
      const t = (d as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
      nameMap.set((d as { id: string }).id, (t?.bn || t?.en || (d as { slug: string }).slug) as string);
    }
    topDoctors = topDocIds.map((id) => ({ id, name: nameMap.get(id) ?? id.slice(0, 8), views: docCounts.get(id) ?? 0 }));
  }

  // top search queries
  const { data: searches } = await supabase.from('analytics_events').select('metadata').eq('event_type', 'search').gte('created_at', since).limit(5000);
  const searchCounts = new Map<string, number>();
  for (const r of searches ?? []) {
    const q = ((r as { metadata: { query?: string } | null }).metadata?.query ?? '').trim();
    if (!q) continue;
    searchCounts.set(q, (searchCounts.get(q) ?? 0) + 1);
  }
  const topSearches = [...searchCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([query, count]) => ({ query, count }));

  // location traffic
  const { data: locEvents } = await supabase.from('analytics_events').select('location_id').gte('created_at', since).not('location_id', 'is', null).limit(5000);
  const locCounts = new Map<string, number>();
  for (const r of locEvents ?? []) {
    const lid = (r as { location_id: string | null }).location_id;
    if (!lid) continue;
    locCounts.set(lid, (locCounts.get(lid) ?? 0) + 1);
  }
  const topLocIds = [...locCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  let topLocations: { id: string; name: string; count: number }[] = [];
  if (topLocIds.length > 0) {
    const { data: locs } = await supabase.from('locations').select('id, name_translations, slug').in('id', topLocIds);
    const locNameMap = new Map<string, string>();
    for (const l of locs ?? []) {
      const t = (l as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
      locNameMap.set((l as { id: string }).id, (t?.bn || t?.en || (l as { slug: string }).slug) as string);
    }
    topLocations = topLocIds.map((id) => ({ id, name: locNameMap.get(id) ?? id.slice(0, 8), count: locCounts.get(id) ?? 0 }));
  }

  const pct = (cur: number | null, prev: number | null) => {
    if (prev == null || prev === 0) return cur && cur > 0 ? 100 : 0;
    if (cur == null) return 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">অ্যানালিটিক্স</h1>
        <p className="mt-1 text-admin-body text-neutral-500">analytics_events থেকে রিড-ওনলি রিপোর্ট — কোনো write নেই।</p>
      </div>
      <AnalyticsDashboard
        range={range}
        cards={{
          pageViews: pageViews ?? 0,
          pageViewsDelta: pct(pageViews ?? 0, pageViewsPrev ?? 0),
          callClicks: callClicks ?? 0,
          waClicks: waClicks ?? 0,
          newLeads: newLeads ?? 0,
        }}
        daily={daily}
        topDoctors={topDoctors}
        topSearches={topSearches}
        topLocations={topLocations}
      />
    </div>
  );
}
