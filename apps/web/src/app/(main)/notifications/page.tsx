import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { NotificationsClient } from '@/components/notifications/NotificationsClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getNotifications, getReadNotificationIds } from '@/lib/queries/notifications';

export const metadata: Metadata = { title: 'নোটিফিকেশন | Vytanexa' };

/** Notifications — VYTANEXA-BLUEPRINT.md § S20 (`/notifications`). Works for guests and signed-in users both. */
export default async function NotificationsPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);

  const [notifications, readIds] = await Promise.all([
    getNotifications(supabase),
    currentUser ? getReadNotificationIds(supabase, currentUser.authUser.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <TopBarSection title="নোটিফিকেশন" backHref="/more" />
      <NotificationsClient
        notifications={notifications}
        initialReadIds={readIds}
        isSignedIn={!!currentUser}
      />
    </>
  );
}
