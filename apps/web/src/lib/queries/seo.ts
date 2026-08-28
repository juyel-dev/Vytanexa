import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@vytanexa/database';
import { getLocalizedField } from '@/lib/i18n';

/**
 * SEO Landing Pages — data helpers
 * VYTANEXA-BLUEPRINT.md § S21 + CHECKPOINT.md §3
 *
 * URL hierarchy: /[state] → /[state]/[district] → /[state]/[district]/[specialty]
 * Guardrail: generateStaticParams only includes combos with doctor_count >= 1.
 * Since doctor→district mapping requires a chambers join and no meaningful
 * chamber data exists yet (same deferral noted in lib/queries/doctor-list.ts
 * and symptom-detail.ts's getSpecialtyDoctorCounts), the guardrail is
 * applied at the *specialty* level nationally: a specialty with zero
 * verified doctors nationally never generates an SEO page for any district.
 * District-level filtering on the page itself reuses that same honest
 * fallback — the doctor list is filtered by specialty only, with the
 * district shown as SEO context. This matches the project's established
 * pattern of documenting deferred district filtering rather than faking it.
 */

export type SeoLocation = {
  id: string;
  slug: string;
  name_translations: Json;
  type: string;
  parent_id: string | null;
};

export type SeoCategory = {
  id: string;
  slug: string;
  name_translations: Json;
};

// --- Basic location / category fetchers ---

export async function getStateBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<SeoLocation | null> {
  const { data } = await supabase
    .from('locations')
    .select('id, slug, name_translations, type, parent_id')
    .eq('slug', slug)
    .eq('type', 'state')
    .is('deleted_at', null)
    .eq('is_active', true)
    .maybeSingle();
  return (data as SeoLocation | null) ?? null;
}

export async function getDistrictBySlug(
  supabase: SupabaseClient<Database>,
  slug: string,
  stateId: string
): Promise<SeoLocation | null> {
  const { data } = await supabase
    .from('locations')
    .select('id, slug, name_translations, type, parent_id')
    .eq('slug', slug)
    .eq('type', 'district')
    .eq('parent_id', stateId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .maybeSingle();
  return (data as SeoLocation | null) ?? null;
}

export async function getCategoryBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<SeoCategory | null> {
  const { data } = await supabase
    .from('categories')
    .select('id, slug, name_translations')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as SeoCategory | null) ?? null;
}

export async function getAllStates(supabase: SupabaseClient<Database>): Promise<SeoLocation[]> {
  const { data } = await supabase
    .from('locations')
    .select('id, slug, name_translations, type, parent_id')
    .eq('type', 'state')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('slug', { ascending: true });
  return (data as SeoLocation[] | null) ?? [];
}

export async function getDistrictsForState(
  supabase: SupabaseClient<Database>,
  stateId: string
): Promise<SeoLocation[]> {
  const { data } = await supabase
    .from('locations')
    .select('id, slug, name_translations, type, parent_id')
    .eq('type', 'district')
    .eq('parent_id', stateId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('slug', { ascending: true });
  return (data as SeoLocation[] | null) ?? [];
}

export async function getAllDistricts(supabase: SupabaseClient<Database>): Promise<SeoLocation[]> {
  const { data } = await supabase
    .from('locations')
    .select('id, slug, name_translations, type, parent_id')
    .eq('type', 'district')
    .is('deleted_at', null)
    .eq('is_active', true);
  return (data as SeoLocation[] | null) ?? [];
}

export async function getAllActiveCategories(
  supabase: SupabaseClient<Database>
): Promise<SeoCategory[]> {
  const { data } = await supabase
    .from('categories')
    .select('id, slug, name_translations')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });
  return (data as SeoCategory[] | null) ?? [];
}

/**
 * Active categories that have at least 1 verified doctor nationally.
 * This is the S21 guardrail source. One extra round-trip per category
 * is acceptable at build time (SSG) — same pattern as
 * getSpecialtyDoctorCounts in symptom-detail.ts.
 */
export async function getCategoriesWithDoctors(
  supabase: SupabaseClient<Database>
): Promise<SeoCategory[]> {
  const categories = await getAllActiveCategories(supabase);
  if (categories.length === 0) return [];

  // Parallel head counts per category — DB-enforced, never throws.
  const counts = await Promise.all(
    categories.map(async (cat) => {
      const { count } = await supabase
        .from('doctors')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', cat.id)
        .eq('verification_status', 'verified');
      return { cat, count: count ?? 0 };
    })
  );

  return counts.filter((c) => c.count > 0).map((c) => c.cat);
}

export async function getDoctorCountForCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string
): Promise<number> {
  const { count } = await supabase
    .from('doctors')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('verification_status', 'verified');
  return count ?? 0;
}

// Helpers for internal-linking footers (nearby = same-state other districts, other = other specialties)

export async function getSiblingDistricts(
  supabase: SupabaseClient<Database>,
  stateId: string,
  excludeDistrictId: string
): Promise<SeoLocation[]> {
  const { data } = await supabase
    .from('locations')
    .select('id, slug, name_translations, type, parent_id')
    .eq('type', 'district')
    .eq('parent_id', stateId)
    .neq('id', excludeDistrictId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(10);
  return (data as SeoLocation[] | null) ?? [];
}

export async function getOtherCategories(
  supabase: SupabaseClient<Database>,
  excludeCategoryId: string
): Promise<SeoCategory[]> {
  const { data } = await supabase
    .from('categories')
    .select('id, slug, name_translations')
    .eq('is_active', true)
    .is('deleted_at', null)
    .neq('id', excludeCategoryId)
    .order('display_order', { ascending: true })
    .limit(10);
  return (data as SeoCategory[] | null) ?? [];
}

// Display name resolver honoring the *_translations fallback chain.
export function seoDisplayName(translations: Json, locale: string = 'bn'): string {
  return getLocalizedField(translations as never, locale);
}
