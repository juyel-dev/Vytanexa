import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { adminCreateSchema } from '@/lib/validations/admins';

/**
 * POST /api/admin/admins — create new admin (super_admin only).
 * Creates auth user via service-role + admin_users row. Sends invite email via Supabase if configured.
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = adminCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const { name, email, role, permissions } = parsed.data;
  const supabase = createServiceRoleClient();

  // only super_admin can create another super_admin (prevent escalation)
  if (role === 'super_admin' && session.role !== 'super_admin') {
    return NextResponse.json({ error: 'শুধু super_admin অন্য super_admin তৈরি করতে পারেন' }, { status: 403 });
  }

  // create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Auth ইউজার তৈরি করা যায়নি: ' + (authError?.message ?? '') }, { status: 500 });
  }

  const userId = authData.user.id;

  const { data: adminRow, error: adminErr } = await supabase
    .from('admin_users')
    .insert({ id: userId, name: name.trim(), role, permissions: permissions ?? {}, is_active: true } as never)
    .select()
    .single();

  if (adminErr) {
    // rollback auth user
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'অ্যাডমিন রো তৈরি করা যায়নি: ' + adminErr.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'create', 'admin_user', userId, { after: adminRow });
  return NextResponse.json({ admin: adminRow, email }, { status: 201 });
}
