import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

export type ArticleListParams = {
  category?: string;
  page?: number;
};

const PAGE_SIZE = 10;

/**
 * Shared query builder for the Article List — VYTANEXA-BLUEPRINT.md §
 * S13. Same one-implementation-for-SSR-and-API-route pattern as
 * `hospital-list.ts`/`doctor-list.ts`.
 */
export async function queryArticleList(
  supabase: SupabaseClient<Database>,
  params: ArticleListParams
) {
  // Untrusted URL input: NaN/negative `page` broke `.range()` (shown as
  // "no articles"). Normalize here so SSR page and API agree.
  const page =
    Number.isInteger(params.page) && (params.page as number) >= 0 && (params.page as number) <= 1000
      ? (params.page as number)
      : 0;

  let query = supabase
    .from('articles')
    .select(
      'id, slug, title_translations, cover_image_url, category, author_name, author_doctor_id, read_time_minutes, published_at',
      { count: 'exact' }
    )
    .eq('is_published', true);

  if (params.category) query = query.eq('category', params.category);

  query = query
    // DESC sorts NULLs FIRST in Postgres: a published row with no
    // published_at would be pinned above every dated article.
    .order('published_at', { ascending: false, nullsFirst: false })
    // Unique tiebreaker: equal timestamps (bulk-seeded articles) reordered
    // between page requests -> duplicates/skips in infinite scroll.
    .order('id', { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  return { data: data ?? [], error, count: count ?? 0, pageSize: PAGE_SIZE };
}

/**
 * Distinct categories present among published articles — populates
 * the filter-chip row. Queried rather than hardcoded since `category`
 * is a free-text admin field (DATABASE-SCHEMA.md § "articles" —
 * `category TEXT`, not an enum or FK), so the actual set of values in
 * use can only be known by asking the data.
 */
export async function getArticleCategories(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('articles')
    .select('category')
    .eq('is_published', true)
    .not('category', 'is', null);

  if (error) {
    console.error('getArticleCategories failed:', error.message);
    return [];
  }
  return [...new Set((data ?? []).map((a) => a.category).filter((c): c is string => !!c))];
}
