import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

export type DoctorListParams = {
  specialty?: string; // comma-separated category slugs
  district?: string; // location id
  feeMin?: number;
  feeMax?: number;
  rating?: string; // '4.5' | '4.0' | 'any'
  languages?: string; // comma-separated
  sort?: 'rating' | 'reviews' | 'fee_asc' | 'experience';
  page?: number;
};

const PAGE_SIZE = 12;

/**
 * Shared query builder for the Doctor List — VYTANEXA-BLUEPRINT.md §
 * S06 "DATA QUERY (Reference)" and "URL STATE MANAGEMENT". One
 * implementation used by both the SSR page (first page, server
 * component) and the infinite-scroll API route (subsequent pages) so
 * the two can never drift out of sync with each other.
 *
 * `availableToday` (S06 spec) is intentionally not implemented yet —
 * it requires joining chambers.schedule and computing live open/closed
 * status, which is meaningful once chamber data actually exists.
 * Filtering on it today would just always return zero rows, which is
 * technically correct but not worth the query complexity until there's
 * real chamber data to test against.
 */
export async function queryDoctorList(
  supabase: SupabaseClient<Database>,
  params: DoctorListParams
) {
  const page = params.page ?? 0;

  let query = supabase
    .from('doctors')
    .select(
      `id, slug, name_translations, photo_url, experience_years,
       rating_avg, rating_count, consultation_fee_min, consultation_fee_max,
       is_featured, featured_priority, whatsapp_number, languages,
       categories!inner(id, slug, name_translations)`,
      { count: 'exact' }
    )
    .eq('verification_status', 'verified');

  if (params.specialty) {
    const slugs = params.specialty.split(',').filter(Boolean);
    if (slugs.length > 0) query = query.in('categories.slug', slugs);
  }

  if (params.feeMin != null) query = query.gte('consultation_fee_min', params.feeMin);
  if (params.feeMax != null) query = query.lte('consultation_fee_min', params.feeMax);

  if (params.rating && params.rating !== 'any') {
    query = query.gte('rating_avg', parseFloat(params.rating));
  }

  if (params.languages) {
    const langs = params.languages.split(',').filter(Boolean);
    if (langs.length > 0) query = query.overlaps('languages', langs);
  }

  // district filtering needs a chambers join (chambers.location_id),
  // deferred alongside availableToday for the same reason — no
  // meaningful chamber data exists yet to filter against.

  switch (params.sort) {
    case 'reviews':
      query = query.order('rating_count', { ascending: false });
      break;
    case 'fee_asc':
      query = query.order('consultation_fee_min', { ascending: true, nullsFirst: false });
      break;
    case 'experience':
      query = query.order('experience_years', { ascending: false });
      break;
    case 'rating':
    default:
      query = query
        .order('is_featured', { ascending: false })
        .order('featured_priority', { ascending: false })
        .order('rating_avg', { ascending: false });
  }

  query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  return { data: data ?? [], error, count: count ?? 0, pageSize: PAGE_SIZE };
}
