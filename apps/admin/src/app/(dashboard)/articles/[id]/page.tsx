import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { ArticleForm } from '@/components/articles/ArticleForm';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();
  const [{ data: article }, { data: doctors }] = await Promise.all([
    supabase.from('articles').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle(),
    supabase.from('doctors').select('id, name_translations, slug').is('deleted_at', null).limit(100),
  ]);
  if (!article) notFound();
  const a = article as { id: string; title_translations: { bn?: string; en?: string; hi?: string } | null; slug: string; cover_image_url: string | null; category: string | null; body_html: string; author_name: string | null; author_doctor_id: string | null; tags: string[]; read_time_minutes: number | null; is_published: boolean; meta_title: string | null; meta_description: string | null };
  const initial = {
    id: a.id,
    title_translations: a.title_translations,
    slug: a.slug,
    cover_image_url: a.cover_image_url,
    category: a.category,
    body_html: a.body_html,
    author_name: a.author_name,
    author_doctor_id: a.author_doctor_id,
    tags: a.tags ?? [],
    read_time_minutes: a.read_time_minutes,
    is_published: a.is_published,
    meta_title: a.meta_title,
    meta_description: a.meta_description,
  };
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-admin-h1 text-neutral-900">আর্টিকেল সম্পাদনা: {(a.title_translations?.bn || a.slug) as string}</h1>
      <div className="mt-4"><ArticleForm mode="edit" initial={initial as never} doctors={(doctors ?? []) as never} /></div>
    </div>
  );
}
