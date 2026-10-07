import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth-methods — which sign-in methods the admin has turned on
 * (`app_settings.features.phone_auth` / `google_auth`, both default off).
 * The sign-in screens used to show phone-OTP and Google buttons
 * unconditionally; with neither provider configured in Supabase every tap
 * ended in an error. Guest mode needs no flag (always available).
 */
export async function GET() {
  const flags = await getFeatureFlags(createClient());
  return NextResponse.json({
    phone: flags.phone_auth === true,
    google: flags.google_auth === true,
  });
}
