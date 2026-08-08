import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Hospital Detail Query — VYTANEXA-BLUEPRINT.md § S08. Same rationale
 * as `doctor-detail.ts` (S07): one function shared by `generateMetadata`
 * and the page body so both can never drift apart.
 *
 * `doctor_hospital_links(...doctors(...))` is the reverse direction of
 * S07's `doctor_hospital_links(...hospitals(...))` embed — RLS on
 * `doctors` (`doctors_public_read`: verified + not deleted) already
 * excludes unverified doctors from this join, so no extra filter is
 * needed here (defense in depth lives at the DB layer per
 * DATABASE-SCHEMA.md § 4 comment on that policy).
 */
export async function getHospitalBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data: hospital, error } = await supabase
    .from('hospitals')
    .select(
      `*, doctor_hospital_links(id, role, display_order,
         doctors(id, slug, name_translations, photo_url, experience_years,
                  rating_avg, rating_count, consultation_fee_min,
                  consultation_fee_max, is_featured, whatsapp_number,
                  categories(name_translations)))`
    )
    .eq('slug', slug)
    .eq('verification_status', 'verified')
    .single();

  if (error || !hospital) return null;
  return hospital;
}

export type HospitalDetail = NonNullable<Awaited<ReturnType<typeof getHospitalBySlug>>>;

/**
 * Resolves `hospitals.services[]` (a flat array of `test_catalog.
 * canonical_key` values + general service keys — DATABASE-SCHEMA.md
 * § 3.2 comment on that column) against `test_catalog` for display
 * names + category grouping in Tab 3. Keys with no `test_catalog`
 * match (general facility keys like 'icu', 'emergency_24h') are
 * returned separately rather than dropped — the honest handling of
 * the schema gap the spec's "services[] and tests[]" wording implies
 * but the actual schema doesn't have as two separate columns.
 */
export async function getHospitalServices(
  supabase: SupabaseClient<Database>,
  serviceKeys: string[]
) {
  if (serviceKeys.length === 0) return { matched: [], unmatchedKeys: [] };

  const { data, error } = await supabase
    .from('test_catalog')
    .select('canonical_key, name_translations, category')
    .in('canonical_key', serviceKeys)
    .eq('is_active', true);

  const matched = data ?? [];
  if (error) console.error('test_catalog lookup failed:', error.message);

  const matchedKeys = new Set(matched.map((m) => m.canonical_key));
  const unmatchedKeys = serviceKeys.filter((k) => !matchedKeys.has(k));

  return { matched, unmatchedKeys };
}
