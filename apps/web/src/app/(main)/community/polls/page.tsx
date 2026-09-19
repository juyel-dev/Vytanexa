import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { PollsClient } from '@/components/polls/PollsClient';
import { createClient } from '@/lib/supabase/server';
import { getActivePolls } from '@/lib/queries/polls';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('polls');
  return {
    title: `${t('title')} | Vytanexa`,
    description: t('metaDescription'),
  };
}

/**
 * Polls List Page — gated behind `app_settings.features.polls`, same
 * pattern as S14 Q&A's `community_qa` gate (checked at the page level
 * so the route is genuinely unreachable when disabled, not just
 * unlinked from nav — see MorePageClient's `showPolls`).
 */
export default async function PollsPage() {
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'polls'))) {
    notFound();
  }

  const [polls, t] = await Promise.all([getActivePolls(supabase), getT('polls')]);

  return (
    <>
      <TopBarSection title={t('title')} />
      <PollsClient polls={polls} />
    </>
  );
}
