import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * POST /api/admin/categories/reorder — batch update display_order.
 * Body: { orderedIds: string[] } — index in array = new display_order.
 * Gate: admin/super_admin. This directly drives S04's CategoryGrid order.
 */
const schema = z.object({ orderedIds: z.array(z.string().uuid()).min(1).max(200) });

export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ক্রম' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { orderedIds } = parsed.data;

  // Verify all ids exist (soft-delete filter) — helps catch stale client state.
  const { data: existing } = await supabase.from('categories').select('id').in('id', orderedIds).is('deleted_at', null);
  const existingSet = new Set((existing ?? []).map((r) => r.id));
  const missing = orderedIds.filter((id) => !existingSet.has(id));
  if (missing.length) return NextResponse.json({ error: 'কিছু বিভাগ আর বিদ্যমান নেই — পেজ রিফ্রেশ করুন' }, { status: 400 });

  for (let i = 0; i < orderedIds.length; i++) {
    const targetId = orderedIds[i]!;
    const { error } = await supabase.from('categories').update({ display_order: i }).eq('id', targetId);
    if (error) return NextResponse.json({ error: 'ক্রম সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'update', 'category_reorder', null, { after: { orderedIds } });

  return NextResponse.json({ ok: true });
}
