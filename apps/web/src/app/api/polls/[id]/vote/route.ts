import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { pollVoteSchema } from '@/lib/validations/polls';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

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
  const t = await getT('validation');
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'polls'))) {
    return NextResponse.json({ error: t('polls.featureDisabled') }, { status: 404 });
  }

  // A non-UUID id used to reach Postgres and come back as a 500.
  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: t('polls.voteFailed') }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t('generic.requestBodyRequired') }, { status: 400 });
  }
  const parsed = pollVoteSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') }, { status: 400 });
  }
  const { optionId, voterKey } = parsed.data;

  // `polls` RLS only returns active polls, so null here = missing OR
  // admin-deactivated. Previously the insert went ahead anyway (and failed
  // as a 500 / was accepted for a poll the admin had turned off).
  const { data: poll } = await supabase
    .from('polls')
    .select('expires_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!poll) {
    return NextResponse.json({ error: t('polls.voteFailed') }, { status: 404 });
  }
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return NextResponse.json({ error: t('polls.expired') }, { status: 400 });
  }

  // The option must belong to THIS poll — `optionId` was never checked, so
  // a vote could be recorded against another poll's option.
  const { data: option } = await supabase
    .from('poll_options')
    .select('id')
    .eq('id', optionId)
    .eq('poll_id', params.id)
    .maybeSingle();
  if (!option) {
    return NextResponse.json({ error: t('polls.invalidOption') }, { status: 400 });
  }

  // Rate-limit AFTER the cheap validity checks so invalid requests don't
  // burn a person's hourly allowance.
  const ip = getClientIp(request);
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `poll_vote:${ip}:${params.id}:${voterKey}`,
    p_max_count: 10,
    p_window: '1 hour',
  });
  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json({ error: t('generic.rateLimited') }, { status: 429 });
  }

  const { error } = await supabase
    .from('poll_votes')
    .insert({ poll_id: params.id, option_id: optionId, voter_key: voterKey });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: t('polls.alreadyVoted') }, { status: 409 });
    }
    console.error('poll vote insert failed:', error.message);
    return NextResponse.json({ error: t('polls.voteFailed') }, { status: 500 });
  }

  const { data: updatedOptions } = await supabase
    .from('poll_options')
    .select('id, vote_count')
    .eq('poll_id', params.id);

  const totalVotes = (updatedOptions ?? []).reduce((sum, o) => sum + o.vote_count, 0);

  return NextResponse.json({ success: true, options: updatedOptions ?? [], totalVotes });
}
