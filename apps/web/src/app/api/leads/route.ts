import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leadSchema } from '@/lib/validations/leads';

/**
 * POST /api/leads — VYTANEXA-BLUEPRINT.md § S07 "Appointment Lead
 * Capture (Income Stream Feature)". Rate-limited 3 per phone per
 * doctor per 24h via the shared `check_rate_limit()` function.
 * Validated via Zod (leadSchema) — single source of truth per S22's
 * "react-hook-form + Zod schemas shared between client validation and
 * Route Handler server-side validation" architecture summary.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { doctor_id, chamber_id, patient_name, patient_phone, preferred_time, message } = parsed.data;

  const supabase = createClient();
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `lead:${patient_phone}:doctor:${doctor_id}`,
    p_max_count: 3,
    p_window: '24 hours',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json(
      { error: 'আপনি ইতিমধ্যে অনুরোধ পাঠিয়েছেন। পরে আবার চেষ্টা করুন।' },
      { status: 429 }
    );
  }

  const { error } = await supabase.from('leads').insert({
    doctor_id,
    chamber_id: chamber_id ?? null,
    patient_name,
    patient_phone,
    preferred_time: preferred_time ?? null,
    message: message ?? null,
    source: 'profile_page',
  });

  if (error) {
    console.error('lead insert failed:', error.message);
    return NextResponse.json({ error: 'পাঠাতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
