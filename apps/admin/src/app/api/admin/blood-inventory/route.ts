import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRoleApi } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { inventorySchema } from '@/lib/validations/blood';

/**
 * POST /api/admin/blood-inventory — upsert stock levels for a hospital.
 * Body: { hospital_id, inventory: [{blood_group, stock_level}] }
 * Gate: admin (requireRoleApi — see auth-verify.ts comment for why not requireRole here)
 * Writes to blood_bank_inventory with UNIQUE(hospital_id, blood_group).
 */
export async function POST(request: Request) {
  const gate = await requireRoleApi('admin');
  if ('error' in gate) return gate.error;
  const session = gate.session;
  const parsed = inventorySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });
  const { hospital_id, inventory } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: hosp } = await supabase.from('hospitals').select('id, facility_tags').eq('id', hospital_id).is('deleted_at', null).maybeSingle();
  if (!hosp) return NextResponse.json({ error: 'হাসপাতাল পাওয়া যায়নি' }, { status: 404 });

  for (const row of inventory) {
    const { error } = await supabase
      .from('blood_bank_inventory')
      .upsert(
        { hospital_id, blood_group: row.blood_group, stock_level: row.stock_level, reported_at: new Date().toISOString() } as never,
        { onConflict: 'hospital_id,blood_group' }
      );
    if (error) return NextResponse.json({ error: 'স্টক আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'update', 'blood_inventory', hospital_id, { after: { inventory } });
  return NextResponse.json({ ok: true });
}
