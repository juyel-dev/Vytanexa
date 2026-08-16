import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { MorePageClient } from '@/components/more/MorePageClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getMenuCustomPages, hasUnreadNotifications } from '@/lib/queries/more-page';
import { isFeatureEnabled } from '@/lib/feature-flags';

export const metadata: Metadata = {
  title: 'আরো | Vytanexa',
};

/**
 * More Page — VYTANEXA-BLUEPRINT.md § S16 (`/more`). Server Component
 * resolves everything MorePageClient needs to render statelessly
 * (auth state, custom pages, feature flags, notification badge) —
 * the client component itself needs no data fetching of its own.
 */
export default async function MorePage() {
  const supabase = createClient();

  const [currentUser, customPages, showQA] = await Promise.all([
    getCurrentUser(supabase),
    getMenuCustomPages(supabase),
    isFeatureEnabled(supabase, 'community_qa'),
  ]);

  const unread = await hasUnreadNotifications(supabase, currentUser?.authUser.id ?? null);

  return (
    <>
      <TopBarSection title="আরো" backHref="/" />
      <MorePageClient
        currentUser={
          currentUser
            ? { name: currentUser.profile.name, phone: currentUser.profile.phone }
            : null
        }
        customPages={customPages}
        showQA={showQA}
        hasUnreadNotifications={unread}
      />
    </>
  );
}
