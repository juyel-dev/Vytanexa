'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Share2 } from 'lucide-react';
import { getLocalizedField, formatRelativeTimeBn, toBengaliDigits } from '@/lib/i18n';
import { ShareSheet } from '@/components/shared/ShareSheet';
import type { ArticleDetail } from '@/lib/queries/article-detail';
import type { Json } from '@vytanexa/database';

type RelatedArticle = {
  id: string;
  slug: string;
  title_translations: Json;
  cover_image_url: string | null;
  category: string | null;
  read_time_minutes: number | null;
};

/**
 * Article Detail — VYTANEXA-BLUEPRINT.md § S13. `article_view` fires
 * on mount, `article_read_complete` fires once at ≥90% scroll depth
 * (a `useEffect` scroll listener, self-removing after firing once so
 * it doesn't keep re-firing on every scroll event past the threshold),
 * `related_article_click` fires per related-card tap.
 */
export function ArticleDetailClient({
  article,
  related,
  pageUrl,
}: {
  article: ArticleDetail;
  related: RelatedArticle[];
  pageUrl: string;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const title = getLocalizedField(article.title_translations);
  const authorName =
    article.author_name ??
    (article.author ? getLocalizedField(article.author.name_translations) : null);

  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'article_view',
        entity_type: 'article',
        entity_id: article.id,
      }),
    }).catch(() => {});
  }, [article.id]);

  useEffect(() => {
    let fired = false;
    const handleScroll = () => {
      if (fired) return;
      const scrollPercent =
        (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPercent >= 0.9) {
        fired = true;
        fetch('/api/analytics', {
          method: 'POST',
          body: JSON.stringify({
            event_type: 'article_read_complete',
            entity_type: 'article',
            entity_id: article.id,
          }),
        }).catch(() => {});
        window.removeEventListener('scroll', handleScroll);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article.id]);

  const trackRelatedClick = (relatedId: string) => {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'related_article_click',
        entity_type: 'article',
        entity_id: relatedId,
        metadata: { from_article_id: article.id },
      }),
    }).catch(() => {});
  };

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-topbar flex h-topbar items-center justify-between border-b border-neutral-100 bg-white px-2">
        <Link
          href="/community/articles"
          className="flex h-11 w-11 items-center justify-center text-neutral-700"
          aria-label="পেছনে যান"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <button
          onClick={() => setShareOpen(true)}
          className="flex h-11 w-11 items-center justify-center text-neutral-700"
          aria-label="শেয়ার করুন"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {article.cover_image_url && (
        <div className="relative h-[220px] w-full bg-neutral-100">
          <Image src={article.cover_image_url} alt={title} fill className="object-cover" />
        </div>
      )}

      <div className="px-4 py-4">
        {article.category && (
          <span className="mb-2 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            {article.category}
          </span>
        )}
        <h1 className="text-[22px] font-bold leading-snug text-neutral-900">{title}</h1>

        <p className="mt-2 text-[13px] text-neutral-500">
          {authorName && article.author ? (
            <Link href={`/doctors/${article.author.slug}`} className="font-medium text-brand-600">
              ✍️ {authorName}
            </Link>
          ) : authorName ? (
            <span>✍️ {authorName}</span>
          ) : null}
          {article.read_time_minutes && (
            <>
              {authorName && '  ·  '}
              {toBengaliDigits(article.read_time_minutes)} মিনিট পড়া
            </>
          )}
          {article.published_at && (
            <>
              {'  ·  '}
              {formatRelativeTimeBn(article.published_at)}
            </>
          )}
        </p>
      </div>

      <div className="border-t border-neutral-100 px-4 py-5">
        {/* eslint-disable-next-line react/no-danger -- body_html is admin-authored and sanitized server-side on write (Admin Panel), see lib/queries/article-detail.ts */}
        <div
          className="prose prose-neutral max-w-none text-[16px] leading-[1.6] text-neutral-800 [&_h2]:mt-6 [&_h2]:text-[18px] [&_h2]:font-bold [&_img]:rounded-lg [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: article.body_html }}
        />
      </div>

      {article.tags.length > 0 && (
        <div className="border-t border-neutral-100 px-4 py-4">
          <p className="mb-2 text-[13px] font-semibold text-neutral-700">🏷️ ট্যাগ</p>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] text-neutral-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="border-t border-neutral-100 px-4 py-4">
          <p className="mb-3 text-[15px] font-bold text-neutral-800">সম্পর্কিত আর্টিকেল</p>
          <div className="grid grid-cols-2 gap-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/community/articles/${r.slug}`}
                onClick={() => trackRelatedClick(r.id)}
                className="block"
              >
                <div className="relative h-[90px] w-full overflow-hidden rounded-lg bg-neutral-100">
                  {r.cover_image_url && (
                    <Image
                      src={r.cover_image_url}
                      alt={getLocalizedField(r.title_translations)}
                      fill
                      sizes="50vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <h4 className="mt-1.5 line-clamp-2 text-[13px] font-semibold text-neutral-900">
                  {getLocalizedField(r.title_translations)}
                </h4>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={title}
        subtitle="Vytanexa স্বাস্থ্য ম্যাগাজিন"
        url={pageUrl}
      />
    </div>
  );
}
