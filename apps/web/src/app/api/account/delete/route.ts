import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@vytanexa/i18n/server';

/**
 * POST /api/account/delete — VYTANEXA-BLUEPRINT.md § S17 "Account
 * Deletion" (erase the person's data, then sign out).
 *
 * Calls the `delete_my_account()` RPC (migration 0020), which in ONE
 * transaction deletes the donor listing (it carried a public phone
 * number), scrubs author name/phone from questions/answers/reviews and
 * the analytics `user_id`, then deletes the auth user — cascading
 * `public.users`, favorites, notification reads. Leads are kept (the
 * provider's record of a request) but unlinked from the account.
 *
 * This replaced a cosmetic soft-delete that only blanked name/email/phone
 * on `public.users`: the auth user remained (the person could sign straight
 * back in) and the donor listing with their phone stayed public.
 */
export async function POST() {
  const t = await getT('validation');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t('generic.notSignedIn') }, { status: 401 });
  }

  const { data: status, error } = await supabase.rpc('delete_my_account');

  if (error || status !== 'ok') {
    console.error('account delete failed:', error?.message ?? status);
    // An admin account is refused on purpose (deleting it would also remove
    // their admin access) — surfaced as a plain failure to the user.
    return NextResponse.json({ error: t('account.deleteFailed') }, { status: status === 'admin_account' ? 403 : 500 });
  }

  // The auth user is already gone; this only clears the session cookies, so
  // a failure here (session not found) is expected and ignored.
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ success: true });
}
