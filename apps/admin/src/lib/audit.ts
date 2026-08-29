/**
 * Audit helper — DATABASE-SCHEMA.md § 5.6 "Audit Logs".
 *
 * Every admin write must record an `audit_logs` row capturing the
 * acting admin + before/after diff. This is an application-layer
 * convention (not a DB trigger) because the before/after diff and the
 * acting admin_id are only cleanly available at the request layer.
 *
 * `server-only`: the acting admin's id and any before/after data must
 * never be assembled in a client bundle.
 */
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'publish';

export async function writeAudit(
  supabase: SupabaseClient<Database>,
  adminId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  opts?: {
    before?: unknown;
    after?: unknown;
    ip?: string;
  }
): Promise<void> {
  // Fire-and-forget by design: failing to log must never break the
  // actual mutation the admin just performed. Swallowing the error here
  // (rather than leaking it to the UI) keeps audit best-effort.
  try {
    const { error } = await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before_data: opts?.before ? (JSON.parse(JSON.stringify(opts.before)) as never) : null,
      after_data: opts?.after ? (JSON.parse(JSON.stringify(opts.after)) as never) : null,
      ip_address: opts?.ip ?? null,
    });
    if (error) console.error('[audit] insert failed:', error.message);
  } catch (e) {
    console.error('[audit] insert threw:', e);
  }
}