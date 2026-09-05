import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRoleApi } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { donorSchema } from '@/lib/validations/blood';

/**
 * PATCH /api/admin/blood-donors/[id] — partial update. Handles both
 * the table's quick verified/suspended toggle and the full edit modal
 * (name/phone/blood_group/location_id) — BLOOD-SERVICE-PLAN.md Phase
 * C.2. verification_status matches hospitals/ambulance_services'
 * shared enum (see the login-gate follow-up for why is_active was
 * replaced with this).
 * DELETE — soft-delete (spam/fake)
 * Gate: admin (requireRoleApi — see its comment for why not requireRole here)
 */
const patchSchema = donorSchema.partial();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireRoleApi('admin');
  if ('error' in gate) return gate.error;
  const session = gate.session;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: parsed.success ? 'কোনো পরিবর্তন নেই' : (parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা') }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('blood_donors').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'রক্তদাতা পাওয়া যায়নি' }, { status: 404 });

  const { error } = await supabase.from('blood_donors').update(parsed.data as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'blood_donor', params.id, { before: existing, after: parsed.data });
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
