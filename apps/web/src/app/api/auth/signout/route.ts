import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/signout — VYTANEXA-BLUEPRINT.md § S16 "Sign Out
 * Confirmation". Server-side sign-out (via the cookie-aware server
 * client) rather than calling `supabase.auth.signOut()` from the
 * browser — keeps the browser Supabase client bundle out of
 * `MorePageClient`, same bundle-size lesson learned building S12's
 * `/emergency` page (see that page's own comments for the full
 * story). A plain `fetch()` POST is all the client needs.
 */
export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
