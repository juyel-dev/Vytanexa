import { createHash } from 'crypto';

type SubmitQuestionRpc = {
  rpc: (
    name: 'submit_question',
    args: {
      p_title: string;
      p_body: string | null;
      p_category_id: string;
      p_is_anonymous: boolean;
      p_author_name: string | null;
      p_author_phone: string | null;
    }
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import {
  queryQuestionList,
  getDoctorAnsweredQuestionIds,
  type QAListParams,
} from '@/lib/queries/qa-list';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { questionSchema } from '@/lib/validations/questions';
import { getT } from '@vytanexa/i18n/server';

/**
 * POST /api/questions — moderated public question submission.
 *
 * The database independently checks the Q&A feature flag, active category,
 * content limits, pending status and auth.uid(). This route preserves the
 * localized Zod errors and applies a per-IP limit to the original request.
 */
export async function POST(request: NextRequest) {
  const t = await getT('validation');
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    return NextResponse.json({ error: t('questions.featureDisabled') }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = questionSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `question_submit_ip:${ipHash}`,
    p_max_count: 5,
    p_window: '24 hours',
  });

  if (rateLimitError || allowed == null) {
    console.error('question IP rate limit failed:', rateLimitError?.message);
    return NextResponse.json({ error: t('questions.submitFailed') }, { status: 503 });
  }

  if (!allowed) {
    return NextResponse.json({ error: t('questions.dailyLimitReached') }, { status: 429 });
  }

  const questionClient = supabase as unknown as SubmitQuestionRpc;
  const { data, error } = await questionClient.rpc('submit_question', {
    p_title: parsed.data.title,
    p_body: parsed.data.body?.trim() || null,
    p_category_id: parsed.data.category_id,
    p_is_anonymous: parsed.data.is_anonymous ?? false,
    p_author_name: parsed.data.author_name?.trim() || null,
    p_author_phone: parsed.data.author_phone?.trim() || null,
  });

  if (error) {
    console.error('question submission RPC failed:', error.code, error.message);
    return NextResponse.json({ error: t('questions.submitFailed') }, { status: 503 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('question submission RPC returned an invalid response');
    return NextResponse.json({ error: t('questions.submitFailed') }, { status: 503 });
  }

  const result = data as { success?: unknown; error?: unknown };

  if (result.success === true) {
    return NextResponse.json({ success: true });
  }

  if (result.error === 'rate_limited') {
    return NextResponse.json({ error: t('questions.dailyLimitReached') }, { status: 429 });
  }

  if (result.error === 'feature_disabled') {
    return NextResponse.json({ error: t('questions.featureDisabled') }, { status: 404 });
  }

  if (
    result.error === 'invalid_title' ||
    result.error === 'invalid_body' ||
    result.error === 'invalid_category' ||
    result.error === 'invalid_author_name' ||
    result.error === 'author_name_required' ||
    result.error === 'invalid_author_phone'
  ) {
    return NextResponse.json({ error: t('generic.validationFailed') }, { status: 400 });
  }

  console.error('question submission rejected:', result.error);
  return NextResponse.json({ error: t('questions.submitFailed') }, { status: 503 });
}
