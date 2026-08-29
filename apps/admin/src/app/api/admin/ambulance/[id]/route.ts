import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { ambulanceUpdateSchema } from '@/lib/validations/ambulance';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = ambulanceUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('ambulance_services').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'অ্যাম্বুলেন্স পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.name_translations !== undefined) updates.name_translations = body.name_translations;
  if (body.location_id !== undefined) {
    const { data: loc } = await supabase.from('locations').select('id').eq('id', body.location_id).is('deleted_at', null).maybeSingle();
    if (!loc) return NextResponse.json({ error: 'এলাকা খুঁজে পাওয়া যায়নি' }, { status: 400 });
    updates.location_id = body.location_id;
  }
  if (body.phone !== undefined) updates.phone = body.phone.trim();
  if (body.whatsapp_number !== undefined) updates.whatsapp_number = body.whatsapp_number || null;
  if (body.hospital_id !== undefined) {
    if (body.hospital_id) {
      const { data: hosp } = await supabase.from('hospitals').select('id').eq('id', body.hospital_id).is('deleted_at', null).maybeSingle();
      if (!hosp) return NextResponse.json({ error: 'হাসপাতাল খুঁজে পাওয়া যায়নি' }, { status: 400 });
    }
    updates.hospital_id = body.hospital_id ?? null;
  }
  if (body.vehicle_count !== undefined) updates.vehicle_count = body.vehicle_count ?? null;
  if (body.is_icu_equipped !== undefined) updates.is_icu_equipped = body.is_icu_equipped;
  if (body.per_km_rate !== undefined) updates.per_km_rate = body.per_km_rate ?? null;
  if (body.coverage_radius_km !== undefined) updates.coverage_radius_km = body.coverage_radius_km ?? null;
  if (body.is_24x7 !== undefined) updates.is_24x7 = body.is_24x7;
  if (body.verification_status !== undefined) updates.verification_status = body.verification_status;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('ambulance_services').update(updates as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  const { data: updated } = await supabase.from('ambulance_services').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'ambulance', id, { before: existing, after: updated });
  return NextResponse.json({ ambulance: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;
  const { data: existing } = await supabase.from('ambulance_services').select('id').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'অ্যাম্বুলেন্স পাওয়া যায়নি' }, { status: 404 });
  const { error } = await supabase.from('ambulance_services').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });
  await writeAudit(supabase, session.id, 'delete', 'ambulance', id, { before: existing });
  return NextResponse.json({ ok: true });
}
