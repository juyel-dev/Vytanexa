import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { z } from 'zod';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getT } from '@vytanexa/i18n/server';

/**
 * POST /api/questions/[id]/upvote — VYTANEXA-BLUEPRINT.md § S14
 * "upvote count (⬆, tap to vote — one vote per device via localStorage
 * id)". `voter_key` is the client's persisted device ID
 * (`lib/device-id.ts`); `question_upvotes`'s `UNIQUE(question_id,
 * voter_key)` constraint (DATABASE-SCHEMA.md § 4.3) is the actual
 * dedup enforcement — this route just surfaces a clean toggle API over
 * it rather than leaking a raw unique-constraint-violation error to
 * the client. Un-voting (tap again) deletes the row; the
 * `recalc_question_counts()` trigger keeps `questions.upvote_count`
 * in sync either way, so this route never writes that counter itself.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const t = await getT('validation');
  // Malformed JSON used to throw -> unhandled 500; a non-UUID id used to
  // reach Postgres and fail as a 500 instead of a clean 404.
  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 404 });
  }
  const parsed = z
    .object({ voterKey: z.string().trim().min(1, t('generic.incompleteData')).max(100) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') }, { status: 400 });
  }
  const { voterKey } = parsed.data;

  const supabase = createClient();

  // Whole module is gated by `community_qa` (spec § S14).
  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    return NextResponse.json({ error: t('questions.featureDisabled') }, { status: 404 });
  }
  const ip = getClientIp(request);
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `question_upvote:${ip}:${params.id}`,
    p_max_count: 20,
    p_window: '1 hour',
  });
  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json({ error: t('generic.rateLimited') }, { status: 429 });
  }

  const { data: existing } = await supabase
    .from('question_upvotes')
    .select('id')
    .eq('question_id', params.id)
    .eq('voter_key', voterKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('question_upvotes').delete().eq('id', existing.id);
    if (error) {
      console.error('upvote delete failed:', error.message);
      return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 500 });
    }
    return NextResponse.json({ upvoted: false });
  }

  const { error } = await supabase
    .from('question_upvotes')
    .insert({ question_id: params.id, voter_key: voterKey });
  // 23505 = the same device voted in a concurrent request (double tap):
  // the vote exists, so report it as upvoted instead of a false error.
  if (error && error.code === '23505') return NextResponse.json({ upvoted: true });
  if (error) {
    console.error('upvote insert failed:', error.message);
    return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 500 });
  }
  return NextResponse.json({ upvoted: true });
}
