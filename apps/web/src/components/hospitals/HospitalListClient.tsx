'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { HospitalCard, type HospitalCardData } from '@/components/shared/HospitalCard';
import { LocationChip } from '@/components/layout/LocationChip';
import { useLocationStore } from '@/stores/location-store';
import { useT } from '@vytanexa/i18n/client';

type TypeKey = 'hospital' | 'clinic' | 'diagnostic' | 'nursing_home';

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
  loadError = false,
}: {
  initialHospitals: HospitalCardData[];
  initialCount: number;
  loadError?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { districtId } = useLocationStore();
  const t = useT('hospital');
  const tCommon = useT('common');
  const TYPES: [TypeKey, string][] = [
    ['hospital', t('type.hospital')],
    ['clinic', t('type.clinic')],
    ['diagnostic', t('type.diagnostic')],
    ['nursing_home', t('type.nursing_home')],
  ];

  const [hospitals, setHospitals] = useState(initialHospitals);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHospitals.length < initialCount);
  const [moreFailed, setMoreFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Query string the displayed list belongs to — a slow load-more for an
  // OLD filter must not append into the list of a NEW filter.
  const queryKeyRef = useRef(searchParams.toString());
  queryKeyRef.current = searchParams.toString();

  useEffect(() => {
    setHospitals(initialHospitals);
    setCount(initialCount);
    setPage(0);
    setHasMore(initialHospitals.length < initialCount);
    setMoreFailed(false);
  }, [initialHospitals, initialCount]);

  // useCallback with real deps — the observer always calls the latest
  // closure, so a slow in-flight page can't append with a stale `page`.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setMoreFailed(false);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    const requestKey = params.toString();
    params.set('page', String(nextPage));
    try {
      const res = await fetch(`/api/hospitals?${params.toString()}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (queryKeyRef.current !== requestKey) return; // filters changed meanwhile
      setHospitals((prev) => {
        const seen = new Set(prev.map((h) => h.id));
        return [...prev, ...(json.hospitals ?? []).filter((h: HospitalCardData) => !seen.has(h.id))];
      });
      setHasMore(json.hasMore);
      setPage(nextPage);
    } catch {
      // The list did NOT end — keep hasMore and offer a retry instead of
      // showing "no more hospitals".
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
          aria-pressed={!activeType}
          onClick={() => updateParam('type', null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
            !activeType ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          {t('filterAll')}
        </button>
        {TYPES.map(([value, label]) => (
          <button
            key={value}
            aria-pressed={activeType === value}
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
          aria-pressed={emergencyOnly}
          onClick={() => updateParam('emergencyOnly', emergencyOnly ? null : 'true')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
            emergencyOnly
              ? 'bg-emergency-600 text-white'
              : 'border border-emergency-200 text-emergency-600'
          }`}
        >
          {t('emergencyDeptBadge')}
        </button>
      </div>

      <p className="px-4 py-2.5 text-[13px] text-neutral-600">{t('resultsCountLabel', { count })}</p>

      {hospitals.length === 0 && loadError ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">{tCommon('error')}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 h-11 rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white"
          >
            {tCommon('retry')}
          </button>
        </div>
      ) : hospitals.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            {t('noHospitalsFound')}
          </p>
        </div>
      ) : (
        <>
          {hospitals.map((h) => (
            <HospitalCard key={h.id} hospital={h} />
          ))}
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
          {!hasMore && !moreFailed && (
            <p className="py-6 text-center text-[13px] text-neutral-400">{t('noMoreHospitals')}</p>
          )}
        </>
      )}
    </div>
  );
}
