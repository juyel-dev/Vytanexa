import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Symptom Detail Query — VYTANEXA-BLUEPRINT.md § S09 "Symptom Detail
 * Page". Same one-function-for-metadata-and-body pattern as S07/S08.
 *
 * Schema note: the spec's mockup content sections (description,
 * common_causes[], when_to_see_doctor[]) map to only ONE real column —
 * `description_translations` (DATABASE-SCHEMA.md § 6, migration
 * 0008_symptoms.sql). There's no `common_causes`/`when_to_see_doctor`
 * array column on `symptoms`. Per the spec's own instruction that each
 * section is "auto-hidden if empty", those two sections are simply
 * never rendered today — the honest behavior for data that doesn't
 * exist, not a fabricated placeholder. Adding them is a schema
 * migration + admin panel field, tracked in TODO.md, not a UI fix.
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
