import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/** Question Detail — VYTANEXA-BLUEPRINT.md § S14 "Question Detail". */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getQuestionById(supabase: SupabaseClient<Database>, id: string) {
  // A malformed id is a genuine 404, not a DB error (Postgres would raise
  // 22P02 invalid-uuid, which we now treat as a real failure below).
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase
    .from('questions')
    .select('*, categories(name_translations)')
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  // PGRST116 = zero rows (a genuine 404). Any other error must throw so a
  // transient DB failure isn't served (and crawled) as "question not found".
  if (error && error.code !== 'PGRST116') {
    throw new Error(`getQuestionById failed: ${error.message}`);
  }
  return data ?? null;
}

export type QuestionDetail = NonNullable<Awaited<ReturnType<typeof getQuestionById>>>;

/**
 * Answers for a question — VYTANEXA-BLUEPRINT.md § S14: "doctor
 * answers pinned top with ✅ Verified Doctor badge + doctor's
 * specialty + link to their profile; community answers below,
 * chronological."
 *
 * Fetched in one chronological query, then partitioned into
 * doctor-authored vs. community groups here rather than via `.order()`
 * — Supabase's query builder can't express "non-null group first,
 * chronological within each group" as a single ORDER BY without a raw
 * SQL expression, and partitioning a small, already-fetched array in
 * JS is simpler and just as correct.
 */
export async function getAnswers(supabase: SupabaseClient<Database>, questionId: string) {
  const { data, error } = await supabase
    .from('answers')
    .select(
      `id, body, author_name, created_at, doctor_id,
       doctors(slug, name_translations, photo_url, categories(name_translations))`
    )
    .eq('question_id', questionId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getAnswers failed:', error.message);
    return { doctorAnswers: [], communityAnswers: [] };
  }

  const all = data ?? [];
  return {
    doctorAnswers: all.filter((a) => a.doctor_id !== null),
    communityAnswers: all.filter((a) => a.doctor_id === null),
  };
}

/** Categories for the "Ask a Question" sheet's required category select. */
export async function getQACategories(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_translations')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('getQACategories failed:', error.message);
    return [];
  }
  return data ?? [];
}
