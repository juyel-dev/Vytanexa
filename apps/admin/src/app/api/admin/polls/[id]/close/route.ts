import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * POST /api/admin/polls/[id]/close — end poll early (expires_at=now).
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const { data: poll } = await supabase.from('polls').select('id').eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (!poll) return NextResponse.json({ error: 'পোল পাওয়া যায়নি' }, { status: 404 });
  const { error } = await supabase.from('polls').update({ expires_at: new Date().toISOString(), is_active: false } as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'বন্ধ করা যায়নি: ' + error.message }, { status: 500 });
  await writeAudit(supabase, session.id, 'update', 'poll', params.id, { after: { closed: true } });
  return NextResponse.json({ ok: true });
}
