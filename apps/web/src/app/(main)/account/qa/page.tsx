import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getMyQuestions } from '@/lib/queries/account';
import { formatRelativeTimeBn } from '@/lib/i18n';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('account');
  return { title: `${t('rows.myQa')} | Vytanexa` };
}

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

  const t = await getT('account');
  const tQa = await getT('qa');
  const questions = await getMyQuestions(supabase, currentUser.authUser.id);

  return (
    <>
      <TopBarSection title={t('rows.myQa')} backHref="/account" />
      <div className="px-4 py-4">
        {questions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="mb-3 text-[13px] text-neutral-400">{t('myQa.noQuestionsYet')}</p>
            <Link href="/community/qa" className="text-[14px] font-semibold text-brand-600">
              {tQa('askQuestion')} →
            </Link>
          </div>
        ) : (
          questions.map((q) => {
            const statusPath = `status.moderation.${q.status}` as Parameters<typeof t>[0];
            const statusLabel = t.has(statusPath) ? t(statusPath) : q.status;
            return (
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
                  <span>{statusLabel}</span>
                  {q.status === 'approved' && (
                    <>
                      <span>💬 {tQa('answersCount', { count: q.answer_count })}</span>
                      <span>⬆ {q.upvote_count}</span>
                    </>
                  )}
                  <span>{formatRelativeTimeBn(q.created_at)}</span>
                </p>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
