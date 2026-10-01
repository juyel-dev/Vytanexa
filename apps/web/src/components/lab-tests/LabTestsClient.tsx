'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useLocalizedField } from '@/lib/i18n-client';
import { useT } from '@vytanexa/i18n/client';
import { HospitalCard } from '@/components/shared/HospitalCard';
import { LocationChip } from '@/components/layout/LocationChip';
import { useLocationStore } from '@/stores/location-store';
import type { Json } from '@vytanexa/database';

type PopularTest = { canonical_key: string; name_translations: Json };
type SearchResult = {
  hospital: {
    id: string;
    slug: string;
    name_translations: Json;
    cover_image_url: string | null;
    type: string;
    has_emergency_dept: boolean;
    facility_tags: string[];
    phone: string;
    rating_avg: number;
    rating_count: number;
  };
  matchedTestNames: Json[];
};

/**
 * Lab & Diagnostic Test Search — VYTANEXA-BLUEPRINT.md § S10. Debounce
 * 300ms, min 2 chars per spec. Popular chips give an instant search
 * with zero typing ("critical for low-literacy UX" per spec) by just
 * setting the query directly, reusing the same debounced-fetch path.
 *
 * District filtering (Location Chip + Zustand store) added after S12
 * uncovered these already existed in the app — see TODO.md's S12
 * correction note. `districtId` is in the debounce effect's deps, so
 * changing district re-runs the current search against the new area
 * without the person needing to retype anything.
 */
export function LabTestsClient({
  popularTests,
  supportWhatsapp,
}: {
  popularTests: PopularTest[];
  supportWhatsapp: string;
}) {
  const { districtId } = useLocationStore();
  const localize = useLocalizedField();
  const t = useT('labTests');
  const tSearch = useT('search');
  const tCommon = useT('common');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      requestIdRef.current++; // invalidate any in-flight request
      setResults(null);
      setSubmittedQuery('');
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    const handle = setTimeout(async () => {
      // Stale-response guard: an older, slower request must not overwrite
      // the results of what the user has typed since.
      const id = ++requestIdRef.current;
      const params = new URLSearchParams({ q: query.trim() });
      if (districtId) params.set('district', districtId);
      try {
        const res = await fetch(`/api/test-search?${params.toString()}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        if (requestIdRef.current !== id) return;
        setResults(json.results ?? []);
        setSubmittedQuery(query.trim());
      } catch {
        if (requestIdRef.current !== id) return;
        setResults(null);
        setFailed(true);
      } finally {
        if (requestIdRef.current === id) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, districtId, retryTick]);

  // Spec § S10 analytics `test_search { query, results_count }`, logged
  // once per *settled* query (stable for 1s, results loaded) — not per
  // keystroke — so searched-but-unavailable counts reflect real intent.
  const lastLoggedRef = useRef('');
  useEffect(() => {
    if (!results || !submittedQuery || submittedQuery !== query.trim()) return;
    const key = `${submittedQuery}|${districtId ?? ''}`;
    if (lastLoggedRef.current === key) return;
    const timer = setTimeout(() => {
      lastLoggedRef.current = key;
      fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          event_type: 'test_search',
          location_id: districtId ?? null,
          metadata: { query: submittedQuery, results_count: results.length },
        }),
        keepalive: true,
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [results, submittedQuery, query, districtId]);

  return (
    <div className="pb-6">
      <LocationChip />
      <div className="px-4 py-3">
        <div className="flex h-11 items-center gap-2 rounded-full bg-neutral-100 px-4">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {query.trim().length < 2 && (
        <div className="px-4 py-4">
          <h2 className="mb-3 text-[14px] font-semibold text-neutral-700">{t('popularHeading')}</h2>
          {popularTests.length === 0 ? (
            <p className="text-[13px] text-neutral-400">{t('noPopularTests')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {popularTests.map((test) => (
                <button
                  key={test.canonical_key}
                  onClick={() => setQuery(localize(test.name_translations))}
                  className="rounded-full border border-neutral-200 px-3.5 py-2 text-[13px] font-medium text-neutral-700 active:bg-neutral-50"
                >
                  {localize(test.name_translations)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <p className="py-8 text-center text-[13px] text-neutral-400">{tSearch('searching')}</p>}

      {!loading && failed && (
        <div className="px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">{tCommon('error')}</p>
          <button
            onClick={() => setRetryTick((n) => n + 1)}
            className="mt-4 h-11 rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white"
          >
            {tCommon('retry')}
          </button>
        </div>
      )}

      {!loading && !failed && results && results.length === 0 && (
        <div className="px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            {t('noResultsTitle')}
          </p>
          <a
            href="/hospitals?type=diagnostic"
            className="mt-3 inline-block text-[13px] font-semibold text-brand-600"
          >
            {t('seeAllDiagnosticCenters')}
          </a>
          {supportWhatsapp && (
            <div>
              <a
                href={`https://wa.me/${supportWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-md bg-life-600 px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                {tSearch('whatsappCta')}
              </a>
            </div>
          )}
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <div className="px-0 py-3">
          <p className="mb-3 px-4 text-[13px] text-neutral-500">
            {t('resultsCountLabel', { query: submittedQuery, count: results.length })}
          </p>
          {results.map((r) => (
            <HospitalCard
              key={r.hospital.id}
              hospital={r.hospital}
              matchedTestLabel={r.matchedTestNames.map((n) => localize(n)).join(', ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
