import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { answerSchema } from '@/lib/validations/answers';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getT } from '@vytanexa/i18n/server';

type SubmitAnswerRpc = {
  rpc: (
    name: 'submit_answer',
    args: {
      p_question_id: string;
      p_body: string;
      p_author_name: string | null;
    }
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * POST /api/answers — moderated community answer submission.
 *
 * Doctor-authored answers cannot be created through this public route.
 * The database verifies the target question is approved, repeats the Q&A
 * feature gate and validation, derives user_id from auth.uid(), and fixes
 * doctor_id=NULL/status=pending.
 */
export async function POST(request: NextRequest) {
  const t = await getT('validation');
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    return NextResponse.json({ error: t('questions.featureDisabled') }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = answerSchema(t).safeParse({
    question_id: body?.question_id,
    body: body?.body,
    author_name: body?.author_name,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `answer_submit_ip:${ipHash}`,
    p_max_count: 10,
    p_window: '24 hours',
  });

  if (rateLimitError || allowed == null) {
    console.error('answer IP rate limit failed:', rateLimitError?.message);
    return NextResponse.json({ error: t('answers.submitFailed') }, { status: 503 });
  }

  if (!allowed) {
    return NextResponse.json({ error: t('answers.dailyLimitReached') }, { status: 429 });
  }

  const answerClient = supabase as unknown as SubmitAnswerRpc;
  const { data, error } = await answerClient.rpc('submit_answer', {
    p_question_id: parsed.data.question_id,
    p_body: parsed.data.body,
    p_author_name: parsed.data.author_name?.trim() || null,
  });

  if (error) {
    console.error('answer submission RPC failed:', error.code, error.message);
    return NextResponse.json({ error: t('answers.submitFailed') }, { status: 503 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('answer submission RPC returned an invalid response');
    return NextResponse.json({ error: t('answers.submitFailed') }, { status: 503 });
  }

  const result = data as { success?: unknown; error?: unknown };

  if (result.success === true) {
    return NextResponse.json({ success: true });
  }

  if (result.error === 'rate_limited') {
    return NextResponse.json({ error: t('answers.dailyLimitReached') }, { status: 429 });
  }

  if (result.error === 'feature_disabled') {
    return NextResponse.json({ error: t('questions.featureDisabled') }, { status: 404 });
  }

  if (result.error === 'question_unavailable') {
    return NextResponse.json({ error: t('answers.invalidQuestionId') }, { status: 404 });
  }

  if (result.error === 'invalid_body' || result.error === 'invalid_author_name') {
    return NextResponse.json({ error: t('generic.validationFailed') }, { status: 400 });
  }

  console.error('answer submission rejected:', result.error);
  return NextResponse.json({ error: t('answers.submitFailed') }, { status: 503 });
}
