import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * PATCH /api/admin/subscriptions/[id] — update status/expires, DELETE cancel.
 * super_admin only.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('super_admin');
  const body = (await request.json()) as { status?: string; expires_at?: string | null };
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('subscriptions').select('*').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'সাবস্ক্রিপশন পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('subscriptions').update(updates as never).eq('id', params.id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }
  await writeAudit(supabase, session.id, 'update', 'subscription', params.id, { before: existing, after: updates });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('super_admin');
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('subscriptions').select('id').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'সাবস্ক্রিপশন পাওয়া যায়নি' }, { status: 404 });
  const { error } = await supabase.from('subscriptions').update({ status: 'cancelled' } as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'বাতিল করা যায়নি: ' + error.message }, { status: 500 });
  await writeAudit(supabase, session.id, 'update', 'subscription', params.id, { before: existing, after: { status: 'cancelled' } });
  return NextResponse.json({ ok: true });
}
