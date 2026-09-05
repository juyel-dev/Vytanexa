import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRoleApi } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * PATCH /api/admin/blood-donors/[id] — set verification_status
 *   (verified/suspended/rejected/pending — matches hospitals/
 *   ambulance_services' shared enum; see BLOOD-SERVICE-PLAN.md
 *   login-gate follow-up for why is_active was replaced with this)
 * DELETE — soft-delete (spam/fake)
 * Gate: admin (requireRoleApi — see its comment for why not requireRole here)
 */
const VALID_STATUSES = new Set(['pending', 'verified', 'rejected', 'suspended']);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireRoleApi('admin');
  if ('error' in gate) return gate.error;
  const session = gate.session;
  const body = (await request.json()) as { verification_status?: string };
  if (typeof body.verification_status !== 'string' || !VALID_STATUSES.has(body.verification_status)) {
    return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('blood_donors').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'রক্তদাতা পাওয়া যায়নি' }, { status: 404 });

  const { error } = await supabase.from('blood_donors').update({ verification_status: body.verification_status } as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'blood_donor', params.id, { before: existing, after: { verification_status: body.verification_status } });
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
