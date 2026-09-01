import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { QuestionsQueue } from '@/components/moderation/QuestionsQueue';

export const dynamic = 'force-dynamic';

type SP = { status?: string };

/**
 * Questions Moderation — ADMIN-PANEL-SPEC.md A03 unified pattern,
 * Q&A variant (`/moderation/qa`). TODO.md Phase 9.4. Distinct from
 * `/qa` (QaManager, A10 — admin answers on behalf of a verified
 * doctor): this page approves/rejects the QUESTION itself.
 * questions_select RLS requires status='approved' — same bug class
 * as reviews, confirmed nothing anywhere ever set it before this.
 */
export default async function QuestionsModerationPage({ searchParams }: { searchParams: SP }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const statuses = ['pending', 'approved', 'rejected'];
  const tab = statuses.includes(searchParams.status ?? '') ? (searchParams.status as string) : 'pending';

  const counts = { pending: 0, approved: 0, rejected: 0 };
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('status', s as never)
        .is('deleted_at', null);
      counts[s as keyof typeof counts] = count ?? 0;
    })
  );

  const { data: questions } = await supabase
    .from('questions')
    .select('id, title, body, category_id, is_anonymous, author_name, upvote_count, answer_count, status, created_at')
    .eq('status', tab as never)
    .is('deleted_at', null)
    .order('created_at', { ascending: tab === 'pending' })
    .limit(100);

  const rows = (questions ?? []) as {
    id: string;
    title: string;
    body: string | null;
    category_id: string | null;
    is_anonymous: boolean;
    author_name: string | null;
    upvote_count: number;
    answer_count: number;
    status: string;
    created_at: string;
  }[];

  const catIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean) as string[])];
  const catMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('categories').select('id, name_translations').in('id', catIds);
    for (const c of cats ?? []) {
      const t = (c as { name_translations: { bn?: string; en?: string } | null }).name_translations;
      catMap.set((c as { id: string }).id, (t?.bn || t?.en || '—') as string);
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    category_name: r.category_id ? (catMap.get(r.category_id) ?? '—') : '—',
  }));

  return <QuestionsQueue questions={enriched} tab={tab} counts={counts} />;
}
