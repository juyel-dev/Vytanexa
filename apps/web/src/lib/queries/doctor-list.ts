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
  // URL/query-string input is untrusted: NaN/negative values would reach
  // PostgREST (`gte.NaN`, `range(NaN)`) and error out — which callers
  // previously showed as "no doctors found". Normalize centrally so the
  // SSR page and /api/doctors both get the same protection.
  const finite = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  const feeMin = finite(params.feeMin);
  const feeMax = finite(params.feeMax);
  const ratingMin = params.rating ? parseFloat(params.rating) : NaN;
  const page =
    Number.isInteger(params.page) && (params.page as number) >= 0 && (params.page as number) <= 1000
      ? (params.page as number)
      : 0;

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

  if (feeMin != null) query = query.gte('consultation_fee_min', feeMin);
  if (feeMax != null) query = query.lte('consultation_fee_min', feeMax);

  if (Number.isFinite(ratingMin) && ratingMin > 0 && ratingMin <= 5) {
    query = query.gte('rating_avg', ratingMin);
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

  // Unique tiebreaker: without it, rows tied on the sort key (e.g. many
  // doctors with rating 0) can reorder between page requests, so
  // infinite scroll shows duplicates and silently skips other doctors.
  query = query.order('id', { ascending: true });

  query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  return { data: data ?? [], error, count: count ?? 0, pageSize: PAGE_SIZE };
}
