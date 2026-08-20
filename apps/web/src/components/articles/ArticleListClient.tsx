'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getLocalizedField, formatRelativeTimeBn, toBengaliDigits } from '@/lib/i18n';
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
  categories,
}: {
  initialArticles: ArticleListItem[];
  initialCount: number;
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState(initialArticles);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length < initialCount);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setArticles(initialArticles);
    setCount(initialCount);
    setPage(0);
    setHasMore(initialArticles.length < initialCount);
  }, [initialArticles, initialCount]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) loadMore();
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, page]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    const res = await fetch(`/api/articles?${params.toString()}`);
    const json = await res.json();
    setArticles((prev) => [...prev, ...json.articles]);
    setHasMore(json.hasMore);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const activeCategory = searchParams.get('category');
  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    value ? params.set(key, value) : params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const [featured, ...rest] = articles;

  return (
    <div className="pb-6">
      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-2.5 [scrollbar-width:none]">
        <button
          onClick={() => updateParam('category', null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
            !activeCategory ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          সব
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
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

      {articles.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            এই মুহূর্তে কোনো নিবন্ধ পাওয়া যায়নি
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
                    alt={getLocalizedField(featured.title_translations)}
                    fill
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
                {getLocalizedField(featured.title_translations)}
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
              {loadingMore ? 'লোড হচ্ছে...' : ''}
            </div>
          )}
          {!hasMore && rest.length > 0 && (
            <p className="py-6 text-center text-[13px] text-neutral-400">আর কোনো নিবন্ধ নেই</p>
          )}
        </>
      )}
    </div>
  );
}
