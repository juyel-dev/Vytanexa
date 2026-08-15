import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getQuestionById, getAnswers } from '@/lib/queries/qa-detail';
import { QuestionDetailClient } from '@/components/qa/QuestionDetailClient';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = createClient();
  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    return { title: 'পাওয়া যায়নি | Vytanexa' };
  }
  const question = await getQuestionById(supabase, params.id);
  if (!question) return { title: 'প্রশ্ন পাওয়া যায়নি | Vytanexa' };
  return {
    title: `${question.title} | Vytanexa প্রশ্নোত্তর`,
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
