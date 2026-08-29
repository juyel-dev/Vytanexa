import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { ambulanceCreateSchema } from '@/lib/validations/ambulance';

/**
 * POST /api/admin/ambulance — create ambulance service (A06).
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = ambulanceCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: loc } = await supabase.from('locations').select('id').eq('id', body.location_id).is('deleted_at', null).maybeSingle();
  if (!loc) return NextResponse.json({ error: 'এলাকা খুঁজে পাওয়া যায়নি' }, { status: 400 });

  if (body.hospital_id) {
    const { data: hosp } = await supabase.from('hospitals').select('id').eq('id', body.hospital_id).is('deleted_at', null).maybeSingle();
    if (!hosp) return NextResponse.json({ error: 'হাসপাতাল খুঁজে পাওয়া যায়নি' }, { status: 400 });
  }

  const { data: created, error } = await supabase
    .from('ambulance_services')
    .insert({
      name_translations: body.name_translations,
      location_id: body.location_id,
      phone: body.phone.trim(),
      whatsapp_number: body.whatsapp_number || null,
      hospital_id: body.hospital_id ?? null,
      vehicle_count: body.vehicle_count ?? null,
      is_icu_equipped: body.is_icu_equipped ?? false,
      per_km_rate: body.per_km_rate ?? null,
      coverage_radius_km: body.coverage_radius_km ?? null,
      is_24x7: body.is_24x7 ?? true,
      verification_status: body.verification_status ?? 'pending',
      is_active: body.is_active ?? true,
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'অ্যাম্বুলেন্স সংরক্ষণ করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });

  await writeAudit(supabase, session.id, 'create', 'ambulance', (created as { id: string }).id, { after: created });
  return NextResponse.json({ ambulance: created }, { status: 201 });
}
