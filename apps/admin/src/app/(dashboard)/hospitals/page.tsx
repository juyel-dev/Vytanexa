import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { HospitalsTable } from '@/components/hospitals/HospitalsTable';

export const dynamic = 'force-dynamic';

type SP = { q?: string; status?: string; type?: string; location?: string; emergency?: string; page?: string };

export default async function HospitalsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const q = (searchParams.q ?? '').trim();
  const status = (searchParams.status ?? 'all').trim();
  const type = (searchParams.type ?? '').trim();
  const locationId = (searchParams.location ?? '').trim();
  const emergency = searchParams.emergency === '1';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const perPage = 25;

  const [{ data: locations }] = await Promise.all([
    supabase.from('locations').select('id, parent_id, type, name_translations, slug').is('deleted_at', null).order('display_order').limit(500),
  ]);

  let query = supabase.from('hospitals').select('id, slug, name_translations, type, cover_image_url, location_id, has_emergency_dept, verification_status, is_featured, is_trending, rating_avg, rating_count, created_at', { count: 'exact' }).is('deleted_at', null);

  if (q) {
    const esc = q.replace(/%/g, '\\%').replace(/,/g, '\\,');
    query = query.or(`slug.ilike.%${esc}%,name_translations->>bn.ilike.%${esc}%,name_translations->>en.ilike.%${esc}%`);
  }
  if (status !== 'all' && ['pending', 'verified', 'rejected', 'suspended'].includes(status)) query = query.eq('verification_status', status as never);
  if (type) query = query.eq('type', type as never);
  if (locationId) query = query.eq('location_id', locationId);
  if (emergency) query = query.eq('has_emergency_dept', true);

  query = query.order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1);

  const { data: hospitals, count, error } = await query;

  if (error) {
    return <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-6 text-admin-body text-emergency-700">হাসপাতাল লোড করা যায়নি: {error.message}</div>;
  }

  // resolve location names
  const locIds = [...new Set((hospitals ?? []).map((h) => (h as { location_id: string }).location_id))];
  const locMap = new Map<string, string>();
  if (locIds.length > 0) {
    const { data: locs } = await supabase.from('locations').select('id, name_translations, slug').in('id', locIds);
    for (const l of locs ?? []) {
      const t = (l as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
      locMap.set((l as { id: string }).id, (t?.bn || t?.en || (l as { slug: string }).slug) as string);
    }
  }

  const enriched = (hospitals ?? []).map((h) => ({
    ...(h as object),
    location_name: locMap.get((h as { location_id: string }).location_id) ?? '—',
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-admin-h1 text-neutral-900">হাসপাতাল</h1>
        <a href="/hospitals/new" className="h-10 inline-flex items-center rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন হাসপাতাল</a>
      </div>
      <HospitalsTable hospitals={enriched as never} total={count ?? 0} page={page} perPage={perPage} locations={(locations ?? []) as never} currentFilters={{ q, status, type, locationId, emergency: emergency ? '1' : '' }} />
    </div>
  );
}
