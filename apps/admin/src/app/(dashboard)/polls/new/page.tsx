import { requireRole } from '@/lib/supabase/auth-verify';
import { PollForm } from '@/components/polls/PollForm';

export const dynamic = 'force-dynamic';

export default async function NewPollPage() {
  await requireRole('admin');
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-admin-h1 text-neutral-900">নতুন জরিপ</h1>
      <div className="mt-4"><PollForm mode="create" /></div>
    </div>
  );
}
