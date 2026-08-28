import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bloodDonorSchema } from '@/lib/validations/blood-donors';

/**
 * POST /api/blood-donors — VYTANEXA-BLUEPRINT.md § S11 "Donor
 * Registration (Opt-in Directory)". Guest-submittable (no app
 * account/login required, DATABASE-SCHEMA.md § 3.3: "maximizing donor
 * pool size"), rate-limited 1 registration per phone per 90 days via
 * the generic `check_rate_limit()` function — same mechanism as
 * reviews/leads, matches WHO's donation interval per spec.
 *
 * `consent_contact` is mandatory both here and at the DB CHECK
 * constraint level (`chk_donor_consent`) — belt and suspenders, a
 * donor record without consent should never be insertable at all.
 *
 * The spec's second checkbox ("শেষ রক্তদান ৩ মাসের বেশি আগে হয়েছে" —
 * an eligibility self-declaration) has no backing column on
 * `blood_donors` (the schema's `last_donated_at` is an optional exact
 * date, a different field than this yes/no declaration) — it's
 * enforced as a client-side gate on the submit button only, not
 * persisted. Documented here rather than silently dropped.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = bloodDonorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { name, phone, blood_group, location_id, consent_contact } = parsed.data;

  const supabase = createClient();

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `donor_register:${phone}`,
    p_max_count: 1,
    p_window: '90 days',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json(
      { error: 'এই নম্বর দিয়ে ৯০ দিনের মধ্যে ইতিমধ্যে নিবন্ধন করা হয়েছে' },
      { status: 429 }
    );
  }

  const { error } = await supabase.from('blood_donors').insert({
    name,
    phone,
    blood_group,
    location_id,
    consent_contact: true,
  });

  if (error) {
    console.error('donor registration insert failed:', error.message);
    return NextResponse.json({ error: 'নিবন্ধন করতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
