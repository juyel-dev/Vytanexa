import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { adUpdateSchema } from '@/lib/validations/subscriptions';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = adUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('ads').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'বিজ্ঞাপন পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.placement !== undefined) updates.placement = body.placement;
  if (body.sponsor_name !== undefined) updates.sponsor_name = body.sponsor_name.trim();
  if (body.image_url !== undefined) updates.image_url = body.image_url.trim();
  if (body.target_url !== undefined) updates.target_url = body.target_url.trim();
  if (body.display_order !== undefined) updates.display_order = body.display_order;
  if (body.start_date !== undefined) updates.start_date = body.start_date;
  if (body.end_date !== undefined) updates.end_date = body.end_date;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('ads').update(updates as never).eq('id', params.id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }
  const { data: updated } = await supabase.from('ads').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'ad', params.id, { before: existing, after: updated });
  return NextResponse.json({ ad: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('ads').select('id').eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'বিজ্ঞাপন পাওয়া যায়নি' }, { status: 404 });
  const { error } = await supabase.from('ads').update({ deleted_at: new Date().toISOString() } as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });
  await writeAudit(supabase, session.id, 'delete', 'ad', params.id, { before: existing });
  return NextResponse.json({ ok: true });
}
