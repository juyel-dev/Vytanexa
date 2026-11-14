import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@vytanexa/database';

/**
 * Favorites — VYTANEXA-BLUEPRINT.md § S17 "Favorites (`/account/
 * favorites`)": doctor/hospital tabs with counts. `user_favorites` is
 * polymorphic (entity_type + entity_id, no direct FK to `doctors`/
 * `hospitals`), so this is two lookups: get the favorited IDs, then
 * fetch the actual cards' data for those IDs — same shape both
 * `DoctorCard`/`HospitalCard` already expect, so favorited items
 * render with the exact same card component used everywhere else.
 */
export async function getFavorites(supabase: SupabaseClient<Database>, userId: string) {
  const { data: favRows, error } = await supabase
    .from('user_favorites')
    .select('entity_type, entity_id')
    .eq('user_id', userId)
    .in('entity_type', ['doctor', 'hospital']);

  // Throw (don't return empty): "no favorites" / "0 favorites" on a DB
  // blip reads as data loss. The (main) error boundary offers a retry.
  if (error || !favRows) throw new Error(`getFavorites failed: ${error?.message}`);

  const doctorIds = favRows.filter((f) => f.entity_type === 'doctor').map((f) => f.entity_id);
  const hospitalIds = favRows
    .filter((f) => f.entity_type === 'hospital')
    .map((f) => f.entity_id);

  const [{ data: doctors, error: doctorsError }, { data: hospitals, error: hospitalsError }] =
    await Promise.all([
    doctorIds.length > 0
      ? supabase
          .from('doctors')
          .select(
            'id, slug, name_translations, photo_url, experience_years, rating_avg, rating_count, consultation_fee_min, consultation_fee_max, is_featured, whatsapp_number, categories(name_translations)'
          )
          .in('id', doctorIds)
      : Promise.resolve({ data: [], error: null }),
    hospitalIds.length > 0
      ? supabase
          .from('hospitals')
          .select(
            'id, slug, name_translations, cover_image_url, type, has_emergency_dept, facility_tags, phone, rating_avg, rating_count'
          )
          .in('id', hospitalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (doctorsError || hospitalsError) {
    throw new Error(`getFavorites cards failed: ${(doctorsError ?? hospitalsError)?.message}`);
  }

  return { doctors: doctors ?? [], hospitals: hospitals ?? [] };
}

/**
 * Appointment History — VYTANEXA-BLUEPRINT.md § S17 "read-only log of
 * the user's own `leads` submissions." `leads_own_read` RLS
 * (`auth.uid() = user_id`) is the actual access boundary here — this
 * query would return nothing for anyone else's leads regardless of
 * the `.eq('user_id', ...)` filter below, but filtering explicitly
 * keeps the query's intent readable.
 */
export async function getLeadsHistory(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select(
      `id, patient_name, message, status, created_at, contacted_at,
       doctors(slug, name_translations, categories(name_translations))`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Throw: an error must not render as an empty list / "0" count.
  if (error) throw new Error(`getLeadsHistory failed: ${error.message}`);
  return data ?? [];
}

/**
 * My Questions — VYTANEXA-BLUEPRINT.md § S17 "আমার প্রশ্ন ও উত্তর".
 * Uses `questions_own_read` (migration 0014) to include the user's
 * own pending/rejected questions too, not just approved ones — the
 * one meaningful difference from the public `/community/qa` list.
 */
export async function getMyQuestions(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('id, title, status, answer_count, upvote_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Throw: an error must not render as an empty list / "0" count.
  if (error) throw new Error(`getMyQuestions failed: ${error.message}`);
  return data ?? [];
}

/**
 * My Reviews — VYTANEXA-BLUEPRINT.md § S17 "⭐ আমার রিভিউ". Uses the
 * get_my_reviews() RPC, which filters by auth.uid() inside the database
 * and returns only safe display/history fields. Entity names are
 * resolved separately because entity_type/entity_id is polymorphic.
 */
type MyReviewRow = {
  id: string;
  entity_type: 'doctor' | 'hospital';
  entity_id: string;
  rating: number;
  review_text: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_reply: string | null;
  created_at: string;
};

type MyReviewsRpcClient = {
  rpc: (name: 'get_my_reviews') => Promise<{
    data: MyReviewRow[] | null;
    error: { message: string } | null;
  }>;
};

export async function getMyReviews(supabase: SupabaseClient<Database>) {
  // The RPC filters by auth.uid() inside PostgreSQL and intentionally does
  // not grant SELECT on the private user_id column to Data API roles.
  const myReviewsClient = supabase as unknown as MyReviewsRpcClient;
  const { data, error } = await myReviewsClient.rpc('get_my_reviews');

  // Throw: an error must not render as an empty list / "0" count.
  if (error) throw new Error(`getMyReviews failed: ${error.message}`);
  return data ?? [];
}

/** Resolves entity names for a set of reviews (see getMyReviews's note on why this is separate). */
export async function resolveReviewEntityNames(
  supabase: SupabaseClient<Database>,
  reviews: { entity_type: string; entity_id: string }[]
) {
  const doctorIds = reviews.filter((r) => r.entity_type === 'doctor').map((r) => r.entity_id);
  const hospitalIds = reviews
    .filter((r) => r.entity_type === 'hospital')
    .map((r) => r.entity_id);

  const [{ data: doctors }, { data: hospitals }] = await Promise.all([
    doctorIds.length > 0
      ? supabase.from('doctors').select('id, slug, name_translations').in('id', doctorIds)
      : Promise.resolve({ data: [] }),
    hospitalIds.length > 0
      ? supabase.from('hospitals').select('id, slug, name_translations').in('id', hospitalIds)
      : Promise.resolve({ data: [] }),
  ]);

  const map = new Map<string, { slug: string; name_translations: Json }>();
  for (const d of doctors ?? []) map.set(d.id, d);
  for (const h of hospitals ?? []) map.set(h.id, h);
  return map;
}
