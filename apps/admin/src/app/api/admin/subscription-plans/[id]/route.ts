import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { planUpdateSchema } from '@/lib/validations/subscriptions';

/**
 * PATCH /api/admin/subscription-plans/[id] — super_admin only.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('super_admin');
  const parsed = planUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('subscription_plans').select('*').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'প্ল্যান পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.name_translations !== undefined) updates.name_translations = body.name_translations;
  if (body.applies_to !== undefined) updates.applies_to = body.applies_to;
  if (body.price_monthly !== undefined) updates.price_monthly = body.price_monthly;
  if (body.price_yearly !== undefined) updates.price_yearly = body.price_yearly ?? null;
  if (body.benefits !== undefined) updates.benefits = body.benefits as never;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('subscription_plans').update(updates as never).eq('id', params.id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  const { data: updated } = await supabase.from('subscription_plans').select('*').eq('id', params.id).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'subscription_plan', params.id, { before: existing, after: updated });
  return NextResponse.json({ plan: updated });
}
