'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { DoctorCard, type DoctorCardData } from '@/components/shared/DoctorCard';
import { FilterSheet } from '@/components/doctors/FilterSheet';
import { getLocalizedField } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';

type Category = { id: string; slug: string; name_translations: Json };
type DoctorRow = DoctorCardData & { categories: { name_translations: Json; slug: string } | null };

const SORT_OPTIONS: [string, string][] = [
  ['rating', 'সেরা রেটিং'],
  ['reviews', 'সবচেয়ে বেশি রিভিউ'],
  ['fee_asc', 'কম ভিজিট ফি'],
  ['experience', 'বেশি অভিজ্ঞতা'],
];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, page]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    const res = await fetch(`/api/doctors?${params.toString()}`);
    const json = await res.json();
    setDoctors((prev) => [...prev, ...json.doctors]);
    setHasMore(json.hasMore);
    setPage(nextPage);
    setLoadingMore(false);
  };

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
          সব
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
            {getLocalizedField(c.name_translations)}
          </button>
        ))}
        <button
          onClick={() => setFilterOpen(true)}
          className="ml-1 flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] text-neutral-700"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> ফিল্টার
        </button>
      </div>

      {/* Result count + sort */}
      <div className="relative flex items-center justify-between px-4 py-2.5 text-[13px]">
        <span className="text-neutral-600">{count} জন ডাক্তার পাওয়া গেছে</span>
        <button onClick={() => setSortOpen((v) => !v)} className="font-semibold text-brand-600">
          সাজান: {SORT_OPTIONS.find(([v]) => v === activeSort)?.[1]} ▾
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
            এই মুহূর্তে কোনো ডাক্তার পাওয়া যায়নি
          </p>
          <p className="mt-2 text-[13px] text-neutral-500">
            ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন, অথবা এই এলাকায় এখনো কোনো ডাক্তার যোগ করা হয়নি
          </p>
        </div>
      ) : (
        <>
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-[13px] text-neutral-400">
              {loadingMore ? 'লোড হচ্ছে...' : ''}
            </div>
          )}
          {!hasMore && (
            <p className="py-6 text-center text-[13px] text-neutral-400">আর কোনো ডাক্তার নেই</p>
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
