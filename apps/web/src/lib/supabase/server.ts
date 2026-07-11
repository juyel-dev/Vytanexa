import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server Component / Route Handler Supabase client — still the anon
 * key (public reads go through RLS same as the browser client), but
 * wired to Next.js's cookie store so an authenticated user's session
 * (S17 account features) is respected in SSR reads.
 *
 * The SEPARATE service-role client (full RLS bypass, for admin
 * mutations only) lives in apps/admin, never in apps/web — the user
 * app should never hold that credential at all.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request context
            // (e.g. during static rendering) — safe to ignore; the
            // middleware layer (added in Phase 2) handles session
            // refresh for those cases.
          }
        },
      },
    }
  );
}
