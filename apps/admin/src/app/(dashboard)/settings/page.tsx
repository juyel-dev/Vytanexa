import { requireRole } from '@/lib/supabase/auth-verify';
import { getAppSettings } from '@/lib/app-settings';
import { SettingsForm } from '@/components/settings/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireRole('super_admin');
  const settings = await getAppSettings();
  const s = settings as unknown as {
    app_name: string;
    default_locale: string;
    supported_locales: string[];
    seo_defaults: { title?: string; description?: string; og_image?: string } | null;
  } | null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">সেটিংস</h1>
        <p className="mt-1 text-admin-body text-neutral-500">অ্যাপের নাম, ভাষা, SEO ডিফল্ট — বাকি সেটিংস God Mode-এ। super_admin।</p>
      </div>
      <SettingsForm
        initial={{
          app_name: s?.app_name ?? 'Vytanexa',
          default_locale: s?.default_locale ?? 'bn',
          supported_locales: s?.supported_locales ?? ['bn', 'en', 'hi'],
          seo_defaults: s?.seo_defaults ?? { title: '', description: '' },
        }}
      />
    </div>
  );
}
