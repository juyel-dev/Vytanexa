import { requireRole } from '@/lib/supabase/auth-verify';
import { getAppSettings } from '@/lib/app-settings';
import { ThemeEditor } from '@/components/god-mode/ThemeEditor';

export const dynamic = 'force-dynamic';

/**
 * A07 Theme Editor — super_admin only.
 * Reads app_settings.theme_colors + logo/favicons, renders swatch+hex + contrast check.
 */
export default async function GodThemePage() {
  await requireRole('super_admin');
  const settings = await getAppSettings();
  const theme = (settings?.theme_colors as Record<string, string> | null) ?? null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">থিম এডিটর</h1>
        <p className="mt-1 text-admin-body text-neutral-500">শুধু ৪টি brand token — পরিবর্তন প্রকাশ করলে পরবর্তী পেজ লোডে কার্যকর। super_admin-এর জন্য।</p>
      </div>
      <ThemeEditor initialTheme={theme} initialLogo={(settings as { logo_url?: string | null } | null)?.logo_url ?? null} initialFavicon={(settings as { favicon_url?: string | null } | null)?.favicon_url ?? null} />
    </div>
  );
}
