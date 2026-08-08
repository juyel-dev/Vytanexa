import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Symptom List Query — VYTANEXA-BLUEPRINT.md § S09 "Symptoms List
 * Page". Dataset is small and admin-managed (spec: "dataset small
 * enough to be SSG'd entirely, no server round-trip needed") — one
 * query fetches everything, the list page and the client-side search
 * both work off this same array, no pagination.
 *
 * Schema note on grouping: the spec's mockup groups the general grid
 * by "symptoms.category" (জ্বর ও সংক্রমণ / পেট ও হজম / ...), but
 * `symptoms` has no such column (DATABASE-SCHEMA.md § 6) — only a
 * many-to-many `symptom_categories` join to the *specialty*
 * `categories` table (cardiology, medicine, etc. — a different
 * taxonomy than the mockup's symptom-category grouping). Rather than
 * fabricate a symptom-category field, the list page groups by each
 * symptom's first linked specialty instead — real data, not invented
 * data. If a true symptom-category taxonomy becomes a real product
 * need, that's a schema addition (see TODO.md).
 */
export async function queryAllSymptoms(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('symptoms')
    .select(
      `id, slug, title_translations, cover_image_url, is_emergency,
       symptom_categories(display_order, categories(id, slug, name_translations))`
    )
    .eq('is_active', true)
    .order('is_emergency', { ascending: false })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('queryAllSymptoms failed:', error.message);
    return [];
  }
  return data ?? [];
}

export type SymptomListItem = Awaited<ReturnType<typeof queryAllSymptoms>>[number];
