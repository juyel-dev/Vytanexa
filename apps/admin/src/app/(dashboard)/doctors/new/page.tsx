import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { DoctorForm } from '@/components/doctors/DoctorForm';

export const dynamic = 'force-dynamic';

/**
 * Create Doctor — A05. Server fetches dropdown data.
 */
export default async function NewDoctorPage() {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const [{ data: categories }, { data: locations }] = await Promise.all([
    supabase.from('categories').select('id, name_translations, slug').is('deleted_at', null).order('display_order').limit(200),
    supabase.from('locations').select('id, name_translations, slug').is('deleted_at', null).order('display_order').limit(500),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-admin-h1 text-neutral-900">নতুন ডাক্তার যোগ করুন</h1>
      <p className="mt-1 text-admin-body text-neutral-500">মৌলিক তথ্য ভরুন — চেম্বার পরে যোগ করা যাবে, খসড়া হিসেবে সংরক্ষণ করলে পাবলিক অ্যাপে দেখাবে না।</p>
      <div className="mt-4">
        <DoctorForm mode="create" categories={(categories ?? []) as never} locations={(locations ?? []) as never} />
      </div>
    </div>
  );
}
