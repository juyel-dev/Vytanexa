import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { HospitalForm } from '@/components/hospitals/HospitalForm';

export const dynamic = 'force-dynamic';

export default async function EditHospitalPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const [{ data: hospital }, { data: locations }, { data: testCatalog }] = await Promise.all([
    supabase.from('hospitals').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle(),
    supabase.from('locations').select('id, name_translations, slug').is('deleted_at', null).order('display_order').limit(500),
    supabase.from('test_catalog').select('canonical_key, name_translations').eq('is_active', true).order('display_order').limit(200),
  ]);
  if (!hospital) notFound();
  const h = hospital as {
    id: string; name_translations: { bn?: string; en?: string; hi?: string } | null; slug: string; type: string; cover_image_url: string | null; gallery_images: string[]; location_id: string; address_line: string; latitude: number | null; longitude: number | null; map_link: string | null; phone: string; whatsapp_number: string | null; description_translations: { bn?: string; en?: string; hi?: string } | null; services: string[]; facility_tags: string[]; has_emergency_dept: boolean; operating_hours: { is_24x7?: boolean; schedule?: { day: string; open: string; close: string }[] } | null; verification_status: string; is_featured: boolean; is_trending: boolean; featured_priority: number;
  };
  const initial = {
    id: h.id,
    name_translations: h.name_translations,
    slug: h.slug,
    type: h.type,
    cover_image_url: h.cover_image_url,
    gallery_images: h.gallery_images ?? [],
    location_id: h.location_id,
    address_line: h.address_line,
    latitude: h.latitude,
    longitude: h.longitude,
    map_link: h.map_link,
    phone: h.phone,
    whatsapp_number: h.whatsapp_number,
    description_translations: h.description_translations,
    services: h.services ?? [],
    facility_tags: h.facility_tags ?? [],
    has_emergency_dept: h.has_emergency_dept,
    operating_hours: h.operating_hours,
    verification_status: h.verification_status,
    is_featured: h.is_featured,
    is_trending: h.is_trending,
    featured_priority: h.featured_priority,
  };
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-admin-h1 text-neutral-900">হাসপাতাল সম্পাদনা: {(h.name_translations?.bn || h.slug) as string}</h1>
      <div className="mt-4"><HospitalForm mode="edit" initial={initial as never} locations={(locations ?? []) as never} testCatalog={(testCatalog ?? []) as never} /></div>
    </div>
  );
}
