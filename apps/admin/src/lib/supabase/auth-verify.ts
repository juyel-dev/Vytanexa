/**
 * Admin Session Resolution — ADMIN-PANEL-SPEC.md § A02 "Authentication
 * Flow" + "Role & Permission Matrix" + § "Practical Starting Point".
 *
 * Auth model (distinct from the user-app's phone-OTP flow): Supabase
 * Auth email/password. Session is checked against the `admin_users`
 * table — a user is only an operator if they have a row with
 * `is_active = true`, or redirect to `/login` with "অ্যাক্সেস নেই".
 *
 * Defense in depth (matching the RLS philosophy from DATABASE-SCHEMA.md):
 * (1) sidebar hides items the role can't access — UX-level;
 * (2) every server-side mutation route independently re-checks the role
 * via `requireRole(role)` — never trusts the client to have hidden a
 * button correctly. `admin_users.permissions` JSONB lets super_admin
 * grant a one-off override without inventing a new role.
 */
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Database } from '@vytanexa/database';

export const APP_ROLES = ['super_admin', 'admin', 'moderator', 'editor'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type AdminSession = {
  id: string;
  name: string;
  role: AppRole;
  permissions: Record<string, unknown>;
  isActive: true;
};

function createSessionClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies().getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookies().set(name, value, options)
            );
          } catch {
            // Called from a Server Component (getAdminSession in the
            // dashboard layout) — cookies() can't be written during RSC
            // render. Harmless here: a token refresh triggered by
            // auth.getUser() simply won't persist on THAT pass; the
            // admin middleware/route handlers handle it where a real
            // response object exists.
          }
        },
      },
    }
  );
}

/**
 * Returns the current admin session, or null if the request has no valid
 * Supabase auth session OR the authenticated user has no active
 * `admin_users` row. Safe to call from Server Components — one DB
 * round-trip beyond the session check.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = createSessionClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, name, role, permissions, is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (error || !data || !data.is_active) return null;

  return {
    id: data.id,
    name: data.name,
    role: data.role as AppRole,
    permissions: (data.permissions ?? {}) as Record<string, unknown>,
    isActive: true,
  };
}

/**
 * Auth boundary — call from the dashboard layout. Redirects to /login
 * if there is no admin session.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Role gate — call from a Server Component or Route Handler that a
 * specific role must pass. Redirects to /login?error=access_denied if
 * the session exists but the role lacks permission. The check reads
 * `admin_users.permissions` JSONB so super_admin can grant a one-off
 * override (e.g. "this specific admin CAN also touch god-mode") without
 * inventing a new role (A02).
 */
export async function requireRole(required: AppRole): Promise<AdminSession> {
  const session = await requireAdmin();
  if (session.role === 'super_admin') return session;

  const hasRole = session.role === required;
  const hasOverride =
    session.permissions?.[`${required}_access`] === true ||
    session.permissions?.all_access === true;

  if (!hasRole && !hasOverride) {
    redirect('/login?error=access_denied');
  }
  return session;
}