import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';
import { getLocationSubtreeIds } from './location-subtree';

export type HospitalListParams = {
  type?: string; // hospital_type enum value
  emergencyOnly?: boolean;
  locationId?: string; // district location_id — VYTANEXA-BLUEPRINT.md § S12 correction (see TODO.md)
  page?: number;
};

const PAGE_SIZE = 12;

/**
 * Shared query builder for the Hospital List — same pattern as
 * `lib/queries/doctor-list.ts` (S06): one implementation used by both
 * the SSR page and the infinite-scroll API route.
 *
 * `locationId` — hierarchy-aware district filtering: expands to the
 * picked location + all descendants (see `location-subtree.ts`), so a
 * district also matches hospitals tagged at sub_district/ward level.
 * Optional: omitting it returns results nationally, same as before.
 */
export async function queryHospitalList(
  supabase: SupabaseClient<Database>,
  params: HospitalListParams
) {
  const page = params.page ?? 0;

  let query = supabase
    .from('hospitals')
    .select(
      `id, slug, name_translations, cover_image_url, type,
       has_emergency_dept, facility_tags, phone, rating_avg, rating_count,
       is_featured, is_trending`,
      { count: 'exact' }
    )
    .eq('verification_status', 'verified');

  if (params.type) {
    query = query.eq('type', params.type as Database['public']['Enums']['hospital_type']);
  }
  if (params.emergencyOnly) query = query.eq('has_emergency_dept', true);
  if (params.locationId) {
    query = query.in('location_id', await getLocationSubtreeIds(supabase, params.locationId));
  }

  query = query
    .order('is_featured', { ascending: false })
    .order('is_trending', { ascending: false })
    .order('rating_avg', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  return { data: data ?? [], error, count: count ?? 0, pageSize: PAGE_SIZE };
}
