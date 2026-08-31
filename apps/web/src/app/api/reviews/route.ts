import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { reviewSchema } from '@/lib/validations/reviews';

/**
 * POST /api/reviews — VYTANEXA-BLUEPRINT.md § S07 "Review Submission
 * Modal" (S08 § "Tab 4 — রিভিউ" reuses this same route scoped to
 * `hospital_id` instead of `doctor_id`, per the blueprint's own
 * framing: "Identical mechanics to S07 Tab 3 ... scoped to hospital_id
 * instead of doctor_id"). Generic across `entity_type` rather than
 * doctor-only, so a third entity type (e.g. symptoms, if that ever
 * gets reviews) needs no new route.
 *
 * Rate-limited 3 per IP per entity per 24h via the generic
 * `check_rate_limit()` DB function (DATABASE-SCHEMA.md § 5.7) rather
 * than a bespoke rate-limit implementation — this is the reuse payoff
 * that function was designed for.
 *
 * Backward compatible: `doctor_id` (without `entity_type`) still works
 * exactly as before — only additive.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Honeypot checked before Zod so bots get a silent 204 without a
  // validation-error hint that would help them adapt.
  if (body.honeypot) {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { doctor_id, entity_type, entity_id, reviewer_name, rating, review_text } = parsed.data;

  const resolvedType: string = entity_type ?? (doctor_id ? 'doctor' : '');
  const resolvedId: string | undefined = entity_id ?? doctor_id;

  // Resolved after Zod so we can give a precise 400 for the
  // entity-resolution edge case (neither new nor legacy fields supplied).
  if (!resolvedType || !['doctor', 'hospital'].includes(resolvedType) || !resolvedId) {
    return NextResponse.json({ error: 'তথ্য অসম্পূর্ণ' }, { status: 400 });
  }

  const supabase = createClient();
  const ip = getClientIp(request);

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `review:${ip}:${resolvedType}:${resolvedId}`,
    p_max_count: 3,
    p_window: '24 hours',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    const alreadyMsg =
      resolvedType === 'hospital'
        ? 'আপনি ইতিমধ্যে এই হাসপাতালকে রিভিউ দিয়েছেন। ২৪ ঘণ্টা পর আবার চেষ্টা করুন।'
        : 'আপনি ইতিমধ্যে এই ডাক্তারকে রিভিউ দিয়েছেন। ২৪ ঘণ্টা পর আবার চেষ্টা করুন।';
    return NextResponse.json({ error: alreadyMsg }, { status: 429 });
  }

  // S17 "আমার রিভিউ": associate with the signed-in submitter when
  // present, so the reviews_own_read RLS policy (migration 0014) can
  // surface it back to them later — doesn't gate submission on being
  // signed in, still fully guest-submittable.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('reviews').insert({
    entity_type: resolvedType as 'doctor' | 'hospital',
    entity_id: resolvedId,
    reviewer_name,
    rating,
    review_text,
    status: 'pending',
    user_id: user?.id ?? null,
  });

  if (error) {
    console.error('review insert failed:', error.message);
    return NextResponse.json({ error: 'সাবমিট করতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
