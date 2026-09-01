import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * POST /api/admin/reviews/bulk — ADMIN-PANEL-SPEC.md A03 "Bulk
 * actions" (unified moderation queue pattern): "checkbox-select
 * multiple pending rows... critical for a solo operator facing a
 * backlog after a busy day; approving one-by-one doesn't scale."
 * Mirrors api/admin/doctors/bulk/route.ts's exact shape.
 */
const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'reject']),
});

export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });
  const { ids, action } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase.from('reviews').select('id').in('id', ids);
  const found = new Set((existing ?? []).map((r) => r.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) {
    return NextResponse.json({ error: 'কিছু রিভিউ আর বিদ্যমান নেই — রিফ্রেশ করুন' }, { status: 400 });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const { error } = await supabase
    .from('reviews')
    .update({ status, moderated_by: session.id, moderated_at: new Date().toISOString() } as never)
    .in('id', ids);

  if (error) return NextResponse.json({ error: 'বাল্ক অ্যাকশন করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'review_bulk', null, { after: { ids, action } });

  return NextResponse.json({ ok: true, updated: ids.length });
}
