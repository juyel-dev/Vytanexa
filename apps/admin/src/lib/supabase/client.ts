import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@vytanexa/database';

/**
 * Browser-side Supabase client — anon key only, RLS-scoped.
 *
 * Currently NOT imported anywhere: the login page posts to the
 * `/api/admin/login` Route Handler instead (keeping the ~67KB supabase-js
 * bundle out of the client bundle). This file exists as the standard
 * browser client for future client-side admin reads (moderation queue
 * interactions, search-as-you-type filters, etc.).
 *
 * RLS is the actual security boundary; this client can never bypass it.
 * The service-role client (lib/supabase/service-role.ts) is
 * `server-only` and is the ONLY thing that performs admin writes.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}