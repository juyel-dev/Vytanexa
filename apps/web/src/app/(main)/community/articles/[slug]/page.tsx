import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getArticleBySlug, getRelatedArticles } from '@/lib/queries/article-detail';
import { getLocalizedField } from '@/lib/i18n';
import { ArticleDetailClient } from '@/components/articles/ArticleDetailClient';

// ISR revalidate 1hr per S13 spec ("SSG+ISR(1hr)"). Same
// cookies()-inside-createClient() caveat noted elsewhere in this app
// (ends up dynamically rendered per-request in practice).
export const revalidate = 3600;

async function loadArticle(slug: string) {
  const supabase = createClient();
  return getArticleBySlug(supabase, slug);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await loadArticle(params.slug);
  if (!article) return { title: 'নিবন্ধ পাওয়া যায়নি | Vytanexa' };

  const title = article.meta_title || getLocalizedField(article.title_translations);
  const description =
    article.meta_description || `${title} — Vytanexa স্বাস্থ্য ম্যাগাজিনে পড়ুন।`;

  return {
    title: `${title} | Vytanexa`,
    description,
    openGraph: {
      title: `${title} | Vytanexa`,
      description,
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
      type: 'article',
      publishedTime: article.published_at ?? undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = await loadArticle(params.slug);
  if (!article) notFound();

  const supabase = createClient();
  const related = await getRelatedArticles(supabase, article.category, article.id);

  const title = getLocalizedField(article.title_translations);
  const authorName =
    article.author_name ??
    (article.author ? getLocalizedField(article.author.name_translations) : undefined);
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/community/articles/${article.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: title,
    image: article.cover_image_url ?? undefined,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    ...(authorName && { author: { '@type': 'Person', name: authorName } }),
    publisher: { '@type': 'Organization', name: 'Vytanexa' },
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- static JSON-LD we constructed ourselves, not user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleDetailClient article={article} related={related} pageUrl={pageUrl} />
    </>
  );
}
