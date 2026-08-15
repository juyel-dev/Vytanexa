import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { PollsClient } from '@/components/polls/PollsClient';
import { createClient } from '@/lib/supabase/server';
import { getActivePolls } from '@/lib/queries/polls';

export const metadata: Metadata = {
  title: 'স্বাস্থ্য জরিপ | Vytanexa',
  description: 'স্বাস্থ্য বিষয়ক জরিপে অংশ নিন এবং কমিউনিটির মতামত দেখুন।',
};

export default async function PollsPage() {
  const supabase = createClient();
  const polls = await getActivePolls(supabase);

  return (
    <>
      <TopBarSection title="স্বাস্থ্য জরিপ" />
      <PollsClient polls={polls} />
    </>
  );
}
