import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Polls — VYTANEXA-BLUEPRINT.md § S15 `/community/polls`. RLS
 * (`polls_public_read`) already filters to `is_active = true`, so an
 * admin-deactivated poll simply won't come back from this query — no
 * extra client-side filtering needed. `expires_at` in the past still
 * returns (a poll doesn't need `is_active` flipped off just because
 * its deadline passed — spec: "expired polls show results-only, no
 * voting UI", which the client component decides per-poll from
 * `expires_at`, not from a separate "still open" query filter).
 */
export async function getActivePolls(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('polls')
    .select('id, question, total_votes, expires_at, created_at, poll_options(id, option_text, vote_count, display_order)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('getActivePolls failed:', error.message);
    return [];
  }
  return data ?? [];
}

export type PollWithOptions = Awaited<ReturnType<typeof getActivePolls>>[number];

/** Single poll by ID — VYTANEXA-BLUEPRINT.md § S19 "poll" block embed. */
export async function getPollById(supabase: SupabaseClient<Database>, pollId: string) {
  const { data, error } = await supabase
    .from('polls')
    .select(
      'id, question, total_votes, expires_at, created_at, poll_options(id, option_text, vote_count, display_order)'
    )
    .eq('id', pollId)
    .single();

  if (error || !data) return null;
  return data;
}
