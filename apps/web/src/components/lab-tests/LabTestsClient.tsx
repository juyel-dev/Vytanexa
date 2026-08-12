'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
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
export function LabTestsClient({ popularTests }: { popularTests: PopularTest[] }) {
  const { districtId } = useLocationStore();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setSubmittedQuery('');
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const params = new URLSearchParams({ q: query.trim() });
      if (districtId) params.set('district', districtId);
      const res = await fetch(`/api/test-search?${params.toString()}`);
      const json = await res.json();
      setResults(json.results ?? []);
      setSubmittedQuery(query.trim());
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, districtId]);

  return (
    <div className="pb-6">
      <LocationChip />
      <div className="px-4 py-3">
        <div className="flex h-11 items-center gap-2 rounded-full bg-neutral-100 px-4">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="টেস্টের নাম লিখুন (CBC, X-Ray, USG...)"
            className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {query.trim().length < 2 && (
        <div className="px-4 py-4">
          <h2 className="mb-3 text-[14px] font-semibold text-neutral-700">জনপ্রিয় টেস্ট:</h2>
          {popularTests.length === 0 ? (
            <p className="text-[13px] text-neutral-400">টেস্টের তালিকা এখনো যোগ করা হয়নি।</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {popularTests.map((t) => (
                <button
                  key={t.canonical_key}
                  onClick={() => setQuery(getLocalizedField(t.name_translations))}
                  className="rounded-full border border-neutral-200 px-3.5 py-2 text-[13px] font-medium text-neutral-700 active:bg-neutral-50"
                >
                  {getLocalizedField(t.name_translations)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <p className="py-8 text-center text-[13px] text-neutral-400">খোঁজা হচ্ছে...</p>}

      {!loading && results && results.length === 0 && (
        <div className="px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            এই টেস্ট এখনো কোনো কেন্দ্রে যোগ হয়নি এই এলাকায়
          </p>
          <a
            href="/hospitals?type=diagnostic"
            className="mt-3 inline-block text-[13px] font-semibold text-brand-600"
          >
            সব ডায়াগনস্টিক সেন্টার দেখুন →
          </a>
          <div>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-md bg-life-600 px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              💬 WhatsApp-এ জানান →
            </a>
          </div>
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <div className="px-0 py-3">
          <p className="mb-3 px-4 text-[13px] text-neutral-500">
            &ldquo;{submittedQuery}&rdquo; এর জন্য {results.length}টি সেন্টার পাওয়া গেছে
          </p>
          {results.map((r) => (
            <HospitalCard
              key={r.hospital.id}
              hospital={r.hospital}
              matchedTestLabel={r.matchedTestNames.map((n) => getLocalizedField(n)).join(', ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
