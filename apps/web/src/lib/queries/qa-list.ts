import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

export type QAListParams = {
  filter?: 'all' | 'answered' | 'unanswered';
  sort?: 'newest' | 'upvoted';
  page?: number;
};

const PAGE_SIZE = 15;

/**
 * Shared query builder for the Q&A List — VYTANEXA-BLUEPRINT.md § S14.
 * "Sort: newest / most-upvoted / unanswered-first (surfaces questions
 * needing doctor attention)." `filter=unanswered` maps to
 * `answer_count = 0` (the trigger-maintained denormalized counter,
 * DATABASE-SCHEMA.md § 4.3) rather than a join+count, matching the
 * "read constantly, write rarely" rationale that counter exists for.
 */
export async function queryQuestionList(
  supabase: SupabaseClient<Database>,
  params: QAListParams
) {
  const page = params.page ?? 0;

  let query = supabase
    .from('questions')
    .select(
      'id, title, is_anonymous, author_name, upvote_count, answer_count, category_id, created_at, categories(name_translations)',
      { count: 'exact' }
    )
    .eq('status', 'approved');

  if (params.filter === 'answered') query = query.gt('answer_count', 0);
  if (params.filter === 'unanswered') query = query.eq('answer_count', 0);

  if (params.sort === 'upvoted') {
    query = query.order('upvote_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  return { data: data ?? [], error, count: count ?? 0, pageSize: PAGE_SIZE };
}

/**
 * "✅ answered by verified doctor" indicator — VYTANEXA-BLUEPRINT.md §
 * S14 card mockup. A lightweight second query (per-page, not
 * per-question N+1) checking which of the current page's questions
 * have at least one approved doctor-authored answer.
 */
export async function getDoctorAnsweredQuestionIds(
  supabase: SupabaseClient<Database>,
  questionIds: string[]
) {
  if (questionIds.length === 0) return new Set<string>();
  const { data, error } = await supabase
    .from('answers')
    .select('question_id')
    .in('question_id', questionIds)
    .eq('status', 'approved')
    .not('doctor_id', 'is', null);

  if (error) {
    console.error('getDoctorAnsweredQuestionIds failed:', error.message);
    return new Set<string>();
  }
  return new Set((data ?? []).map((a) => a.question_id));
}
