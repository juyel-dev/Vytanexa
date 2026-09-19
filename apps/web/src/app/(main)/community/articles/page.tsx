import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { ArticleListClient } from '@/components/articles/ArticleListClient';
import { createClient } from '@/lib/supabase/server';
import { queryArticleList, getArticleCategories } from '@/lib/queries/article-list';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('articles');
  return {
    title: `${t('title')} | Vytanexa`,
    description: t('metaDescription'),
  };
}

/**
 * Article List Page — VYTANEXA-BLUEPRINT.md § S13. SSR first page +
 * client infinite scroll, same architecture as S06/S08.
 */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = createClient();
  const [{ data: articles, count }, categories, t] = await Promise.all([
    queryArticleList(supabase, { category: searchParams.category, page: 0 }),
    getArticleCategories(supabase),
    getT('articles'),
  ]);

  return (
    <>
      <TopBarSection title={t('title')} />
      <ArticleListClient
        initialArticles={articles}
        initialCount={count}
        categories={categories}
      />
    </>
  );
}
