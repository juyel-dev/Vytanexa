'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { HospitalCard, type HospitalCardData } from '@/components/shared/HospitalCard';
import { LocationChip } from '@/components/layout/LocationChip';
import { useLocationStore } from '@/stores/location-store';

const TYPES: [string, string][] = [
  ['hospital', 'হাসপাতাল'],
  ['clinic', 'ক্লিনিক'],
  ['diagnostic', 'ডায়াগনস্টিক'],
  ['nursing_home', 'নার্সিং হোম'],
];

/**
 * Hospital List Client — VYTANEXA-BLUEPRINT.md § S08, mirrors
 * DoctorListClient's (S06) SSR-hydrate + infinite-scroll pattern.
 *
 * District filtering: pushes the Location Chip's selection into the
 * `?district=` URL param via the same `updateParam` mechanism already
 * used for `type`/`emergencyOnly` — Next.js then re-runs the Server
 * Component page with the new searchParams and this component's
 * existing prop-sync effect picks up the fresh, already-filtered
 * results. No separate client-side fetch path needed for this filter
 * (unlike `/emergency`, which needed instant reactivity without a
 * navigation); reusing the existing infrastructure here is simpler
 * and more consistent with this page's own established pattern. Added
 * after S12 uncovered that the Location Chip already existed — see
 * TODO.md's S12 correction note for why this wasn't here from the start.
 */
export function HospitalListClient({
  initialHospitals,
  initialCount,
}: {
  initialHospitals: HospitalCardData[];
  initialCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { districtId } = useLocationStore();

  const [hospitals, setHospitals] = useState(initialHospitals);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHospitals.length < initialCount);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHospitals(initialHospitals);
    setCount(initialCount);
    setPage(0);
    setHasMore(initialHospitals.length < initialCount);
  }, [initialHospitals, initialCount]);

  // useCallback with real deps — the observer always calls the latest
  // closure, so a slow in-flight page can't append with a stale `page`.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    try {
      const res = await fetch(`/api/hospitals?${params.toString()}`);
      const json = await res.json();
      setHospitals((prev) => [...prev, ...(json.hospitals ?? [])]);
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
        if (entries[0]?.isIntersecting && !loadingMore) loadMore();
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const activeType = searchParams.get('type');
  const emergencyOnly = searchParams.get('emergencyOnly') === 'true';

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    value ? params.set(key, value) : params.delete(key);
    // replace, not push — filter changes shouldn't spam history, and
    // pushing from an effect risks a push → re-render → effect loop.
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const currentDistrict = searchParams.get('district');
    if ((districtId ?? null) === currentDistrict) return;
    const params = new URLSearchParams(searchParams.toString());
    districtId ? params.set('district', districtId) : params.delete('district');
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  return (
    <div>
      <LocationChip />
      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-2.5 [scrollbar-width:none]">
        <button
          onClick={() => updateParam('type', null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
            !activeType ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          সব
        </button>
        {TYPES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => updateParam('type', value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
              activeType === value
                ? 'bg-brand-600 text-white'
                : 'border border-neutral-200 text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => updateParam('emergencyOnly', emergencyOnly ? null : 'true')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
            emergencyOnly
              ? 'bg-emergency-600 text-white'
              : 'border border-emergency-200 text-emergency-600'
          }`}
        >
          🚨 জরুরি বিভাগ
        </button>
      </div>

      <p className="px-4 py-2.5 text-[13px] text-neutral-600">{count} টি পাওয়া গেছে</p>

      {hospitals.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            এই মুহূর্তে কোনো হাসপাতাল পাওয়া যায়নি
          </p>
        </div>
      ) : (
        <>
          {hospitals.map((h) => (
            <HospitalCard key={h.id} hospital={h} />
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-[13px] text-neutral-400">
              {loadingMore ? 'লোড হচ্ছে...' : ''}
            </div>
          )}
          {!hasMore && (
            <p className="py-6 text-center text-[13px] text-neutral-400">আর কোনো হাসপাতাল নেই</p>
          )}
        </>
      )}
    </div>
  );
}
