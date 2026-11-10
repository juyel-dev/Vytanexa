import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Cookie-less, anon-key Supabase client for PUBLIC reads only
 * (same data every visitor sees: homepage sections, settings, lists).
 *
 * Why it exists: lib/supabase/server.ts reads cookies() (auth session),
 * which opts a route out of every Next.js cache. This client never
 * touches cookies, and routes its GET requests through Next's Data
 * Cache (`next.revalidate`), so identical public queries are served
 * from Vercel's cache for PUBLIC_REVALIDATE_SECONDS instead of hitting
 * Supabase on every page view (the TAO / memcache-in-front-of-DB idea).
 *
 * Safety rules:
 *  - NEVER use for user-specific data (account, favorites, reviews,
 *    anything filtered by the signed-in user) — use server.ts there.
 *  - Only GET (PostgREST selects) are cached; writes/RPC (POST) are not.
 *  - Next caches only HTTP 200 responses, so a transient error is
 *    never stored.
 *  - Freshness: admin edits appear within PUBLIC_REVALIDATE_SECONDS
 *    (tag `public-data` allows instant revalidateTag later).
 */
export const PUBLIC_REVALIDATE_SECONDS = 300;

export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            next: { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: ['public-data'] },
          }),
      },
    }
  );
}
