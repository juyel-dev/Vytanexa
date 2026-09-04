import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { BloodManager } from '@/components/blood/BloodManager';

export const dynamic = 'force-dynamic';

type SP = { q?: string; group?: string; location?: string; page?: string };
const PER_PAGE = 50;

/**
 * BLOOD-SERVICE-PLAN.md Phase A.7/A.8 — was a flat `.limit(200)` fetch
 * with every filter applied client-side (donors beyond #200 simply
 * invisible, no way to search by name/phone). Now server-side
 * search+pagination, same `searchParams` → `.range()`/`count:'exact'`
 * convention as `doctors/page.tsx`.
 *
 * Also fixes the location filter: previously fetched ALL location
 * types (state/district/sub_district/ward, .limit(500)) through
 * `sortLocationsHierarchically` — a helper built for chamber-address
 * precision (sub_district/ward). `blood_donors.location_id` is always
 * district-level, so that dropdown offered state/sub_district/ward
 * options that could never match any donor (silently empty results,
 * no explanation). Now fetches districts only.
 */
export default async function BloodPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const q = (searchParams.q ?? '').trim();
  const group = (searchParams.group ?? '').trim();
  const locationId = (searchParams.location ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const from = (page - 1) * PER_PAGE;

  let donorQuery = supabase
    .from('blood_donors')
    .select('id, name, blood_group, location_id, last_donated_at, is_active, phone', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (q) donorQuery = donorQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (group) donorQuery = donorQuery.eq('blood_group', group);
  if (locationId) donorQuery = donorQuery.eq('location_id', locationId);
  donorQuery = donorQuery.range(from, from + PER_PAGE - 1);

  const [{ data: donors, count }, { data: districts }, { data: hospitals }, { data: inventories }] = await Promise.all([
    donorQuery,
    supabase.from('locations').select('id, name_translations, slug').eq('type', 'district').is('deleted_at', null).order('display_order').limit(500),
    supabase.from('hospitals').select('id, name_translations, slug, facility_tags').is('deleted_at', null).contains('facility_tags', ['blood_bank']).limit(100),
    supabase.from('blood_bank_inventory').select('hospital_id, blood_group, stock_level, reported_at'),
  ]);

  const locMap = new Map<string, string>();
  for (const l of districts ?? []) {
    const t = (l as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
    locMap.set((l as { id: string }).id, (t?.bn || t?.en || (l as { slug: string }).slug) as string);
  }

  const enrichedDonors = (donors ?? []).map((d) => ({
    ...(d as object),
    location_name: locMap.get((d as { location_id: string }).location_id) ?? '—',
  }));

  const invByHosp = new Map<string, { blood_group: string; stock_level: string; reported_at: string }[]>();
  for (const inv of inventories ?? []) {
    const hid = (inv as { hospital_id: string }).hospital_id;
    const list = invByHosp.get(hid) ?? [];
    list.push(inv as never);
    invByHosp.set(hid, list);
  }

  const enrichedHospitals = (hospitals ?? []).map((h) => {
    const t = (h as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
    return {
      id: (h as { id: string }).id,
      name: (t?.bn || t?.en || (h as { slug: string }).slug) as string,
      inventory: invByHosp.get((h as { id: string }).id) ?? [],
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-admin-h1 text-neutral-900">রক্তদাতা ও ব্লাড ব্যাংক</h1>
      <BloodManager
        donors={enrichedDonors as never}
        total={count ?? 0}
        page={page}
        perPage={PER_PAGE}
        currentFilters={{ q, group, locationId }}
        hospitals={enrichedHospitals as never}
        districts={(districts ?? []) as never}
      />
    </div>
  );
}
