/**
 * Agent (MCP) authentication — machine access to a deliberately small slice
 * of the admin panel (moderation queues only).
 *
 * Why a separate path from `requireRole()`:
 *   - Human admins authenticate with a Supabase session cookie. Agents (an
 *     MCP server driven by OpenCode / Claude / Hermes) send a bearer token.
 *   - Agents must NOT inherit a human role. Each token carries explicit
 *     scopes ('read' | 'moderate'), an expiry, a revoke switch and a daily
 *     action cap, and everything it does is audited with actor_type 'agent'.
 *
 * Token format: `vtx_agent_<random>`. Only its sha256 is stored
 * (`agent_tokens.token_hash`); the raw token is shown once at creation.
 *
 * Kill switch: the whole agent API answers 503 unless the deployment sets
 * AGENT_API_ENABLED=true.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type AgentScope = 'read' | 'moderate';

export type AgentContext = {
  tokenId: string;
  name: string;
  scopes: AgentScope[];
  dailyCap: number;
  /** Untyped service-role client (agent tables are not in generated types). */
  db: SupabaseClient;
};

const TOKEN_PREFIX = 'vtx_agent_';
const MAX_TOKEN_LENGTH = 200;

export function hashAgentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function fail(status: number, code: string): { error: Response } {
  return { error: Response.json({ error: code }, { status }) };
}

type TokenRow = {
  id: string;
  name: string;
  scopes: string[] | null;
  daily_action_cap: number;
  is_active: boolean;
  expires_at: string | null;
  revoked_at: string | null;
};

export async function requireAgent(
  request: Request,
  scope: AgentScope
): Promise<{ agent: AgentContext } | { error: Response }> {
  if (process.env.AGENT_API_ENABLED !== 'true') return fail(503, 'agent_api_disabled');

  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  const token = match?.[1];
  if (!token || !token.startsWith(TOKEN_PREFIX) || token.length > MAX_TOKEN_LENGTH) {
    return fail(401, 'unauthorized');
  }

  const db = createServiceRoleClient() as unknown as SupabaseClient;
  const { data, error } = await db
    .from('agent_tokens')
    .select('id, name, scopes, daily_action_cap, is_active, expires_at, revoked_at')
    .eq('token_hash', hashAgentToken(token))
    .maybeSingle();

  const row = data as TokenRow | null;
  if (error || !row) return fail(401, 'unauthorized');
  if (!row.is_active || row.revoked_at) return fail(401, 'token_revoked');
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return fail(401, 'token_expired');
  }

  const scopes = (row.scopes ?? []).filter(
    (s): s is AgentScope => s === 'read' || s === 'moderate'
  );
  if (!scopes.includes(scope)) return fail(403, 'insufficient_scope');

  // Best-effort usage stamp; never fail the request over it.
  try {
    await db.from('agent_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);
  } catch {
    /* ignore */
  }

  return {
    agent: { tokenId: row.id, name: row.name, scopes, dailyCap: row.daily_action_cap, db },
  };
}

/**
 * Atomically reserve `amount` actions against the token's daily cap (UTC day).
 * Returns false if the cap would be exceeded (nothing is recorded then).
 */
export async function consumeAgentQuota(agent: AgentContext, amount: number): Promise<boolean> {
  const { data, error } = await agent.db.rpc('agent_consume_quota', {
    p_token_id: agent.tokenId,
    p_amount: amount,
    p_cap: agent.dailyCap,
  });
  if (error) {
    console.error('[agent] quota rpc failed:', error.message);
    return false; // fail closed
  }
  return data === true;
}
