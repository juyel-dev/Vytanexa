import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { subscriptionCreateSchema } from '@/lib/validations/subscriptions';

/**
 * POST /api/admin/subscriptions — manual assignment (A12). super_admin only.
 * Handles one live subscription per entity (uq_subs_one_active).
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = subscriptionCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  // validate entity exists
  if (body.entity_type === 'doctor') {
    const { data: doc } = await supabase.from('doctors').select('id').eq('id', body.entity_id).is('deleted_at', null).maybeSingle();
    if (!doc) return NextResponse.json({ error: 'ডাক্তার পাওয়া যায়নি' }, { status: 400 });
  } else {
    const { data: hosp } = await supabase.from('hospitals').select('id').eq('id', body.entity_id).is('deleted_at', null).maybeSingle();
    if (!hosp) return NextResponse.json({ error: 'হাসপাতাল পাওয়া যায়নি' }, { status: 400 });
  }

  const { data: plan } = await supabase.from('subscription_plans').select('id').eq('id', body.plan_id).maybeSingle();
  if (!plan) return NextResponse.json({ error: 'প্ল্যান পাওয়া যায়নি' }, { status: 400 });

  // check one active per entity — if exists, expire it first? For manual grant, we replace
  const { data: existingActive } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('entity_type', body.entity_type)
    .eq('entity_id', body.entity_id)
    .in('status', ['active', 'trial'])
    .maybeSingle();

  if (existingActive) {
    // cancel previous
    await supabase.from('subscriptions').update({ status: 'cancelled' } as never).eq('id', (existingActive as { id: string }).id);
  }

  const { data: created, error } = await supabase
    .from('subscriptions')
    .insert({
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      plan_id: body.plan_id,
      status: body.status ?? 'active',
      expires_at: body.expires_at ? (body.expires_at as Date).toISOString() : null,
      auto_renew: body.auto_renew ?? false,
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'সাবস্ক্রিপশন তৈরি করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });
  await writeAudit(supabase, session.id, 'create', 'subscription', (created as { id: string }).id, { after: created });
  return NextResponse.json({ subscription: created }, { status: 201 });
}
