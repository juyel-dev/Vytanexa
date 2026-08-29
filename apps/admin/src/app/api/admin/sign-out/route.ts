import 'server-only';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/admin/sign-out — ADMIN-PANEL-SPEC.md § A02 sidebar footer.
 * Clears the auth session server-side and returns 204; the client
 * navigates to /login after the response (Sidebar handleSignOut).
 */
export async function POST() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies().getAll();
        },
        // setAll writes the cleared session cookie into the response —
        // note: in a Route Handler (not a Server Component), cookies()
        // set() is legitimate because there's an active response object.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies().set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();
  return new NextResponse(null, { status: 204 });
}