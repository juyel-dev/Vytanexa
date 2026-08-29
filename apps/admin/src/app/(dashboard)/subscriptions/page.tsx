import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { SubscriptionsManager } from '@/components/subscriptions/SubscriptionsManager';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireRole('super_admin');
  const supabase = createServiceRoleClient();
  const tab = searchParams.tab === 'entities' ? 'entities' : 'plans';

  const [{ data: plans }, { data: subs }] = await Promise.all([
    supabase.from('subscription_plans').select('id, tier, name_translations, applies_to, price_monthly, price_yearly, benefits, is_active').order('price_monthly'),
    supabase.from('subscriptions').select('id, entity_type, entity_id, plan_id, status, expires_at, created_at, subscription_plans(tier, name_translations)').order('created_at', { ascending: false }).limit(100),
  ]);

  // enrich subscriptions with entity names
  const doctorIds = (subs ?? []).filter((s) => (s as { entity_type: string }).entity_type === 'doctor').map((s) => (s as { entity_id: string }).entity_id);
  const hospitalIds = (subs ?? []).filter((s) => (s as { entity_type: string }).entity_type === 'hospital').map((s) => (s as { entity_id: string }).entity_id);
  const nameMap = new Map<string, string>();
  if (doctorIds.length > 0) {
    const { data: docs } = await supabase.from('doctors').select('id, name_translations, slug').in('id', doctorIds);
    for (const d of docs ?? []) {
      const t = (d as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
      nameMap.set((d as { id: string }).id, (t?.bn || t?.en || (d as { slug: string }).slug) as string);
    }
  }
  if (hospitalIds.length > 0) {
    const { data: hosps } = await supabase.from('hospitals').select('id, name_translations, slug').in('id', hospitalIds);
    for (const h of hosps ?? []) {
      const t = (h as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
      nameMap.set((h as { id: string }).id, (t?.bn || t?.en || (h as { slug: string }).slug) as string);
    }
  }

  const enrichedSubs = (subs ?? []).map((s) => ({
    ...(s as object),
    entity_name: nameMap.get((s as { entity_id: string }).entity_id) ?? (s as { entity_id: string }).entity_id.slice(0, 8),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">সাবস্ক্রিপশন</h1>
        <p className="mt-1 text-admin-body text-neutral-500">প্ল্যান ও সক্রিয় সাবস্ক্রিপশন — super_admin।</p>
      </div>
      <SubscriptionsManager plans={(plans ?? []) as never} subscriptions={enrichedSubs as never} tab={tab} />
    </div>
  );
}
