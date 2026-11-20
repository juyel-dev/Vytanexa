import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { pollVoteSchema } from '@/lib/validations/polls';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type SubmitPollVoteRpc = {
  rpc: (
    name: 'submit_poll_vote',
    args: {
      p_poll_id: string;
      p_option_id: string;
      p_voter_key: string | null;
    }
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * POST /api/polls/[id]/vote — one vote per account or guest device.
 *
 * Route-level IP throttling uses the original browser request. The database
 * independently checks the polls feature flag, active/expiry state, option
 * ownership and one-vote uniqueness. Authenticated identity is always
 * derived from auth.uid(); a client-provided voterKey is only used for
 * anonymous device-level deduplication.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const t = await getT('validation');
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'polls'))) {
    return NextResponse.json({ error: t('polls.featureDisabled') }, { status: 404 });
  }

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: t('polls.voteFailed') }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pollVoteSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `poll_vote_ip:${ipHash}:${params.id}`,
    p_max_count: 10,
    p_window: '1 hour',
  });

  if (rateLimitError || allowed == null) {
    console.error('poll vote IP rate limit failed:', rateLimitError?.message);
    return NextResponse.json({ error: t('polls.voteFailed') }, { status: 503 });
  }

  if (!allowed) {
    return NextResponse.json({ error: t('generic.rateLimited') }, { status: 429 });
  }

  // This source migration is local/branch-only until the hosted DDL gate
  // is cleared; use a narrow type adapter until generated DB types refresh.
  const pollVoteClient = supabase as unknown as SubmitPollVoteRpc;
  const { data, error } = await pollVoteClient.rpc('submit_poll_vote', {
    p_poll_id: params.id,
    p_option_id: parsed.data.optionId,
    p_voter_key: parsed.data.voterKey ?? null,
  });

  if (error) {
    console.error('poll vote RPC failed:', error.code, error.message);
    return NextResponse.json({ error: t('polls.voteFailed') }, { status: 503 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('poll vote RPC returned an invalid response');
    return NextResponse.json({ error: t('polls.voteFailed') }, { status: 503 });
  }

  const result = data as {
    success?: unknown;
    error?: unknown;
    options?: unknown;
    totalVotes?: unknown;
  };

  if (result.success === true && Array.isArray(result.options) && typeof result.totalVotes === 'number') {
    return NextResponse.json({
      success: true,
      options: result.options,
      totalVotes: result.totalVotes,
    });
  }

  if (result.error === 'already_voted') {
    return NextResponse.json({ error: t('polls.alreadyVoted') }, { status: 409 });
  }

  if (result.error === 'feature_disabled' || result.error === 'poll_unavailable') {
    return NextResponse.json(
      { error: result.error === 'feature_disabled' ? t('polls.featureDisabled') : t('polls.voteFailed') },
      { status: 404 }
    );
  }

  if (result.error === 'poll_expired') {
    return NextResponse.json({ error: t('polls.expired') }, { status: 400 });
  }

  if (result.error === 'invalid_option' || result.error === 'invalid_voter_key' || result.error === 'invalid_vote') {
    return NextResponse.json({ error: t('polls.invalidOption') }, { status: 400 });
  }

  if (result.error === 'rate_limited') {
    return NextResponse.json({ error: t('generic.rateLimited') }, { status: 429 });
  }

  console.error('poll vote rejected:', result.error);
  return NextResponse.json({ error: t('polls.voteFailed') }, { status: 503 });
}
