import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { reviewSchema } from '@/lib/validations/reviews';
import { getT } from '@vytanexa/i18n/server';

type SubmitReviewRpc = {
  rpc: (
    name: 'submit_review',
    args: {
      p_entity_type: 'doctor' | 'hospital';
      p_entity_id: string;
      p_reviewer_name: string;
      p_rating: number;
      p_review_text: string;
    }
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * POST /api/reviews — public, moderated review submission.
 *
 * The handler preserves the honeypot and applies a per-IP/entity limit from
 * the original browser request. The database RPC independently validates the
 * entity and content, derives user_id from auth.uid(), sets moderation fields
 * to safe defaults, and applies a transaction-safe actor/entity limit.
 */
export async function POST(request: NextRequest) {
  const t = await getT('validation');
  const body = await request.json().catch(() => null);

  // Keep the honeypot silent: real submissions continue to normal validation.
  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    typeof (body as { honeypot?: unknown }).honeypot === 'string' &&
    (body as { honeypot: string }).honeypot.trim().length > 0
  ) {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = reviewSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') },
      { status: 400 }
    );
  }

  const {
    doctor_id,
    entity_type,
    entity_id,
    reviewer_name,
    rating,
    review_text,
  } = parsed.data;

  // Preserve the legacy doctor_id payload while rejecting contradictory
  // aliases that could otherwise resolve to a different entity silently.
  if (
    (doctor_id && entity_type === 'hospital') ||
    (doctor_id && entity_id && doctor_id !== entity_id)
  ) {
    return NextResponse.json({ error: t('generic.incompleteData') }, { status: 400 });
  }

  const resolvedType = entity_type ?? (doctor_id ? 'doctor' : undefined);
  const resolvedId = entity_id ?? doctor_id;

  if (!resolvedType || !resolvedId || (resolvedType === 'hospital' && !entity_id)) {
    return NextResponse.json({ error: t('generic.incompleteData') }, { status: 400 });
  }

  const supabase = createClient();
  const ip = getClientIp(request);

  // Apply the original browser request's IP limit here, not from the later
  // server-to-server RPC headers. Hash the IP before storing a rate key.
  if (ip !== 'unknown') {
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_key: `review_ip:${createHash('sha256').update(ip).digest('hex')}:${resolvedType}:${resolvedId}`,
      p_max_count: 3,
      p_window: '24 hours',
    });

    if (rateLimitError || allowed == null) {
      console.error('review IP rate limit failed:', rateLimitError?.message);
      return NextResponse.json({ error: t('reviews.submitFailed') }, { status: 503 });
    }

    if (!allowed) {
      const alreadyMsg =
        resolvedType === 'hospital'
          ? t('reviews.alreadyReviewedHospital')
          : t('reviews.alreadyReviewedDoctor');
      return NextResponse.json({ error: alreadyMsg }, { status: 429 });
    }
  }

  // The generated database types predate this source-only migration.
  const reviewClient = supabase as unknown as SubmitReviewRpc;
  const { data, error } = await reviewClient.rpc('submit_review', {
    p_entity_type: resolvedType,
    p_entity_id: resolvedId,
    p_reviewer_name: reviewer_name,
    p_rating: rating,
    p_review_text: review_text,
  });

  if (error) {
    console.error('review submission RPC failed:', error.code, error.message);
    return NextResponse.json({ error: t('reviews.submitFailed') }, { status: 503 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('review submission RPC returned an invalid response');
    return NextResponse.json({ error: t('reviews.submitFailed') }, { status: 503 });
  }

  const result = data as { success?: unknown; error?: unknown };

  if (result.success === true) {
    return NextResponse.json({ success: true });
  }

  if (result.error === 'rate_limited') {
    const alreadyMsg =
      resolvedType === 'hospital'
        ? t('reviews.alreadyReviewedHospital')
        : t('reviews.alreadyReviewedDoctor');
    return NextResponse.json({ error: alreadyMsg }, { status: 429 });
  }

  if (
    result.error === 'invalid_entity' ||
    result.error === 'invalid_name' ||
    result.error === 'invalid_rating' ||
    result.error === 'invalid_review_text'
  ) {
    return NextResponse.json({ error: t('generic.validationFailed') }, { status: 400 });
  }

  if (result.error === 'entity_unavailable') {
    return NextResponse.json({ error: t('generic.incompleteData') }, { status: 404 });
  }

  console.error('review submission rejected:', result.error);
  return NextResponse.json({ error: t('reviews.submitFailed') }, { status: 503 });
}
