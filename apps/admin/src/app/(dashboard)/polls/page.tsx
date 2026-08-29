import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PollsList } from '@/components/polls/PollsList';

export const dynamic = 'force-dynamic';

export default async function PollsPage() {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const { data: polls } = await supabase
    .from('polls')
    .select('id, question, total_votes, expires_at, is_active, created_at, poll_options(id, option_text, vote_count, display_order)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-admin-h1 text-neutral-900">জরিপ</h1>
        <a href="/polls/new" className="h-10 inline-flex items-center rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন জরিপ</a>
      </div>
      <PollsList polls={(polls ?? []) as never} />
    </div>
  );
}
