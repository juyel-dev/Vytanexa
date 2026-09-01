import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'reject']),
});

/** POST /api/admin/questions/bulk — mirrors reviews/bulk exactly. */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });
  const { ids, action } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase.from('questions').select('id').in('id', ids);
  const found = new Set((existing ?? []).map((r) => r.id));
  if (ids.some((id) => !found.has(id))) {
    return NextResponse.json({ error: 'কিছু প্রশ্ন আর বিদ্যমান নেই — রিফ্রেশ করুন' }, { status: 400 });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const { error } = await supabase.from('questions').update({ status } as never).in('id', ids);
  if (error) return NextResponse.json({ error: 'বাল্ক অ্যাকশন করা যায়নি' }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'question_bulk', null, { after: { ids, action } });
  return NextResponse.json({ ok: true, updated: ids.length });
}
