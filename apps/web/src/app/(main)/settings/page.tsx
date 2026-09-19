import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { SettingsClient } from '@/components/settings/SettingsClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('settings');
  return { title: `${t('title')} | Vytanexa` };
}

const DEFAULT_PREFS = { general: true, emergency: true, articles: true };

/** Settings — VYTANEXA-BLUEPRINT.md § S18. Not auth-gated: language/location/privacy work for guests too. */
export default async function SettingsPage() {
  const supabase = createClient();
  const [currentUser, t] = await Promise.all([getCurrentUser(supabase), getT('settings')]);

  return (
    <>
      <TopBarSection title={t('title')} backHref="/more" />
      <SettingsClient
        isSignedIn={!!currentUser}
        initialLanguage={currentUser?.profile.preferred_language ?? 'bn'}
        initialPrefs={
          (currentUser?.profile.notification_prefs as typeof DEFAULT_PREFS) ?? DEFAULT_PREFS
        }
      />
    </>
  );
}
