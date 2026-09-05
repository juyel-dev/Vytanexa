import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bloodDonorSchema } from '@/lib/validations/blood-donors';

/**
 * POST /api/blood-donors — VYTANEXA-BLUEPRINT.md § S11 "Donor
 * Registration (Opt-in Directory)".
 *
 * Login-gate update (post-launch decision, see BLOOD-SERVICE-PLAN.md):
 * the "maximize donor pool, no login" approach from the original spec
 * was replaced — registration now requires a signed-in account
 * (Google sign-in; RLS enforces `user_id = auth.uid()` at the DB level
 * too, not just here) so a moderator has an actual account to act on
 * later, and so a donor can eventually manage their own listing. A
 * donor still publishes instantly on registration (verification_status
 * defaults to 'verified') — no approval queue, no OTP; a moderator
 * suspends fakes after the fact via WhatsApp, per the agreed model.
 *
 * Rate-limited 1 registration per phone per 90 days via the generic
 * `check_rate_limit()` function (matches WHO's donation interval),
 * PLUS a DB-level unique index (`uq_blood_donors_one_per_user`)
 * capping one active listing per account.
 *
 * `consent_contact` is mandatory both here and at the DB CHECK
 * constraint level (`chk_donor_consent`) — belt and suspenders.
 *
 * The spec's second checkbox ("শেষ রক্তদান ৩ মাসের বেশি আগে হয়েছে" —
 * an eligibility self-declaration) has no backing column on
 * `blood_donors` (the schema's `last_donated_at` is an optional exact
 * date, a different field than this yes/no declaration) — it's
 * enforced as a client-side gate on the submit button only, not
 * persisted. Documented here rather than silently dropped.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'দাতা হতে হলে সাইন ইন করুন' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bloodDonorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { name, phone, blood_group, location_id, consent_contact } = parsed.data;

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `donor_register:${phone}`,
    p_max_count: 1,
    p_window: '90 days',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
    return NextResponse.json({ error: 'এখন নিবন্ধন করা যাচ্ছে না, একটু পরে চেষ্টা করুন' }, { status: 503 });
  }
  if (!allowed) {
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
    user_id: user.id,
  });

  if (error) {
    if (error.code === '23505') {
      // uq_blood_donors_one_per_user — this account already has a listing.
      return NextResponse.json(
        { error: 'আপনার একটি দাতা তালিকা ইতিমধ্যে আছে' },
        { status: 409 }
      );
    }
    console.error('donor registration insert failed:', error.message);
    return NextResponse.json({ error: 'নিবন্ধন করতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
