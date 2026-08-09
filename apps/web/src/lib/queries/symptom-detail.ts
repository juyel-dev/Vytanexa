import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Symptom Detail Query — VYTANEXA-BLUEPRINT.md § S09 "Symptom Detail
 * Page". Same one-function-for-metadata-and-body pattern as S07/S08.
 *
 * `common_causes_translations` / `when_to_see_doctor_translations`
 * (migration 0011 — see TODO.md for the earlier session where this
 * was deferred because the Supabase MCP connector was unreachable)
 * are JSONB arrays of per-locale translation objects, read via
 * `getLocalizedArray` (`lib/i18n.ts`). Both still correctly render
 * nothing if the admin hasn't filled them in for a given symptom yet
 * (spec's "auto-hidden if empty" rule) — the column existing doesn't
 * mean every row has data.
 */
export async function getSymptomBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data: symptom, error } = await supabase
    .from('symptoms')
    .select(
      `*, symptom_categories(display_order, categories(id, slug, name_translations))`
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !symptom) return null;
  return symptom;
}

export type SymptomDetail = NonNullable<Awaited<ReturnType<typeof getSymptomBySlug>>>;

/**
 * Doctor count per related specialty — VYTANEXA-BLUEPRINT.md § S09
 * "each rendered as its own chip with independent doctor count".
 *
 * Not location-filtered: the spec's mockup implies "live doctor count
 * for current location", but district filtering doesn't exist
 * anywhere yet in the doctor queries (`lib/queries/doctor-list.ts`
 * documents this same deferral — no chamber↔location join is wired
 * up). Counting all verified doctors per specialty nationally is the
 * consistent, honest behavior until that lands; the CTA link itself
 * also omits `district=` for the same reason (matches the existing
 * `/doctors?specialty=...` links used elsewhere, e.g.
 * `components/home/CategoryGrid.tsx`).
 */
export async function getSpecialtyDoctorCounts(
  supabase: SupabaseClient<Database>,
  categoryIds: string[]
) {
  const counts = new Map<string, number>();
  await Promise.all(
    categoryIds.map(async (id) => {
      const { count, error } = await supabase
        .from('doctors')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id)
        .eq('verification_status', 'verified');
      if (error) {
        console.error('getSpecialtyDoctorCounts failed for', id, error.message);
        counts.set(id, 0);
      } else {
        counts.set(id, count ?? 0);
      }
    })
  );
  return counts;
}
