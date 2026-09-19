'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { DoctorCard, type DoctorCardData } from '@/components/shared/DoctorCard';
import { FilterSheet } from '@/components/doctors/FilterSheet';
import { useLocalizedField } from '@/lib/i18n-client';
import { useT } from '@vytanexa/i18n/client';
import type { Json } from '@vytanexa/database';

type Category = { id: string; slug: string; name_translations: Json };
type DoctorRow = DoctorCardData & { categories: { name_translations: Json; slug: string } | null };

/**
 * Doctor List Client — VYTANEXA-BLUEPRINT.md § S06. Hydrates on top of
 * the SSR-rendered first page (passed as `initialDoctors`/`initialCount`
 * from the Server Component page), then takes over pagination via
 * IntersectionObserver + /api/doctors for subsequent pages.
 */
export function DoctorListClient({
  initialDoctors,
  initialCount,
  categories,
}: {
  initialDoctors: DoctorRow[];
  initialCount: number;
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const localize = useLocalizedField();
  const t = useT('doctor');
  const tCommon = useT('common');
  const SORT_OPTIONS: [string, string][] = [
    ['rating', t('sort.rating')],
    ['reviews', t('sort.reviews')],
    ['fee_asc', t('sort.feeAsc')],
    ['experience', t('sort.experience')],
  ];
  const [doctors, setDoctors] = useState(initialDoctors);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialDoctors.length < initialCount);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDoctors(initialDoctors);
    setCount(initialCount);
    setPage(0);
    setHasMore(initialDoctors.length < initialCount);
  }, [initialDoctors, initialCount]);

  // useCallback with real deps — the observer always calls the latest
  // closure, so a slow in-flight page can't append with a stale `page`.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    try {
      const res = await fetch(`/api/doctors?${params.toString()}`);
      const json = await res.json();
      setDoctors((prev) => [...prev, ...(json.doctors ?? [])]);
      setHasMore(json.hasMore);
      setPage(nextPage);
    } catch {
      // network failure — stop spinning, keep existing results
    }
    setLoadingMore(false);
  }, [page, searchParams]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const activeSpecialty = searchParams.get('specialty')?.split(',')[0];
  const activeSort = searchParams.get('sort') ?? 'rating';

  const setSpecialtyChip = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    slug ? params.set('specialty', slug) : params.delete('specialty');
    router.push(`${pathname}?${params.toString()}`);
  };

  const setSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    router.push(`${pathname}?${params.toString()}`);
    setSortOpen(false);
  };

  return (
    <div>
      {/* Specialty chips */}
      <div className="sticky top-topbar z-sticky flex gap-2 overflow-x-auto border-b border-neutral-100 bg-white px-4 py-2.5 [scrollbar-width:none]">
        <button
          onClick={() => setSpecialtyChip(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
            !activeSpecialty ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          {t('filterAll')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSpecialtyChip(c.slug)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
              activeSpecialty === c.slug
                ? 'bg-brand-600 text-white'
                : 'border border-neutral-200 text-neutral-700'
            }`}
          >
            {localize(c.name_translations)}
          </button>
        ))}
        <button
          onClick={() => setFilterOpen(true)}
          className="ml-1 flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] text-neutral-700"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> {t('filterLabel')}
        </button>
      </div>

      {/* Result count + sort */}
      <div className="relative flex items-center justify-between px-4 py-2.5 text-[13px]">
        <span className="text-neutral-600">{t('resultsCount', { count })}</span>
        <button onClick={() => setSortOpen((v) => !v)} className="font-semibold text-brand-600">
          {t('sortByPrefix')}{SORT_OPTIONS.find(([v]) => v === activeSort)?.[1]} ▾
        </button>
        {sortOpen && (
          <div className="absolute right-4 top-9 z-dropdown w-56 rounded-md bg-white py-1 shadow-lg">
            {SORT_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={`block w-full px-4 py-2.5 text-left text-[13px] ${
                  activeSort === value ? 'font-semibold text-brand-600' : 'text-neutral-700'
                }`}
              >
                {activeSort === value && '✓ '}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {doctors.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            {t('noResultsTitle')}
          </p>
          <p className="mt-2 text-[13px] text-neutral-500">
            {t('noResultsHint')}
          </p>
        </div>
      ) : (
        <>
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-[13px] text-neutral-400">
              {loadingMore ? tCommon('loading') : ''}
            </div>
          )}
          {!hasMore && (
            <p className="py-6 text-center text-[13px] text-neutral-400">{t('noMoreDoctors')}</p>
          )}
        </>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        currentParams={new URLSearchParams(searchParams.toString())}
      />
    </div>
  );
}
