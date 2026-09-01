import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * PATCH /api/admin/questions/[id] — moderation variant, distinct from
 * api/admin/qa/answer (which publishes an answer, not the question
 * itself). TODO.md Phase 9.4. Approve/reject just flips
 * questions.status; upvote_count/answer_count stay trigger-maintained
 * (unaffected here).
 */
const schema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('questions').select('*').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'প্রশ্ন পাওয়া যায়নি' }, { status: 404 });

  const { data: updated, error } = await supabase
    .from('questions')
    .update({ status: parsed.data.status } as never)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !updated) return NextResponse.json({ error: 'আপডেট করা যায়নি' }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'question', params.id, {
    before: existing,
    after: { ...updated, _internal_reject_reason: parsed.data.reason ?? undefined },
  });

  return NextResponse.json({ question: updated });
}
