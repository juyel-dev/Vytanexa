import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { DoctorsTable } from '@/components/doctors/DoctorsTable';

export const dynamic = 'force-dynamic';

type SP = {
  q?: string;
  status?: string;
  category?: string;
  location?: string;
  page?: string;
  sort?: string;
  order?: string;
};

/**
 * Doctors Manager — List Page (A05). Server component fetches a paginated,
 * filterable list via service-role. Client table handles URL-driven filters,
 * bulk actions and row menus.
 */
export default async function DoctorsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const q = (searchParams.q ?? '').trim();
  const status = (searchParams.status ?? 'all').trim();
  const categoryId = (searchParams.category ?? '').trim();
  const locationId = (searchParams.location ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const perPage = 25;
  const sort = searchParams.sort ?? 'created_at';
  const order = searchParams.order === 'asc' ? 'asc' : 'desc';

  // filter dropdown data
  const [{ data: categories }, { data: locations }] = await Promise.all([
    supabase.from('categories').select('id, name_translations, slug').is('deleted_at', null).order('display_order').limit(200),
    supabase.from('locations').select('id, name_translations, slug, type').is('deleted_at', null).order('display_order').limit(500),
  ]);

  // location filter → doctor ids via chambers
  let locationDoctorIds: string[] | null = null;
  if (locationId) {
    const { data: chs } = await supabase
      .from('chambers')
      .select('doctor_id')
      .eq('location_id', locationId)
      .is('deleted_at', null)
      .limit(5000);
    locationDoctorIds = (chs ?? []).map((r) => (r as { doctor_id: string }).doctor_id);
    if (locationDoctorIds.length === 0) {
      // no doctors in that location — return empty result early
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-admin-h1 text-neutral-900">ডাক্তার</h1>
            <a href="/doctors/new" className="h-10 rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন ডাক্তার</a>
          </div>
          <DoctorsTable
            doctors={[]}
            total={0}
            page={1}
            perPage={perPage}
            categories={(categories ?? []) as never}
            locations={(locations ?? []) as never}
            currentFilters={{ q, status, categoryId, locationId, sort, order }}
          />
        </div>
      );
    }
  }

  // build query
  let query = supabase
    .from('doctors')
    .select('id, slug, name_translations, photo_url, category_id, verification_status, is_available, is_featured, rating_avg, rating_count, created_at, categories(id, name_translations, slug)', { count: 'exact' })
    .is('deleted_at', null);

  if (q) {
    const esc = q.replace(/%/g, '\\%').replace(/,/g, '\\,');
    query = query.or(`slug.ilike.%${esc}%,name_translations->>bn.ilike.%${esc}%,name_translations->>en.ilike.%${esc}%`);
  }
  if (status !== 'all' && ['pending', 'verified', 'rejected', 'suspended'].includes(status)) {
    query = query.eq('verification_status', status as never);
  }
  if (categoryId) query = query.eq('category_id', categoryId);
  if (locationDoctorIds) query = query.in('id', locationDoctorIds);

  // sort: allowlist
  const allowedSort = new Set(['created_at', 'rating_avg', 'name_translations']);
  const sortField = allowedSort.has(sort) ? sort : 'created_at';
  // name_translations sort not directly sortable via string field — fallback to created_at for now
  const effectiveSort = sortField === 'name_translations' ? 'created_at' : sortField;
  query = query.order(effectiveSort as never, { ascending: order === 'asc' });

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: doctors, count, error } = await query;

  if (error) {
    return (
      <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-6 text-admin-body text-emergency-700">
        ডাক্তার লোড করা যায়নি: {error.message}
      </div>
    );
  }

  // fetch primary chambers for location column (for displayed doctors)
  const ids = (doctors ?? []).map((d) => (d as { id: string }).id);
  let primaryChambers: { doctor_id: string; location_id: string; chamber_name: string }[] = [];
  let locationMap = new Map<string, { name_translations: { bn?: string; en?: string } | null; slug: string }>();
  if (ids.length > 0) {
    const { data: chs } = await supabase
      .from('chambers')
      .select('doctor_id, location_id, chamber_name')
      .in('doctor_id', ids)
      .eq('is_primary', true)
      .is('deleted_at', null);
    primaryChambers = (chs ?? []) as never;
    const locIds = [...new Set(primaryChambers.map((c) => c.location_id))];
    if (locIds.length > 0) {
      const { data: locs } = await supabase.from('locations').select('id, name_translations, slug').in('id', locIds);
      for (const l of locs ?? []) {
        locationMap.set((l as { id: string }).id, l as never);
      }
    }
  }

  const enriched = (doctors ?? []).map((d) => {
    const doc = d as { id: string; slug: string; name_translations: unknown; photo_url: string | null; category_id: string; verification_status: string; is_available: boolean; is_featured: boolean; rating_avg: number; rating_count: number; created_at: string; categories: unknown };
    const pc = primaryChambers.find((c) => c.doctor_id === doc.id);
    const loc = pc ? locationMap.get(pc.location_id) : null;
    const locName = loc ? ((loc.name_translations as { bn?: string; en?: string } | null)?.bn || (loc.name_translations as { bn?: string; en?: string } | null)?.en || loc.slug) : null;
    return { ...doc, primary_location_name: locName, primary_chamber_name: pc?.chamber_name ?? null };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-admin-h1 text-neutral-900">ডাক্তার</h1>
        <a href="/doctors/new" className="h-10 inline-flex items-center rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">
          + নতুন ডাক্তার
        </a>
      </div>
      <DoctorsTable
        doctors={enriched as never}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        categories={(categories ?? []) as never}
        locations={(locations ?? []) as never}
        currentFilters={{ q, status, categoryId, locationId, sort, order }}
      />
    </div>
  );
}
