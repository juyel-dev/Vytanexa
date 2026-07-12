import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser client — anon key, RLS-scoped. Used ONLY for the admin's own
 * auth session (login, reading their own admin_users row per
 * DATABASE-SCHEMA.md § 5.9 `admin_users_own_read` policy). Every actual
 * data mutation (doctors, hospitals, god-mode settings, etc.) goes
 * through a server-side Route Handler using the service-role client
 * (see service-role.ts) — this file must never be used for that.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
