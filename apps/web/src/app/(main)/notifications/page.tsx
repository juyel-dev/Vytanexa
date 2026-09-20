import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { NotificationsClient } from '@/components/notifications/NotificationsClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getNotifications, getReadNotificationIds } from '@/lib/queries/notifications';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('common');
  return { title: `${t('notifications')} | Vytanexa` };
}

/** Notifications — VYTANEXA-BLUEPRINT.md § S20 (`/notifications`). Works for guests and signed-in users both. */
export default async function NotificationsPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);
  const t = await getT('common');

  const [notifications, readIds] = await Promise.all([
    getNotifications(supabase),
    currentUser ? getReadNotificationIds(supabase, currentUser.authUser.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <TopBarSection title={t('notifications')} backHref="/more" />
      <NotificationsClient
        notifications={notifications}
        initialReadIds={readIds}
        isSignedIn={!!currentUser}
      />
    </>
  );
}
