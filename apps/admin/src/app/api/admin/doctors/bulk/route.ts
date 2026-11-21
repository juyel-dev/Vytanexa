import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * POST /api/admin/doctors/bulk — bulk actions (A05 Bulk select → bar).
 * Body: { ids: string[], action: 'verify'|'suspend'|'reject'|'feature'|'unfeature' }
 * Gate: admin/super_admin.
 *
 * Safety (verify): `verified` makes a doctor publicly visible (RLS), so a bulk
 * verify is limited to VERIFY_BULK_MAX doctors per call and every doctor must
 * already have a registration number on file. The audit row stores the
 * before-state of every affected doctor so a mistaken bulk action can be
 * reverted from the audit log.
 */
const VERIFY_BULK_MAX = 25;

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['verify', 'suspend', 'reject', 'feature', 'unfeature']),
});

export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });
  const { ids, action } = parsed.data;
  const supabase = createServiceRoleClient();

  // verify all exist (and capture the before-state for the audit log)
  const { data: existing } = await supabase
    .from('doctors')
    .select('id, verification_status, is_featured, bmdc_registration_no')
    .in('id', ids)
    .is('deleted_at', null);
  const rows = existing ?? [];
  const found = new Set(rows.map((r) => r.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) return NextResponse.json({ error: 'কিছু ডাক্তার আর বিদ্যমান নেই — রিফ্রেশ করুন' }, { status: 400 });

  if (action === 'verify') {
    if (ids.length > VERIFY_BULK_MAX) {
      return NextResponse.json(
        { error: `একসাথে সর্বোচ্চ ${VERIFY_BULK_MAX} জন ডাক্তারকে verify করা যায়` },
        { status: 400 }
      );
    }
    const withoutRegistration = rows.filter((r) => !r.bmdc_registration_no?.trim());
    if (withoutRegistration.length) {
      return NextResponse.json(
        {
          error: 'রেজিস্ট্রেশন নম্বর ছাড়া ডাক্তারকে verify করা যায় না',
          ids: withoutRegistration.map((r) => r.id),
        },
        { status: 400 }
      );
    }
  }

  let updates: Record<string, unknown> = {};
  let auditAction: 'update' | 'publish' = 'update';
  switch (action) {
    case 'verify':
      updates = { verification_status: 'verified' };
      auditAction = 'publish';
      break;
    case 'suspend':
      updates = { verification_status: 'suspended' };
      break;
    case 'reject':
      updates = { verification_status: 'rejected' };
      break;
    case 'feature':
      updates = { is_featured: true };
      break;
    case 'unfeature':
      updates = { is_featured: false };
      break;
  }

  const { error } = await supabase.from('doctors').update(updates as never).in('id', ids);
  if (error) return NextResponse.json({ error: 'বাল্ক অ্যাকশন করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, auditAction, 'doctor_bulk', null, {
    before: rows.map((r) => ({
      id: r.id,
      verification_status: r.verification_status,
      is_featured: r.is_featured,
    })),
    after: { ids, action },
  });

  return NextResponse.json({ ok: true, updated: ids.length });
}
