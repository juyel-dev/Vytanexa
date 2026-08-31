import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { answerSchema } from '@/lib/validations/answers';

/**
 * POST /api/answers — VYTANEXA-BLUEPRINT.md § S14 "উত্তর দিন input at
 * bottom (requires sign-in — soft-gate)."
 *
 * Real auth (phone+OTP / Google via Supabase Auth) is S22 scope, not
 * built yet — so this route currently accepts guest submissions
 * (matching what `answers_public_insert` RLS actually allows:
 * `WITH CHECK (status = 'pending')`, no auth requirement at the DB
 * layer). The "soft-gate" UI behavior (prompting sign-in before
 * showing the answer form) is deferred to S22 alongside real auth —
 * gating in the UI without a real auth system behind it would just be
 * a fake wall, not the actual feature. `doctor_id` is always left
 * null here: doctor-authored answers only ever come from an admin/
 * doctor-portal mechanism not yet built (spec's own "flagged as scope
 * decision for Admin Panel" note), never from this public route.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Normalize client field `body` → schema field `body`, plus validate
  const parsed = answerSchema.safeParse({
    question_id: body.question_id,
    body: body.body,
    author_name: body.author_name,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { question_id, body: answerBody, author_name } = parsed.data;

  const supabase = createClient();
  const ip = getClientIp(request);

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `answer_submit:${ip}`,
    p_max_count: 10,
    p_window: '24 hours',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json(
      { error: 'আজকের জন্য উত্তর দেওয়ার সীমা শেষ হয়েছে। কাল আবার চেষ্টা করুন।' },
      { status: 429 }
    );
  }

  const { error } = await supabase.from('answers').insert({
    question_id,
    body: answerBody.trim(),
    author_name: author_name?.trim() || null,
    doctor_id: null,
    status: 'pending',
  });

  if (error) {
    console.error('answer insert failed:', error.message);
    return NextResponse.json({ error: 'উত্তর জমা দিতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
