import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Resolves the signed-in user's session + `public.users` profile row
 * in one place — VYTANEXA-BLUEPRINT.md § S16/S17 both need this (the
 * More page's account header, Account pages' auth guard). The
 * `public.users` row is guaranteed to exist for any real session via
 * `trg_on_auth_user_created` (migration 0005) — Supabase Auth handles
 * `auth.users` itself; this joins in the app-specific profile fields
 * (name, preferred_language, default_location_id, etc.).
 *
 * Returns `null` for guests — every caller treats that as "show the
 * guest/sign-in state", never as an error.
 */
export async function getCurrentUser(supabase: SupabaseClient<Database>) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !profile) {
    // Session exists but the profile row hasn't synced yet (trigger
    // race on first sign-up) or was soft-deleted — treat as guest
    // rather than crashing the page.
    console.error('getCurrentUser: profile lookup failed:', error?.message);
    return null;
  }

  return { authUser, profile };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
