import { requireRole } from '@/lib/supabase/auth-verify';
import { getAppSettings } from '@/lib/app-settings';
import { FeatureFlags } from '@/components/god-mode/FeatureFlags';

export const dynamic = 'force-dynamic';

export default async function GodFlagsPage() {
  await requireRole('super_admin');
  const settings = await getAppSettings();
  const features = (settings as { features?: Record<string, boolean> } | null)?.features ?? null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">ফিচার ফ্ল্যাগ</h1>
        <p className="mt-1 text-admin-body text-neutral-500">প্রতিটি টগল = <code className="rounded bg-neutral-100 px-1">app_settings.features</code> JSONB-এ একটি key — super_admin। বন্ধ করলে কন্টেন্ট মুছবে না, শুধু লুকাবে।</p>
      </div>
      <FeatureFlags initialFeatures={features} />
    </div>
  );
}
