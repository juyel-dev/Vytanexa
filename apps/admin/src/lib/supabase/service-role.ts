import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — FULL RLS BYPASS. This is how the
 * Admin Panel actually performs writes (create/edit doctors, publish
 * god-mode changes, moderate content, etc.) as designed throughout
 * DATABASE-SCHEMA.md ("All WRITE access ... is service-role ONLY").
 *
 * HARD RULES:
 * - `import 'server-only'` above makes it a build error to accidentally
 *   import this file into any Client Component or browser bundle.
 * - Only call this from Route Handlers / Server Actions, AFTER
 *   independently re-checking the acting admin's role (defense in
 *   depth per ADMIN-PANEL-SPEC.md § A02 — never trust that the UI
 *   already hid the button).
 * - Every mutation performed with this client should be paired with
 *   an `audit_logs` insert (DATABASE-SCHEMA.md § 5.6) capturing
 *   before/after state — that pairing is an application-layer
 *   convention enforced by code review, not by the database itself.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
