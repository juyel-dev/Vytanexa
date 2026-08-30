import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pollVoteSchema } from '@/lib/validations/polls';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * POST /api/polls/[id]/vote — VYTANEXA-BLUEPRINT.md § S15. "One vote
 * per device (localStorage poll_id list) or per-account if signed
 * in." `poll_votes.UNIQUE(poll_id, voter_key)` (DATABASE-SCHEMA.md §
 * 4.4) is the actual dedup enforcement — a duplicate vote attempt
 * hits that constraint and this route translates the resulting
 * Postgres error (code 23505) into a clean "already voted" response
 * rather than a generic 500.
 *
 * Unlike question upvotes (S14), this is intentionally NOT a toggle —
 * spec's mockup shows radio-button single-select with no "unvote"
 * affordance, and `recalc_poll_counts()`'s trigger-maintained counters
 * are designed around one-shot votes.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'polls'))) {
    return NextResponse.json({ error: 'এই ফিচার এখন বন্ধ আছে' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = pollVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { optionId, voterKey } = parsed.data;

  // Rate-limit polls vote per voterKey + poll (anti-flood, in addition to
  // the DB UNIQUE(poll_id,voter_key) that translates to 409 on duplicate).
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `poll_vote:${ip}:${params.id}:${voterKey}`,
    p_max_count: 10,
    p_window: '1 hour',
  });
  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json({ error: 'অনেকবার চেষ্টা করা হয়েছে, পরে আবার চেষ্টা করুন' }, { status: 429 });
  }

  const { data: poll } = await supabase
    .from('polls')
    .select('expires_at')
    .eq('id', params.id)
    .single();

  if (poll?.expires_at && new Date(poll.expires_at) < new Date()) {
    return NextResponse.json({ error: 'এই জরিপের মেয়াদ শেষ হয়ে গেছে' }, { status: 400 });
  }

  const { error } = await supabase
    .from('poll_votes')
    .insert({ poll_id: params.id, option_id: optionId, voter_key: voterKey });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'আপনি ইতিমধ্যে ভোট দিয়েছেন' }, { status: 409 });
    }
    console.error('poll vote insert failed:', error.message);
    return NextResponse.json({ error: 'ভোট দিতে সমস্যা হয়েছে' }, { status: 500 });
  }

  const { data: updatedOptions } = await supabase
    .from('poll_options')
    .select('id, vote_count')
    .eq('poll_id', params.id);

  const totalVotes = (updatedOptions ?? []).reduce((sum, o) => sum + o.vote_count, 0);

  return NextResponse.json({ success: true, options: updatedOptions ?? [], totalVotes });
}
