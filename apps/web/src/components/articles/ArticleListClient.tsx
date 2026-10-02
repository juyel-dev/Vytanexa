'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLocalizedField } from '@/lib/i18n-client';
import { useT } from '@vytanexa/i18n/client';
import { ArticleCard, ArticleMeta } from '@/components/shared/ArticleCard';
import type { Json } from '@vytanexa/database';

type ArticleListItem = {
  id: string;
  slug: string;
  title_translations: Json;
  cover_image_url: string | null;
  category: string | null;
  author_name: string | null;
  author_doctor_id: string | null;
  read_time_minutes: number | null;
  published_at: string | null;
};

/**
 * Article List Client — VYTANEXA-BLUEPRINT.md § S13. First article
 * gets the large featured treatment, the rest fill a 2-column grid —
 * matches the spec's mockup layout exactly. Category chips filter via
 * the same `?category=` URL param + SSR re-fetch pattern established
 * in S08's `HospitalListClient`.
 */
export function ArticleListClient({
  initialArticles,
  initialCount,
  loadError = false,
  categories,
}: {
  initialArticles: ArticleListItem[];
  initialCount: number;
  loadError?: boolean;
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState(initialArticles);
  const localize = useLocalizedField();
  const t = useT('articles');
  const tCommon = useT('common');
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length < initialCount);
  const [moreFailed, setMoreFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Query string the displayed list belongs to — a slow load-more for an
  // OLD category must not append into the list of a NEW one.
  const queryKeyRef = useRef(searchParams.toString());
  queryKeyRef.current = searchParams.toString();

  useEffect(() => {
    setArticles(initialArticles);
    setCount(initialCount);
    setPage(0);
    setHasMore(initialArticles.length < initialCount);
    setMoreFailed(false);
  }, [initialArticles, initialCount]);

  // Previously: no try/catch and no res.ok check — a network error or a
  // 500 (`json.articles` undefined -> spread throws) left `loadingMore`
  // true forever, which froze infinite scroll for the rest of the visit.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setMoreFailed(false);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    const requestKey = params.toString();
    params.set('page', String(nextPage));
    try {
      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (queryKeyRef.current !== requestKey) return; // category changed meanwhile
      setArticles((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...(json.articles ?? []).filter((a: ArticleListItem) => !seen.has(a.id))];
      });
      setHasMore(json.hasMore);
      setPage(nextPage);
    } catch {
      if (queryKeyRef.current === requestKey) setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [page, searchParams]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || moreFailed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) loadMore();
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, moreFailed]);

  const activeCategory = searchParams.get('category');
  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    value ? params.set(key, value) : params.delete(key);
    // replace, not push — chip taps shouldn't stack history entries
    // (same as the Doctor/Hospital lists).
    router.replace(`${pathname}?${params.toString()}`);
  };

  const [featured, ...rest] = articles;

  return (
    <div className="pb-6">
      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-2.5 [scrollbar-width:none]">
        <button
          aria-pressed={!activeCategory}
          onClick={() => updateParam('category', null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
            !activeCategory ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          {t('filterAll')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            aria-pressed={activeCategory === cat}
            onClick={() => updateParam('category', cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
              activeCategory === cat
                ? 'bg-brand-600 text-white'
                : 'border border-neutral-200 text-neutral-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {articles.length === 0 && loadError ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">{tCommon('error')}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 h-11 rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white"
          >
            {tCommon('retry')}
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            {t('noArticlesFound')}
          </p>
        </div>
      ) : (
        <>
          {featured && (
            <Link href={`/community/articles/${featured.slug}`} className="block px-4 py-4">
              <div className="relative h-[180px] w-full overflow-hidden rounded-xl bg-neutral-100">
                {featured.cover_image_url && (
                  <Image
                    src={featured.cover_image_url}
                    alt={localize(featured.title_translations)}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                  />
                )}
                {featured.category && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                    {featured.category}
                  </span>
                )}
              </div>
              <h2 className="mt-2 line-clamp-2 text-[17px] font-bold text-neutral-900">
                {localize(featured.title_translations)}
              </h2>
              <ArticleMeta article={featured} />
            </Link>
          )}

          <div className="grid grid-cols-2 gap-3 px-4">
            {rest.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-[13px] text-neutral-400">
              {moreFailed ? (
                <button
                  onClick={loadMore}
                  className="h-10 rounded-md border border-neutral-300 px-5 font-semibold text-neutral-700"
                >
                  {tCommon('retry')}
                </button>
              ) : loadingMore ? (
                tCommon('loading')
              ) : (
                ''
              )}
            </div>
          )}
          {!hasMore && !moreFailed && rest.length > 0 && (
            <p className="py-6 text-center text-[13px] text-neutral-400">{t('noMoreArticles')}</p>
          )}
        </>
      )}
    </div>
  );
}
