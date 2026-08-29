import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { ArticleForm } from '@/components/articles/ArticleForm';

export const dynamic = 'force-dynamic';

export default async function NewArticlePage() {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const { data: doctors } = await supabase.from('doctors').select('id, name_translations, slug').is('deleted_at', null).limit(100);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-admin-h1 text-neutral-900">নতুন আর্টিকেল</h1>
      <div className="mt-4"><ArticleForm mode="create" doctors={(doctors ?? []) as never} /></div>
    </div>
  );
}
