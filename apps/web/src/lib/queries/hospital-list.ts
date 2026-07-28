import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

export type HospitalListParams = {
  type?: string; // hospital_type enum value
  emergencyOnly?: boolean;
  page?: number;
};

const PAGE_SIZE = 12;

/**
 * Shared query builder for the Hospital List — same pattern as
 * `lib/queries/doctor-list.ts` (S06): one implementation used by both
 * the SSR page and the infinite-scroll API route.
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

  query = query
    .order('is_featured', { ascending: false })
    .order('is_trending', { ascending: false })
    .order('rating_avg', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  return { data: data ?? [], error, count: count ?? 0, pageSize: PAGE_SIZE };
}
