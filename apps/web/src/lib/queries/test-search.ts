import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@vytanexa/database';

/**
 * Lab Test Search — VYTANEXA-BLUEPRINT.md § S10 "SEARCH BEHAVIOR":
 * "Input matches against hospitals.services[] / a dedicated
 * diagnostic_tests join table (test name normalized + aliases)."
 *
 * Two-step resolution, same shape as S08's `getHospitalServices` but
 * inverted (there: hospital → services → test_catalog; here: query →
 * test_catalog → hospitals):
 *   1. Match the query against `test_catalog.name_translations` (bn/en)
 *      OR `canonical_key` OR the `aliases[]` GIN index (e.g. "CBC" =
 *      "Complete Blood Count" = "সিবিসি" all resolve to the same
 *      `canonical_key`, per the spec's own example).
 *   2. For each matched `canonical_key`, find verified hospitals whose
 *      `services[]` contains it, using Postgres's `@>` array-contains
 *      operator via `.contains()`.
 * Returns hospitals de-duplicated across multiple matched tests, each
 * tagged with which of the searched-for tests it actually offers (for
 * the result card's "✅ এই টেস্ট পাওয়া যায়: CBC" confirmation line).
 *
 * `locationId` (optional) scopes results to a district via
 * `location_id` equality — added after S12 uncovered that the
 * Location Chip + Zustand store this depends on already existed in
 * the app (see TODO.md's S12 correction note). Omitting it searches
 * nationally, same as before.
 */
export type TestSearchResult = {
  hospital: {
    id: string;
    slug: string;
    name_translations: Json;
    cover_image_url: string | null;
    type: string;
    address_line: string;
    phone: string;
    operating_hours: Json;
    has_emergency_dept: boolean;
    facility_tags: string[];
    rating_avg: number;
    rating_count: number;
  };
  matchedTestNames: Json[];
};

export async function searchTests(
  supabase: SupabaseClient<Database>,
  query: string,
  locationId?: string
) {
  const pattern = `%${query}%`;

  const { data: matchedTests, error: testError } = await supabase
    .from('test_catalog')
    .select('canonical_key, name_translations, aliases')
    .eq('is_active', true)
    .or(
      `name_translations->>bn.ilike.${pattern},name_translations->>en.ilike.${pattern},canonical_key.ilike.${pattern},aliases.cs.{${query}}`
    )
    .limit(10);

  if (testError) {
    console.error('searchTests: test_catalog lookup failed:', testError.message);
    return { results: [], matchedTests: [] };
  }
  if (!matchedTests || matchedTests.length === 0) {
    return { results: [], matchedTests: [] };
  }

  const canonicalKeys = matchedTests.map((t) => t.canonical_key);

  let hospitalQuery = supabase
    .from('hospitals')
    .select(
      `id, slug, name_translations, cover_image_url, type, address_line, phone,
       operating_hours, services, has_emergency_dept, facility_tags,
       rating_avg, rating_count, is_featured`
    )
    .eq('verification_status', 'verified')
    .overlaps('services', canonicalKeys);
  if (locationId) hospitalQuery = hospitalQuery.eq('location_id', locationId);

  const { data: hospitals, error: hospitalError } = await hospitalQuery
    .order('is_featured', { ascending: false })
    .order('rating_avg', { ascending: false })
    .limit(20);

  if (hospitalError) {
    console.error('searchTests: hospitals lookup failed:', hospitalError.message);
    return { results: [], matchedTests };
  }

  const nameByKey = new Map(matchedTests.map((t) => [t.canonical_key, t.name_translations]));

  const results: TestSearchResult[] = (hospitals ?? []).map((h) => {
    const matchedKeys = h.services.filter((s) => canonicalKeys.includes(s));
    return {
      hospital: h,
      matchedTestNames: matchedKeys
        .map((k) => nameByKey.get(k))
        .filter((n): n is Json => n !== undefined),
    };
  });

  return { results, matchedTests };
}

/**
 * Popular-test chip grid — VYTANEXA-BLUEPRINT.md § S10: "Empty state
 * before typing: popular-test chip grid (admin-curated, is_popular=true
 * on tests master list) — tapping a chip = instant search, no typing
 * required (critical for low-literacy UX)."
 */
export async function getPopularTests(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('test_catalog')
    .select('canonical_key, name_translations')
    .eq('is_active', true)
    .eq('is_popular', true)
    .order('display_order');

  if (error) {
    console.error('getPopularTests failed:', error.message);
    return [];
  }
  return data ?? [];
}
