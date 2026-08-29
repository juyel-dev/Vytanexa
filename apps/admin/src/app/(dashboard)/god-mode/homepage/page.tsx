import { requireRole } from '@/lib/supabase/auth-verify';
import { getAppSettings } from '@/lib/app-settings';
import { HomepageControl } from '@/components/god-mode/HomepageControl';

export const dynamic = 'force-dynamic';

/**
 * A07 Homepage Section Control — super_admin only.
 * Reads app_settings.homepage_settings.sections, renders drag reorder + publish.
 */
export default async function GodHomepagePage() {
  await requireRole('super_admin');
  const settings = await getAppSettings();
  const homepage = settings?.homepage_settings as { sections?: { id: string; visible: boolean; order: number }[] } | null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">হোমপেজ সেকশন কন্ট্রোল</h1>
        <p className="mt-1 text-admin-body text-neutral-500">বামে সাজান → প্রকাশ করুন — সাথে সাথে লাইভে যাবে। এই স্ক্রিন super_admin-এর জন্য।</p>
      </div>
      <HomepageControl initialSections={homepage?.sections ?? null} />
    </div>
  );
}
