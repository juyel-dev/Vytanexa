import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/** Custom Page — VYTANEXA-BLUEPRINT.md § S19 "Route Behavior". RLS already filters to published, non-deleted pages. */
export async function getCustomPageBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data, error } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

export type CustomPageDetail = NonNullable<Awaited<ReturnType<typeof getCustomPageBySlug>>>;

/**
 * Block support queries — VYTANEXA-BLUEPRINT.md § S19's `magazine_grid`
 * / `doctor_grid` / `hospital_grid` blocks. Kept here rather than in
 * `article-list.ts`/`doctor-list.ts`/`hospital-list.ts` since these
 * are purely block-rendering support (curated-by-admin-ID or simple
 * category filter), not the paginated/filtered list views those files
 * already handle — different enough shape to not force-fit into the
 * existing list query functions.
 */

export async function getArticlesForGrid(
  supabase: SupabaseClient<Database>,
  { category, tags, limit = 6 }: { category?: string; tags?: string[]; limit?: number }
) {
  let query = supabase
    .from('articles')
    .select('id, slug, title_translations, cover_image_url, category, read_time_minutes')
    .eq('is_published', true);

  if (category) query = query.eq('category', category);
  if (tags && tags.length > 0) query = query.overlaps('tags', tags);

  const { data, error } = await query
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getArticlesForGrid failed:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getDoctorsByIds(supabase: SupabaseClient<Database>, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('doctors')
    .select(
      'id, slug, name_translations, photo_url, experience_years, rating_avg, rating_count, consultation_fee_min, consultation_fee_max, is_featured, whatsapp_number, categories(name_translations)'
    )
    .in('id', ids)
    .eq('verification_status', 'verified');

  if (error) {
    console.error('getDoctorsByIds failed:', error.message);
    return [];
  }
  // Preserve admin's curated order (e.g. "Camp Doctors" ordering
  // intent) rather than whatever order Postgres happens to return.
  const byId = new Map(data?.map((d) => [d.id, d]));
  return ids.map((id) => byId.get(id)).filter((d): d is NonNullable<typeof d> => !!d);
}

export async function getHospitalsByIds(supabase: SupabaseClient<Database>, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('hospitals')
    .select(
      'id, slug, name_translations, cover_image_url, type, has_emergency_dept, facility_tags, phone, rating_avg, rating_count'
    )
    .in('id', ids)
    .eq('verification_status', 'verified');

  if (error) {
    console.error('getHospitalsByIds failed:', error.message);
    return [];
  }
  const byId = new Map(data?.map((h) => [h.id, h]));
  return ids.map((id) => byId.get(id)).filter((h): h is NonNullable<typeof h> => !!h);
}
