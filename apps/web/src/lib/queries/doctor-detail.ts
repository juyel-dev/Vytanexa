import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Doctor Detail Query — VYTANEXA-BLUEPRINT.md § S07. One function so
 * both the page's `generateMetadata` (needs name/photo for OG tags)
 * and the page body itself share the exact same fetch — no risk of
 * the two drifting (e.g. metadata showing a doctor that the body then
 * 404s on).
 */
export async function getDoctorBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data: doctor, error } = await supabase
    .from('doctors')
    .select(
      `*, categories(id, slug, name_translations),
       chambers(id, chamber_name, address_line, latitude, longitude, map_link,
                 phone, whatsapp_number, schedule, consultation_fee, is_primary,
                 display_order, location_id),
       doctor_hospital_links(id, role, hospitals(id, slug, name_translations,
                 cover_image_url, location_id))`
    )
    .eq('slug', slug)
    .eq('verification_status', 'verified')
    .single();

  if (error || !doctor) return null;
  return doctor;
}

export type DoctorDetail = NonNullable<Awaited<ReturnType<typeof getDoctorBySlug>>>;
