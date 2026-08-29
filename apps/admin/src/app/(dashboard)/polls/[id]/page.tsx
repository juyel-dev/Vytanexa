import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PollForm } from '@/components/polls/PollForm';

export const dynamic = 'force-dynamic';

export default async function EditPollPage({ params }: { params: { id: string } }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const { data: poll } = await supabase
    .from('polls')
    .select('id, question, total_votes, expires_at, is_active, poll_options(id, option_text, vote_count, display_order)')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!poll) notFound();
  const p = poll as { id: string; question: string; total_votes: number; expires_at: string | null; is_active: boolean; poll_options: { id: string; option_text: string; vote_count: number; display_order: number }[] };
  const initial = {
    id: p.id,
    question: p.question,
    options: [...p.poll_options].sort((a, b) => a.display_order - b.display_order).map((o) => o.option_text),
    expires_at: p.expires_at ? p.expires_at.slice(0, 16) : '',
    total_votes: p.total_votes,
    voteCounts: p.poll_options.map((o) => ({ text: o.option_text, count: o.vote_count })),
  };
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-admin-h1 text-neutral-900">জরিপ সম্পাদনা</h1>
      <div className="mt-4"><PollForm mode="edit" initial={initial as never} /></div>
    </div>
  );
}
