import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { adminUpdateSchema } from '@/lib/validations/admins';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('super_admin');
  const parsed = adminUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  // prevent self-deactivation lockout
  if (id === session.id && body.is_active === false) {
    return NextResponse.json({ error: 'নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না' }, { status: 400 });
  }

  const { data: existing } = await supabase.from('admin_users').select('*').eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'অ্যাডমিন পাওয়া যায়নি' }, { status: 404 });

  // only super_admin can set super_admin role
  if (body.role === 'super_admin' && session.role !== 'super_admin') {
    return NextResponse.json({ error: 'শুধু super_admin অন্য super_admin সেট করতে পারেন' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.role !== undefined) updates.role = body.role;
  if (body.permissions !== undefined) updates.permissions = body.permissions as never;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('admin_users').update(updates as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  const { data: updated } = await supabase.from('admin_users').select('*').eq('id', id).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'admin_user', id, { before: existing, after: updated });
  return NextResponse.json({ admin: updated });
}
