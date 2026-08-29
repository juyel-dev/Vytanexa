import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { QaManager } from '@/components/qa/QaManager';

export const dynamic = 'force-dynamic';

/**
 * Q&A Management — A10 "answer on behalf of verified doctor".
 * Lists questions (unanswered first), lets admin pick a verified doctor and publish an approved answer.
 */
export default async function QaManagerPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const tab = searchParams.tab === 'all' ? 'all' : 'unanswered';

  // fetch questions
  let q = supabase.from('questions').select('id, title, category, answer_count, upvote_count, created_at, status').is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
  if (tab === 'unanswered') q = q.eq('answer_count', 0);
  const { data: questions } = await q;

  const { data: doctors } = await supabase.from('doctors').select('id, name_translations, slug').eq('verification_status', 'verified').is('deleted_at', null).limit(100);

  const unansweredCount = tab === 'unanswered' ? (questions ?? []).length : null;
  // for tab badge when on all tab, need count
  let badgeUnanswered = 0;
  if (tab === 'all') {
    const { count } = await supabase.from('questions').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('answer_count', 0);
    badgeUnanswered = count ?? 0;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">প্রশ্নোত্তর ম্যানেজমেন্ট</h1>
        <p className="mt-1 text-admin-body text-neutral-500">ভেরিফাইড ডাক্তারের পক্ষ থেকে উত্তর দিন — সরাসরি approved হিসেবে প্রকাশ হবে, মডারেশন কিউ স্কিপ করে।</p>
      </div>
      <QaManager questions={(questions ?? []) as never} doctors={(doctors ?? []) as never} tab={tab} badgeUnanswered={tab === 'all' ? badgeUnanswered : (unansweredCount ?? 0)} />
    </div>
  );
}
