import 'server-only';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/admin/login — ADMIN-PANEL-SPEC.md § A02 "Authentication
 * Flow". Server-side email/password sign-in for the admin panel.
 *
 * Deliberately a Route Handler (not a browser-client call from the
 * login page) so the heavy supabase-js client stays OUT of the /login
 * client bundle — the same bundle-size lesson documented in
 * CHECKPOINT.md §6 and applied across the user app.
 *
 * Also adds defense in depth: a user can only complete this flow if
 * they have an active `admin_users` row — the session is created by
 * Supabase Auth, but the final 200 is gated on that membership check
 * so a non-operator with valid email/password still gets an "Access
 * denied" rather than a dashboard that renders nothing (the layout
 * would reject them, but rejecting here is clearer + earlier).
 */
export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'ইমেইল ও পাসওয়ার্ড দিন' }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies().getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies().set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে' }, { status: 401 });
  }

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id, is_active')
    .eq('id', data.user.id)
    .eq('is_active', true)
    .single();

  if (!adminRow) {
    // Valid credentials, but not an operator (or deactivated) — sign
    // out the just-created session and reject, so a stray account can't
    // hold a dangling admin session.
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'এই অ্যাকাউন্টে অ্যাক্সেস নেই' }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}