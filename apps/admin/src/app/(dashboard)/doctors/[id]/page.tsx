import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { DoctorForm } from '@/components/doctors/DoctorForm';

export const dynamic = 'force-dynamic';

/**
 * Edit Doctor — A05. Fetches doctor + chambers.
 */
export default async function EditDoctorPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const [{ data: doctor }, { data: categories }, { data: locations }] = await Promise.all([
    supabase.from('doctors').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle(),
    supabase.from('categories').select('id, name_translations, slug').is('deleted_at', null).order('display_order').limit(200),
    supabase.from('locations').select('id, parent_id, type, name_translations, slug').is('deleted_at', null).order('display_order').limit(500),
  ]);

  if (!doctor) notFound();

  const { data: chambers } = await supabase
    .from('chambers')
    .select('id, chamber_name, location_id, address_line, phone, whatsapp_number, map_link, latitude, longitude, consultation_fee, schedule, is_primary, display_order, is_active')
    .eq('doctor_id', params.id)
    .is('deleted_at', null)
    .order('display_order');

  const initial = {
    id: (doctor as { id: string }).id,
    name_translations: (doctor as { name_translations: unknown }).name_translations as { bn?: string; en?: string; hi?: string } | null,
    slug: (doctor as { slug: string }).slug,
    photo_url: (doctor as { photo_url: string | null }).photo_url,
    category_id: (doctor as { category_id: string }).category_id,
    degree: (doctor as { degree: string[] }).degree ?? [],
    bmdc_registration_no: (doctor as { bmdc_registration_no: string | null }).bmdc_registration_no,
    experience_years: (doctor as { experience_years: number }).experience_years ?? 0,
    bio_translations: (doctor as { bio_translations: unknown }).bio_translations as { bn?: string; en?: string; hi?: string } | null,
    expertise_tags: (doctor as { expertise_tags: string[] }).expertise_tags ?? [],
    treats_conditions: (doctor as { treats_conditions: string[] }).treats_conditions ?? [],
    languages: (doctor as { languages: string[] }).languages ?? ['bn'],
    search_aliases: (doctor as { search_aliases: string[] }).search_aliases ?? [],
    consultation_fee_min: (doctor as { consultation_fee_min: number | null }).consultation_fee_min,
    consultation_fee_max: (doctor as { consultation_fee_max: number | null }).consultation_fee_max,
    whatsapp_number: (doctor as { whatsapp_number: string | null }).whatsapp_number,
    verification_status: (doctor as { verification_status: string }).verification_status ?? 'pending',
    is_available: (doctor as { is_available: boolean }).is_available ?? true,
    is_featured: (doctor as { is_featured: boolean }).is_featured ?? false,
    featured_priority: (doctor as { featured_priority: number }).featured_priority ?? 0,
    chambers: (chambers ?? []).map((c) => ({
      id: (c as { id: string }).id,
      chamber_name: (c as { chamber_name: string }).chamber_name,
      location_id: (c as { location_id: string }).location_id,
      address_line: (c as { address_line: string }).address_line,
      phone: (c as { phone: string }).phone,
      whatsapp_number: (c as { whatsapp_number: string | null }).whatsapp_number ?? '',
      map_link: (c as { map_link: string | null }).map_link ?? '',
      latitude: (c as { latitude: number | null }).latitude != null ? String((c as { latitude: number }).latitude) : '',
      longitude: (c as { longitude: number | null }).longitude != null ? String((c as { longitude: number }).longitude) : '',
      consultation_fee: (c as { consultation_fee: number | null }).consultation_fee != null ? String((c as { consultation_fee: number }).consultation_fee) : '',
      schedule: ((c as { schedule: unknown }).schedule as { day: 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri'; open: string; close: string }[]) ?? [],
      is_primary: (c as { is_primary: boolean }).is_primary ?? false,
      is_active: (c as { is_active: boolean }).is_active ?? true,
    })),
  };

  const t = initial.name_translations as { bn?: string } | null;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-admin-h1 text-neutral-900">ডাক্তার সম্পাদনা: {(t?.bn || initial.slug) as string}</h1>
      <p className="mt-1 text-admin-body text-neutral-500">সব সেকশন খুলে এডিট করুন — সংরক্ষণের পর তালিকায় ফিরে যাবেন।</p>
      <div className="mt-4">
        <DoctorForm mode="edit" initial={initial as never} categories={(categories ?? []) as never} locations={(locations ?? []) as never} />
      </div>
    </div>
  );
}
