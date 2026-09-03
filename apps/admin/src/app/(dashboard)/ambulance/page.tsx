import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AmbulanceManager } from '@/components/ambulance/AmbulanceManager';

export const dynamic = 'force-dynamic';

export default async function AmbulancePage() {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const [{ data: ambulances }, { data: locations }, { data: hospitals }] = await Promise.all([
    supabase.from('ambulance_services').select('id, name_translations, location_id, phone, whatsapp_number, hospital_id, vehicle_count, is_icu_equipped, per_km_rate, coverage_radius_km, is_24x7, verification_status, is_active').is('deleted_at', null).order('created_at', { ascending: false }).limit(200),
    supabase.from('locations').select('id, parent_id, type, name_translations, slug').is('deleted_at', null).order('display_order').limit(500),
    supabase.from('hospitals').select('id, name_translations, slug').is('deleted_at', null).order('display_order').limit(200),
  ]);

  // resolve location/hospital names for display
  const locMap = new Map<string, string>();
  for (const l of locations ?? []) {
    const t = (l as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
    locMap.set((l as { id: string }).id, (t?.bn || t?.en || (l as { slug: string }).slug) as string);
  }
  const hospMap = new Map<string, string>();
  for (const h of hospitals ?? []) {
    const t = (h as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
    hospMap.set((h as { id: string }).id, (t?.bn || t?.en || (h as { slug: string }).slug) as string);
  }

  const enriched = (ambulances ?? []).map((a) => ({
    ...(a as object),
    location_name: locMap.get((a as { location_id: string }).location_id) ?? '—',
    hospital_name: (a as { hospital_id: string | null }).hospital_id ? (hospMap.get((a as { hospital_id: string }).hospital_id) ?? '—') : '—',
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-admin-h1 text-neutral-900">অ্যাম্বুলেন্স</h1>
      <AmbulanceManager ambulances={enriched as never} locations={(locations ?? []) as never} hospitals={(hospitals ?? []) as never} />
    </div>
  );
}
