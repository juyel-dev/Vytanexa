import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { PollsClient } from '@/components/polls/PollsClient';
import { createClient } from '@/lib/supabase/server';
import { getActivePolls } from '@/lib/queries/polls';
import { isFeatureEnabled } from '@/lib/feature-flags';

export const metadata: Metadata = {
  title: 'স্বাস্থ্য জরিপ | Vytanexa',
  description: 'স্বাস্থ্য বিষয়ক জরিপে অংশ নিন এবং কমিউনিটির মতামত দেখুন।',
};

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

  const polls = await getActivePolls(supabase);

  return (
    <>
      <TopBarSection title="স্বাস্থ্য জরিপ" />
      <PollsClient polls={polls} />
    </>
  );
}
