import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * PATCH /api/admin/reviews/[id] — ADMIN-PANEL-SPEC.md's "UNIFIED
 * MODERATION QUEUE PATTERN" (A03), reviews variant. TODO.md Phase 9.4.
 *
 * Approve/reject just flips `status` — `trg_reviews_recalc_rating`
 * (migrations/0004_engagement.sql) automatically recalculates the
 * target doctor/hospital's rating_avg/rating_count on any
 * `UPDATE OF status`, so nothing else needs computing here, exactly
 * as the spec describes ("triggers the relevant recalc trigger...
 * automatically at the DB layer").
 *
 * Reject's `reason` is internal-only (spec: "not shown to submitter")
 * — stored nowhere on the review row itself (there's no column for
 * it), captured only in the audit log's after_data for internal
 * record-keeping, matching the spec's stated purpose exactly.
 *
 * `admin_reply` (approve or already-approved reviews only, per S07)
 * is a separate optional field, settable independently of status.
 */
const schema = z.object({
  status: z.enum(['approved', 'rejected']).optional(),
  reason: z.string().trim().max(500).optional(),
  admin_reply: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  }
  if (parsed.data.status === undefined && parsed.data.admin_reply === undefined) {
    return NextResponse.json({ error: 'কিছু পরিবর্তন করা হয়নি' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('reviews').select('*').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'রিভিউ পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
    updates.moderated_by = session.id;
    updates.moderated_at = new Date().toISOString();
  }
  if (parsed.data.admin_reply !== undefined) updates.admin_reply = parsed.data.admin_reply || null;

  const { data: updated, error } = await supabase
    .from('reviews')
    .update(updates as never)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'update', 'review', params.id, {
    before: existing,
    after: { ...updated, _internal_reject_reason: parsed.data.reason ?? undefined },
  });

  return NextResponse.json({ review: updated });
}
