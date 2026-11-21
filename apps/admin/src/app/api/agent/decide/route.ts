import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeAgentQuota, requireAgent } from '@/lib/agent-auth';
import { writeAgentAudit } from '@/lib/audit';

/**
 * POST /api/agent/decide — low-risk moderation decisions. Scope: moderate.
 *
 * Body: {
 *   type:    'reviews' | 'questions' | 'reports',
 *   ids:     uuid[]  (1..50),
 *   action:  reviews/questions → 'approve' | 'reject'
 *            reports           → 'resolve' | 'dismiss',
 *   reason:  string (required unless action is 'approve'),
 *   dry_run: boolean (default TRUE — nothing is written)
 * }
 *
 * Guard rails enforced here, not in the prompt:
 *   - Only items that are still pending/open can change. An agent can never
 *     flip an already-moderated item, nor touch anything outside these three
 *     queues (no doctors, no hospitals, no users, no roles, no deletes).
 *   - dry_run defaults to true; a real write needs an explicit dry_run:false.
 *   - Max 50 ids per call plus an atomic per-token daily cap.
 *   - Every write is audited with actor_type 'agent', the before-state, the
 *     token id and the stated reason.
 */
type ItemType = 'reviews' | 'questions' | 'reports';

type Source = {
  table: string;
  pendingStatus: string;
  softDelete: boolean;
  auditEntity: string; // matches the human bulk routes so the audit-log page groups them
  actions: Record<string, string>; // action -> target status
  extraFields: () => Record<string, unknown>;
};

const SOURCES: Record<ItemType, Source> = {
  reviews: {
    table: 'reviews',
    pendingStatus: 'pending',
    softDelete: true,
    auditEntity: 'review_bulk',
    actions: { approve: 'approved', reject: 'rejected' },
    extraFields: () => ({ moderated_at: new Date().toISOString() }),
  },
  questions: {
    table: 'questions',
    pendingStatus: 'pending',
    softDelete: true,
    auditEntity: 'question_bulk',
    actions: { approve: 'approved', reject: 'rejected' },
    extraFields: () => ({}),
  },
  reports: {
    table: 'data_reports',
    pendingStatus: 'open',
    softDelete: false,
    auditEntity: 'data_report_bulk',
    actions: { resolve: 'resolved', dismiss: 'dismissed' },
    extraFields: () => ({ resolved_at: new Date().toISOString() }),
  },
};

const schema = z.object({
  type: z.enum(['reviews', 'questions', 'reports']),
  ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['approve', 'reject', 'resolve', 'dismiss']),
  reason: z.string().trim().min(5).max(300).optional(),
  dry_run: z.boolean().default(true),
});

export async function POST(request: Request) {
  const auth = await requireAgent(request, 'moderate');
  if ('error' in auth) return auth.error;
  const { agent } = auth;
  const { db } = agent;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { type, action, reason, dry_run } = parsed.data;
  const ids = Array.from(new Set(parsed.data.ids));
  const src = SOURCES[type];

  const targetStatus = src.actions[action];
  if (!targetStatus) {
    return NextResponse.json(
      { error: 'action_not_allowed_for_type', allowed: Object.keys(src.actions) },
      { status: 400 }
    );
  }
  if (action !== 'approve' && !reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  // Current state of the requested items.
  const base = db.from(src.table).select('id, status').in('id', ids);
  const { data, error } = src.softDelete ? await base.is('deleted_at', null) : await base;
  if (error) return NextResponse.json({ error: 'query_failed' }, { status: 500 });

  const rows = (data ?? []) as unknown as { id: string; status: string }[];
  const byId = new Map(rows.map((r) => [r.id, r.status]));
  const eligible = rows.filter((r) => r.status === src.pendingStatus);
  const skipped = ids
    .filter((id) => byId.get(id) !== src.pendingStatus)
    .map((id) => ({ id, reason: byId.has(id) ? 'already_moderated' : 'not_found' }));

  if (dry_run) {
    return NextResponse.json({
      dry_run: true,
      type,
      action,
      target_status: targetStatus,
      would_update: eligible.map((r) => r.id),
      skipped,
    });
  }

  if (eligible.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, skipped });
  }

  if (!(await consumeAgentQuota(agent, eligible.length))) {
    return NextResponse.json({ error: 'daily_cap_reached' }, { status: 429 });
  }

  // The status guard in the WHERE clause makes this race-safe: if a human
  // moderated an item between the read above and now, it is simply not updated.
  const { data: updatedRows, error: updateError } = await db
    .from(src.table)
    .update({ status: targetStatus, ...src.extraFields() })
    .in(
      'id',
      eligible.map((r) => r.id)
    )
    .eq('status', src.pendingStatus)
    .select('id');
  if (updateError) return NextResponse.json({ error: 'update_failed' }, { status: 500 });

  const updatedIds = ((updatedRows ?? []) as { id: string }[]).map((r) => r.id);

  await writeAgentAudit(db, agent.tokenId, 'update', src.auditEntity, null, {
    before: eligible.map((r) => ({ id: r.id, status: r.status })),
    after: {
      ids: updatedIds,
      action,
      status: targetStatus,
      reason: reason ?? null,
      agent: agent.name,
    },
  });

  return NextResponse.json({ ok: true, updated: updatedIds.length, skipped });
}
