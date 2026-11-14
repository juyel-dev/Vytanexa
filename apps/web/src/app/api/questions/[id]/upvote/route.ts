import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getT } from '@vytanexa/i18n/server';

type ToggleUpvoteRpc = {
  rpc: (
    name: 'toggle_question_upvote',
    args: { p_question_id: string; p_voter_key: string }
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * POST /api/questions/[id]/upvote — device-level toggle.
 *
 * The localStorage UUID is an intentionally lightweight dedup key, not an
 * authenticated identity (see lib/device-id.ts). The database RPC performs
 * the toggle atomically, enforces the feature flag and approved-question
 * checks, rate-limits independently of this HTTP route, and keeps raw device
 * keys hidden from public SELECT access.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const t = await getT('validation');

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 404 });
  }

  const parsed = z
    .object({ voterKey: z.string().uuid(t('generic.incompleteData')) })
    .safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Keep the existing feature check for a localized early response. The
  // database repeats this check so direct RPC callers cannot bypass it.
  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    return NextResponse.json({ error: t('questions.featureDisabled') }, { status: 404 });
  }

  // Database types are generated from the hosted schema; this migration is
  // still a source-only candidate until the hosted DDL gate is cleared.
  const upvoteClient = supabase as unknown as ToggleUpvoteRpc;
  const { data, error } = await upvoteClient.rpc('toggle_question_upvote', {
    p_question_id: params.id,
    p_voter_key: parsed.data.voterKey,
  });

  if (error) {
    console.error('question upvote RPC failed:', error.code, error.message);
    return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 503 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('question upvote RPC returned an invalid response');
    return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 503 });
  }

  const result = data as { error?: unknown; upvoted?: unknown };

  if (result.error === 'rate_limited') {
    return NextResponse.json({ error: t('generic.rateLimited') }, { status: 429 });
  }

  if (result.error === 'feature_disabled') {
    return NextResponse.json({ error: t('questions.featureDisabled') }, { status: 404 });
  }

  if (result.error === 'question_unavailable') {
    return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 404 });
  }

  if (result.error === 'invalid_voter_key' || typeof result.upvoted !== 'boolean') {
    return NextResponse.json({ error: t('generic.validationFailed') }, { status: 400 });
  }

  return NextResponse.json({ upvoted: result.upvoted });
}
