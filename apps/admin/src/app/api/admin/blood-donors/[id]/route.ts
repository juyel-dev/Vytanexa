import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRoleApi } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * PATCH /api/admin/blood-donors/[id] — toggle is_active / is_active=false
 * DELETE — soft-delete (spam/fake)
 * Gate: admin (requireRoleApi — see its comment for why not requireRole here)
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireRoleApi('admin');
  if ('error' in gate) return gate.error;
  const session = gate.session;
  const body = (await request.json()) as { is_active?: boolean };
  if (typeof body.is_active !== 'boolean') return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('blood_donors').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'রক্তদাতা পাওয়া যায়নি' }, { status: 404 });

  const { error } = await supabase.from('blood_donors').update({ is_active: body.is_active } as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'blood_donor', params.id, { before: existing, after: { is_active: body.is_active } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const gate = await requireRoleApi('admin');
  if ('error' in gate) return gate.error;
  const session = gate.session;
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('blood_donors').select('id').eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'রক্তদাতা পাওয়া যায়নি' }, { status: 404 });
  const { error } = await supabase.from('blood_donors').update({ deleted_at: new Date().toISOString() } as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });
  await writeAudit(supabase, session.id, 'delete', 'blood_donor', params.id, { before: existing });
  return NextResponse.json({ ok: true });
}
