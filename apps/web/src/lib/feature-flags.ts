import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

export type FeatureFlags = {
  community_qa?: boolean;
  polls?: boolean;
  voice_search?: boolean;
  blood_services?: boolean;
};

/**
 * Reads `app_settings.features` — VYTANEXA-BLUEPRINT.md § S14
 * "Feature Flag Gate": "Entire module gated behind
 * `app_settings.features.community_qa` (admin toggle) — if disabled,
 * all routes 404 gracefully and nav entries hide." Centralized here
 * rather than each caller writing its own `app_settings` query
 * (`components/home/CommunityQATeaser.tsx` had one inline before this
 * existed — still correct, just duplicated logic worth sharing now
 * that a second and third consumer exist).
 */
export async function getFeatureFlags(
  supabase: SupabaseClient<Database>
): Promise<FeatureFlags> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('features')
    .eq('id', 1)
    .single();

  if (error || !data) {
    console.error('getFeatureFlags failed:', error?.message);
    return {};
  }
  return (data.features as FeatureFlags) ?? {};
}

export async function isFeatureEnabled(
  supabase: SupabaseClient<Database>,
  flag: keyof FeatureFlags
): Promise<boolean> {
  const flags = await getFeatureFlags(supabase);
  return flags[flag] === true;
}
