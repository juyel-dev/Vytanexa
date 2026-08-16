import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/account/delete — VYTANEXA-BLUEPRINT.md § S17 "Account
 * Deletion": "soft-deletes account (anonymizes PII, retains aggregate
 * analytics per data-retention policy) → signs out."
 *
 * Soft delete via `deleted_at` (already a column on `users`,
 * DATABASE-SCHEMA.md § 5.1) rather than a hard DELETE — matches the
 * pattern used everywhere else in this schema (`hospitals.deleted_at`,
 * `doctors.deleted_at`, etc.). PII fields (`name`, `email`, `phone`)
 * are cleared here per the spec's "anonymizes PII" instruction;
 * `analytics_events` rows referencing this `user_id` are untouched
 * (that's the "retains aggregate analytics" half — those rows carry
 * no PII themselves, just event counts).
 *
 * Does NOT delete the underlying `auth.users` row — Supabase Auth
 * manages that separately, and leaving it intact means the same phone
 * number re-signing-in later gets a fresh (re-populated by the
 * `trg_on_auth_user_created` trigger's `ON CONFLICT DO NOTHING`,
 * DATABASE-SCHEMA.md § 5.1) `public.users` row rather than colliding
 * with the anonymized one.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'সাইন ইন করা নেই' }, { status: 401 });
  }

  const { error } = await supabase
    .from('users')
    .update({
      name: null,
      email: null,
      phone: null,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('account delete (anonymize) failed:', error.message);
    return NextResponse.json({ error: 'অ্যাকাউন্ট মুছতে সমস্যা হয়েছে' }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
