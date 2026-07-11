import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client — uses the public anon key only.
 * RLS policies (DATABASE-SCHEMA.md, every Part § "Row Level Security")
 * are the actual security boundary; this client can never bypass them.
 * Never import the service role key here or in any Client Component.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
