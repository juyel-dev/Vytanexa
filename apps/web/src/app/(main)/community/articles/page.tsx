import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { ArticleListClient } from '@/components/articles/ArticleListClient';
import { createClient } from '@/lib/supabase/server';
import { queryArticleList, getArticleCategories } from '@/lib/queries/article-list';

export const metadata: Metadata = {
  title: 'স্বাস্থ্য ম্যাগাজিন | Vytanexa',
  description: 'স্বাস্থ্য বিষয়ক নিবন্ধ, টিপস ও পরামর্শ পড়ুন — ডায়াবেটিস, পুষ্টি, শিশু স্বাস্থ্য ও আরো অনেক বিষয়ে।',
};

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
  const [{ data: articles, count }, categories] = await Promise.all([
    queryArticleList(supabase, { category: searchParams.category, page: 0 }),
    getArticleCategories(supabase),
  ]);

  return (
    <>
      <TopBarSection title="স্বাস্থ্য ম্যাগাজিন" />
      <ArticleListClient
        initialArticles={articles}
        initialCount={count}
        categories={categories}
      />
    </>
  );
}
