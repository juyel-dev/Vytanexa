import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { queryQuestionList, getDoctorAnsweredQuestionIds } from '@/lib/queries/qa-list';
import { getQACategories } from '@/lib/queries/qa-detail';
import { QAListClient } from '@/components/qa/QAListClient';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('qa');
  return {
    title: `${t('heading')} | Vytanexa`,
    description: t('metaDescription'),
  };
}

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

  const [{ data: questions, count, error }, categories] = await Promise.all([
    queryQuestionList(supabase, {
      filter: (['answered', 'unanswered'] as const).find((f) => f === searchParams.filter) ?? 'all',
      page: 0,
    }),
    getQACategories(supabase),
  ]);

  if (error) console.error('qa SSR query failed:', error.message);

  const doctorAnsweredIds = await getDoctorAnsweredQuestionIds(
    supabase,
    questions.map((q) => q.id)
  );

  return (
    <QAListClient
      initialQuestions={questions}
      initialCount={count}
      loadError={Boolean(error)}
      doctorAnsweredIds={doctorAnsweredIds}
      categories={categories}
    />
  );
}
