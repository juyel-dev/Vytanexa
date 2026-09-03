import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { HospitalForm } from '@/components/hospitals/HospitalForm';

export const dynamic = 'force-dynamic';

export default async function NewHospitalPage() {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const [{ data: locations }, { data: testCatalog }] = await Promise.all([
    supabase.from('locations').select('id, parent_id, type, name_translations, slug').is('deleted_at', null).order('display_order').limit(500),
    supabase.from('test_catalog').select('canonical_key, name_translations').eq('is_active', true).order('display_order').limit(200),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-admin-h1 text-neutral-900">নতুন হাসপাতাল যোগ করুন</h1>
      <p className="mt-1 text-admin-body text-neutral-500">মৌলিক তথ্য ভরুন — সেবা/সুবিধা পরে যোগ করা যাবে।</p>
      <div className="mt-4"><HospitalForm mode="create" locations={(locations ?? []) as never} testCatalog={(testCatalog ?? []) as never} /></div>
    </div>
  );
}
