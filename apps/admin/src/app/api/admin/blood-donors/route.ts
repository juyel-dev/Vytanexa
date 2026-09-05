import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRoleApi } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { donorSchema } from '@/lib/validations/blood';

/**
 * POST /api/admin/blood-donors — manually add a donor (deep-dive
 * finding: staff who take a donor's details over the phone had no way
 * to add them without the donor filling the public web form
 * themselves). `user_id` is left null — this row has no linked
 * account, same as any donor who registered before the login-gate
 * migration; consent is recorded as given to the admin creating it,
 * matching the DB's `chk_donor_consent` constraint.
 * Gate: admin (requireRoleApi — see its comment for why not requireRole here)
 */
export async function POST(request: Request) {
  const gate = await requireRoleApi('admin');
  if ('error' in gate) return gate.error;
  const session = gate.session;

  const parsed = donorSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  }
  const { name, phone, blood_group, location_id, verification_status } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('blood_donors')
    .insert({
      name,
      phone,
      blood_group,
      location_id,
      consent_contact: true,
      user_id: null,
      verification_status: verification_status ?? 'verified',
    } as never)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'যোগ করা যায়নি: ' + error.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'create', 'blood_donor', (data as { id: string }).id, {
    after: parsed.data,
  });
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
