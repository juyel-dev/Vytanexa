/**
 * Audit helper — DATABASE-SCHEMA.md § 5.6 "Audit Logs".
 *
 * Every admin write must record an `audit_logs` row capturing the
 * acting admin + before/after diff. This is an application-layer
 * convention (not a DB trigger) because the before/after diff and the
 * acting admin_id are only cleanly available at the request layer.
 *
 * Two actor kinds are recorded:
 *   - human admins     → `writeAudit`      (admin_id set, actor_type 'human')
 *   - automation agents → `writeAgentAudit` (admin_id null, actor_type 'agent',
 *                         agent_token_id set)
 *
 * `server-only`: the acting admin's id and any before/after data must
 * never be assembled in a client bundle.
 */
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'publish';

type AuditOpts = {
  before?: unknown;
  after?: unknown;
  ip?: string;
};

function toJson(value: unknown): unknown {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

async function insertAudit(
  // Untyped on purpose: the agent columns (actor_type, agent_token_id) are
  // not in the generated Database types until they are regenerated.
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<void> {
  // Fire-and-forget by design: failing to log must never break the
  // actual mutation the admin just performed. Swallowing the error here
  // (rather than leaking it to the UI) keeps audit best-effort.
  try {
    const { error } = await supabase.from('audit_logs').insert(row);
    if (error) console.error('[audit] insert failed:', error.message);
  } catch (e) {
    console.error('[audit] insert threw:', e);
  }
}

export async function writeAudit(
  supabase: SupabaseClient<Database>,
  adminId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  opts?: AuditOpts
): Promise<void> {
  await insertAudit(supabase as unknown as SupabaseClient, {
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: toJson(opts?.before),
    after_data: toJson(opts?.after),
    ip_address: opts?.ip ?? null,
  });
}

/**
 * Audit row for an action performed by an automation agent (MCP token).
 * `admin_id` stays null; the token id identifies the actor.
 */
export async function writeAgentAudit(
  supabase: SupabaseClient,
  tokenId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  opts?: AuditOpts
): Promise<void> {
  await insertAudit(supabase, {
    admin_id: null,
    actor_type: 'agent',
    agent_token_id: tokenId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: toJson(opts?.before),
    after_data: toJson(opts?.after),
    ip_address: opts?.ip ?? null,
  });
}
