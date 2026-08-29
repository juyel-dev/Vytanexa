import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { LocationsManager } from '@/components/locations/LocationsManager';

export const dynamic = 'force-dynamic';

/**
 * Locations Manager page — ADMIN-PANEL-SPEC.md § A04.
 * Server component: guards with requireAdmin() and fetches the full
 * location tree via service-role (bypasses RLS — admin sees everything).
 * Client tree interactivity (expand/collapse, search, modal) lives in
 * <LocationsManager>.
 */
export default async function LocationsPage() {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('locations')
    .select('id, parent_id, type, name_translations, slug, latitude, longitude, display_order, is_active')
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('slug', { ascending: true })
    .limit(10000);

  if (error) {
    return (
      <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-6 text-admin-body text-emergency-700">
        এলাকা লোড করা যায়নি: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">এলাকা ম্যানেজমেন্ট</h1>
        <p className="mt-1 text-admin-body text-neutral-500">
          State → District → Sub-district — SEO URL (S21) ও Location Picker (S02/S03) এই গাছ থেকেই আসে। ফাঁকা পাতা ছাড়া কোনো এলাকা মোছা যায় না।
        </p>
      </div>
      <LocationsManager initialLocations={(data ?? []) as never} />
    </div>
  );
}
