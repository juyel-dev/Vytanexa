import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getQuestionById, getAnswers } from '@/lib/queries/qa-detail';
import { QuestionDetailClient } from '@/components/qa/QuestionDetailClient';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = createClient();
  const [featureEnabled, tCommon, tQa] = await Promise.all([
    isFeatureEnabled(supabase, 'community_qa'),
    getT('common'),
    getT('qa'),
  ]);
  if (!featureEnabled) {
    return { title: tCommon('notFoundTitle') };
  }
  const question = await getQuestionById(supabase, params.id);
  if (!question) return { title: tQa('notFoundTitle') };
  return {
    title: `${question.title}${tQa('metaTitleSuffix')}`,
    description: question.body ?? question.title,
  };
}

export default async function QuestionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    notFound();
  }

  const question = await getQuestionById(supabase, params.id);
  if (!question) notFound();

  const { doctorAnswers, communityAnswers } = await getAnswers(supabase, question.id);

  return (
    <QuestionDetailClient
      question={question}
      doctorAnswers={doctorAnswers}
      communityAnswers={communityAnswers}
    />
  );
}
