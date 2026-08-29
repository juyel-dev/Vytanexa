import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { BloodManager } from '@/components/blood/BloodManager';

export const dynamic = 'force-dynamic';

export default async function BloodPage() {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const [{ data: donors }, { data: locations }, { data: hospitals }, { data: inventories }] = await Promise.all([
    supabase.from('blood_donors').select('id, name, blood_group, location_id, last_donated_at, is_active, phone').is('deleted_at', null).order('created_at', { ascending: false }).limit(200),
    supabase.from('locations').select('id, name_translations, slug').is('deleted_at', null).order('display_order').limit(500),
    supabase.from('hospitals').select('id, name_translations, slug, facility_tags').is('deleted_at', null).contains('facility_tags', ['blood_bank']).limit(100),
    supabase.from('blood_bank_inventory').select('hospital_id, blood_group, stock_level, reported_at'),
  ]);

  const locMap = new Map<string, string>();
  for (const l of locations ?? []) {
    const t = (l as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
    locMap.set((l as { id: string }).id, (t?.bn || t?.en || (l as { slug: string }).slug) as string);
  }

  const enrichedDonors = (donors ?? []).map((d) => ({
    ...(d as object),
    location_name: locMap.get((d as { location_id: string }).location_id) ?? '—',
  }));

  const invByHosp = new Map<string, { blood_group: string; stock_level: string; reported_at: string }[]>();
  for (const inv of inventories ?? []) {
    const hid = (inv as { hospital_id: string }).hospital_id;
    const list = invByHosp.get(hid) ?? [];
    list.push(inv as never);
    invByHosp.set(hid, list);
  }

  const enrichedHospitals = (hospitals ?? []).map((h) => {
    const t = (h as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
    return {
      id: (h as { id: string }).id,
      name: (t?.bn || t?.en || (h as { slug: string }).slug) as string,
      inventory: invByHosp.get((h as { id: string }).id) ?? [],
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-admin-h1 text-neutral-900">রক্তদাতা ও ব্লাড ব্যাংক</h1>
      <BloodManager donors={enrichedDonors as never} hospitals={enrichedHospitals as never} locations={(locations ?? []) as never} />
    </div>
  );
}
