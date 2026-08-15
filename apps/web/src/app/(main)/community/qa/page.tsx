import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { queryQuestionList, getDoctorAnsweredQuestionIds } from '@/lib/queries/qa-list';
import { getQACategories } from '@/lib/queries/qa-detail';
import { QAListClient } from '@/components/qa/QAListClient';

export const metadata: Metadata = {
  title: 'প্রশ্নোত্তর | Vytanexa',
  description: 'স্বাস্থ্য বিষয়ক প্রশ্ন করুন, ডাক্তার ও কমিউনিটি থেকে উত্তর পান।',
};

/**
 * Q&A List Page — VYTANEXA-BLUEPRINT.md § S14 "Feature Flag Gate":
 * "Entire module gated behind app_settings.features.community_qa —
 * if disabled, all routes 404 gracefully." Checked here at the page
 * level (not just hidden in nav) so the route is genuinely
 * unreachable, not just unlinked.
 */
export default async function QAPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    notFound();
  }

  const [{ data: questions, count }, categories] = await Promise.all([
    queryQuestionList(supabase, {
      filter: (searchParams.filter as 'all' | 'answered' | 'unanswered') ?? 'all',
      page: 0,
    }),
    getQACategories(supabase),
  ]);

  const doctorAnsweredIds = await getDoctorAnsweredQuestionIds(
    supabase,
    questions.map((q) => q.id)
  );

  return (
    <QAListClient
      initialQuestions={questions}
      initialCount={count}
      doctorAnsweredIds={doctorAnsweredIds}
      categories={categories}
    />
  );
}
