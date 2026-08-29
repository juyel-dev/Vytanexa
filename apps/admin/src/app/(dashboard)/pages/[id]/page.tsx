import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PageBuilder } from '@/components/custom-pages/PageBuilder';

export const dynamic = 'force-dynamic';

export default async function PageBuilderPage({ params }: { params: { id: string } }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const [{ data: page }, { data: polls }, { data: questions }, { data: doctors }, { data: hospitals }] = await Promise.all([
    supabase.from('custom_pages').select('*').eq('id', params.id).is('deleted_at', null).maybeSingle(),
    supabase.from('polls').select('id, question').order('created_at', { ascending: false }).limit(50),
    supabase.from('questions').select('id, title').order('created_at', { ascending: false }).limit(50),
    supabase.from('doctors').select('id, name_translations, slug').is('deleted_at', null).limit(100),
    supabase.from('hospitals').select('id, name_translations, slug').is('deleted_at', null).limit(100),
  ]);

  if (!page) notFound();

  return (
    <PageBuilder
      initialPage={page as never}
      polls={(polls ?? []) as never}
      questions={(questions ?? []) as never}
      doctors={(doctors ?? []) as never}
      hospitals={(hospitals ?? []) as never}
    />
  );
}
