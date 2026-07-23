import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/leads — VYTANEXA-BLUEPRINT.md § S07 "Appointment Lead
 * Capture (Income Stream Feature)". Rate-limited 3 per phone per
 * doctor per 24h via the shared `check_rate_limit()` function.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { doctor_id, chamber_id, patient_name, patient_phone, preferred_time, message } = body;

  if (!doctor_id || !patient_name || !patient_phone) {
    return NextResponse.json({ error: 'সব প্রয়োজনীয় তথ্য পূরণ করুন' }, { status: 400 });
  }
  if (!/^[6-9]\d{9}$/.test(patient_phone)) {
    return NextResponse.json({ error: 'সঠিক মোবাইল নম্বর দিন' }, { status: 400 });
  }
  if (message && message.length > 200) {
    return NextResponse.json({ error: 'বার্তা খুব বড়' }, { status: 400 });
  }

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
