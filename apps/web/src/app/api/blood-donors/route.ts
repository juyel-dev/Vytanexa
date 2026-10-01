import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bloodDonorSchema } from '@/lib/validations/blood-donors-schema';
import { getT } from '@vytanexa/i18n/server';

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
 * Rate-limited 1 registration per phone per 90 days (matches WHO's
 * donation interval), PLUS a DB-level unique index
 * (`uq_blood_donors_one_per_user`) capping one active listing per
 * account. Both live inside the `register_blood_donor()` RPC so the
 * rate-limit slot is only consumed when the insert actually succeeds.
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
  const t = await getT('validation');
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t('bloodDonors.mustSignIn') }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bloodDonorSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') }, { status: 400 });
  }
  const { name, phone, blood_group, location_id, consent_contact } = parsed.data;

  // One atomic RPC (migration 0019): listing-exists check -> 90-day
  // per-phone rate limit -> INSERT. The rate-limit slot and the INSERT
  // commit or roll back together, so a failed registration no longer
  // locks the phone out for 90 days.
  const { data: status, error } = await supabase.rpc('register_blood_donor', {
    p_name: name,
    p_phone: phone,
    p_blood_group: blood_group,
    p_location_id: location_id,
    p_consent: consent_contact,
  });

  if (error) {
    console.error('donor registration rpc failed:', error.message);
    return NextResponse.json({ error: t('bloodDonors.registerFailed') }, { status: 500 });
  }

  switch (status) {
    case 'ok':
      return NextResponse.json({ success: true });
    case 'unauthenticated':
      return NextResponse.json({ error: t('bloodDonors.mustSignIn') }, { status: 401 });
    case 'already_listed':
      return NextResponse.json({ error: t('bloodDonors.alreadyHasListing') }, { status: 409 });
    case 'rate_limited':
      return NextResponse.json({ error: t('bloodDonors.alreadyRegistered90d') }, { status: 429 });
    case 'invalid_phone':
      return NextResponse.json({ error: t('bloodDonors.phoneInvalid') }, { status: 400 });
    case 'invalid_location':
      return NextResponse.json({ error: t('bloodDonors.locationRequired') }, { status: 400 });
    case 'consent_required':
      return NextResponse.json({ error: t('bloodDonors.consentRequired') }, { status: 400 });
    default:
      return NextResponse.json({ error: t('bloodDonors.registerFailed') }, { status: 400 });
  }
}
