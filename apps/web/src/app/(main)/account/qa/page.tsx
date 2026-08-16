import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getMyQuestions } from '@/lib/queries/account';
import { formatRelativeTimeBn } from '@/lib/i18n';

export const metadata: Metadata = { title: 'আমার প্রশ্ন ও উত্তর | Vytanexa' };

const STATUS_LABELS: Record<string, string> = {
  pending: '🟡 অনুমোদনের অপেক্ষায়',
  approved: '✅ প্রকাশিত',
  rejected: '❌ প্রত্যাখ্যাত',
};

/**
 * My Questions — VYTANEXA-BLUEPRINT.md § S17 "আমার প্রশ্ন ও উত্তর".
 * Uses `questions_own_read` (migration 0014), so this correctly shows
 * a question the user just submitted even before it's approved and
 * visible on the public `/community/qa` list — the moderation status
 * badge here is what tells them why.
 */
export default async function MyQuestionsPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) redirect('/auth/login?returnUrl=/account/qa');

  const questions = await getMyQuestions(supabase, currentUser.authUser.id);

  return (
    <>
      <TopBarSection title="আমার প্রশ্ন ও উত্তর" backHref="/account" />
      <div className="px-4 py-4">
        {questions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="mb-3 text-[13px] text-neutral-400">আপনি এখনো কোনো প্রশ্ন করেননি</p>
            <Link href="/community/qa" className="text-[14px] font-semibold text-brand-600">
              প্রশ্ন করুন →
            </Link>
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="mb-2.5 rounded-lg border border-neutral-200 p-3.5"
            >
              {q.status === 'approved' ? (
                <Link
                  href={`/community/qa/${q.id}`}
                  className="text-[14px] font-semibold text-neutral-900"
                >
                  {q.title}
                </Link>
              ) : (
                <p className="text-[14px] font-semibold text-neutral-900">{q.title}</p>
              )}
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500">
                <span>{STATUS_LABELS[q.status] ?? q.status}</span>
                {q.status === 'approved' && (
                  <>
                    <span>💬 {q.answer_count} উত্তর</span>
                    <span>⬆ {q.upvote_count}</span>
                  </>
                )}
                <span>{formatRelativeTimeBn(q.created_at)}</span>
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
