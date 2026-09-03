import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase Auth Middleware — S22 Auth polish.
 * Refreshes the Supabase auth session cookie on every request so
 * Server Components reading `cookies()` (lib/supabase/server.ts) always
 * see a valid session. Without this, OTP / Google OAuth sessions would
 * appear to sign out after the initial access-token expiry.
 *
 * Pattern copied from Supabase SSR docs for Next.js App Router:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */
const FIRST_RUN_BYPASS_PREFIXES = ['/onboarding', '/auth', '/api', '/offline'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasFirstRun = request.cookies.get('vytanexa_first_run')?.value === 'done';
  const isBypassed = FIRST_RUN_BYPASS_PREFIXES.some((p) => pathname.startsWith(p));
  if (!hasFirstRun && !isBypassed) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired — `getUser()` is the recommended call
  // (validates JWT via Supabase Auth server, not just local parsing).
  // We intentionally ignore the return value; the side-effect is the
  // refreshed cookie written into supabaseResponse above.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
