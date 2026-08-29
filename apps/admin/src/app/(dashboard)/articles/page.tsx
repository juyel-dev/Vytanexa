import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { ArticlesTable } from '@/components/articles/ArticlesTable';

export const dynamic = 'force-dynamic';

type SP = { q?: string; status?: string; category?: string; page?: string };

export default async function ArticlesPage({ searchParams }: { searchParams: SP }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const q = (searchParams.q ?? '').trim();
  const status = (searchParams.status ?? 'all').trim();
  const category = (searchParams.category ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const perPage = 25;

  // categories for filter (distinct)
  const { data: allCats } = await supabase.from('articles').select('category').is('deleted_at', null).limit(200);
  const catSet = new Set((allCats ?? []).map((r) => (r as { category: string | null }).category).filter(Boolean) as string[]);

  let query = supabase.from('articles').select('id, slug, title_translations, cover_image_url, category, is_published, view_count, published_at, created_at, author_name, author_doctor_id', { count: 'exact' }).is('deleted_at', null);

  if (q) {
    const esc = q.replace(/%/g, '\\%');
    query = query.or(`slug.ilike.%${esc}%,title_translations->>bn.ilike.%${esc}%`);
  }
  if (status === 'published') query = query.eq('is_published', true);
  else if (status === 'draft') query = query.eq('is_published', false);
  if (category) query = query.eq('category', category);

  query = query.order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1);

  const { data: articles, count, error } = await query;

  if (error) return <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-6 text-admin-body text-emergency-700">আর্টিকেল লোড করা যায়নি: {error.message}</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-admin-h1 text-neutral-900">আর্টিকেল</h1>
        <a href="/articles/new" className="h-10 inline-flex items-center rounded-lg bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700">+ নতুন আর্টিকেল</a>
      </div>
      <ArticlesTable articles={(articles ?? []) as never} total={count ?? 0} page={page} perPage={perPage} categories={[...catSet]} currentFilters={{ q, status, category }} />
    </div>
  );
}
