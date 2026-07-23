import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/reviews — VYTANEXA-BLUEPRINT.md § S07 "Review Submission
 * Modal". Rate-limited 3 per IP per doctor per 24h via the generic
 * `check_rate_limit()` DB function (DATABASE-SCHEMA.md § 5.7) rather
 * than a bespoke rate-limit implementation — this is the reuse payoff
 * that function was designed for.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { doctor_id, reviewer_name, rating, review_text, honeypot } = body;

  // Honeypot: a hidden form field real users never fill; a bot that
  // fills every field will trip this. Silent reject, no error hint
  // that would help a bot adapt.
  if (honeypot) {
    return new NextResponse(null, { status: 204 });
  }

  if (!doctor_id || !reviewer_name || !rating || !review_text) {
    return NextResponse.json({ error: 'সব তথ্য পূরণ করুন' }, { status: 400 });
  }
  if (review_text.length < 20 || review_text.length > 500) {
    return NextResponse.json({ error: 'রিভিউ ২০-৫০০ অক্ষরের মধ্যে হতে হবে' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'রেটিং সঠিক নয়' }, { status: 400 });
  }

  const supabase = createClient();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `review:${ip}:doctor:${doctor_id}`,
    p_max_count: 3,
    p_window: '24 hours',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json(
      { error: 'আপনি ইতিমধ্যে এই ডাক্তারকে রিভিউ দিয়েছেন। ২৪ ঘণ্টা পর আবার চেষ্টা করুন।' },
      { status: 429 }
    );
  }

  const { error } = await supabase.from('reviews').insert({
    entity_type: 'doctor',
    entity_id: doctor_id,
    reviewer_name,
    rating,
    review_text,
    status: 'pending',
  });

  if (error) {
    console.error('review insert failed:', error.message);
    return NextResponse.json({ error: 'সাবমিট করতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
