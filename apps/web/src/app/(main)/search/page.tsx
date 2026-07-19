'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search as SearchIcon, X, Mic } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/recent-searches';
import type { SearchApiResponse, TrendingApiResponse } from '@/lib/search-types';
import { VoiceSearchOverlay } from '@/components/search/VoiceSearchOverlay';

const BENGALI_ALIASES: Record<string, string> = {
  'হার্ট': 'cardiology',
  'বুকে ব্যথা': 'chest pain cardiology',
  'চিনি রোগ': 'diabetes',
  'বাচ্চার ডাক্তার': 'pediatrics',
  'কিডনি': 'nephrology',
  'পেটের সমস্যা': 'gastroenterology',
};

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [dropdown, setDropdown] = useState<SearchApiResponse | null>(null);
  const [results, setResults] = useState<SearchApiResponse | null>(null);
  const [trending, setTrending] = useState<TrendingApiResponse | null>(null);
  const [recent, setRecent] = useState(getRecentSearches());
  const [loading, setLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'doctors' | 'hospitals' | 'symptoms'>('all');

  useEffect(() => {
    inputRef.current?.focus();
    fetch('/api/search/trending')
      .then((r) => r.json())
      .then(setTrending)
      .catch(() => {});
  }, []);

  // Debounced autocomplete (State 2 — Typing)
  useEffect(() => {
    if (query.length < 2 || query === submittedQuery) {
      setDropdown(null);
      return;
    }
    const expanded = BENGALI_ALIASES[query] ? `${query} ${BENGALI_ALIASES[query]}` : query;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(expanded)}&limit=3`)
        .then((r) => r.json())
        .then(setDropdown)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, submittedQuery]);

  const submitSearch = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    setQuery(trimmed);
    setSubmittedQuery(trimmed);
    setDropdown(null);
    saveRecentSearch(trimmed);
    setRecent(getRecentSearches());
    setLoading(true);
    const expanded = BENGALI_ALIASES[trimmed] ? `${trimmed} ${BENGALI_ALIASES[trimmed]}` : trimmed;
    fetch(`/api/search?q=${encodeURIComponent(expanded)}&limit=20`)
      .then((r) => r.json())
      .then(setResults)
      .finally(() => setLoading(false));
  };

  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
    setDropdown(null);
    setResults(null);
    inputRef.current?.focus();
  };

  const isEmpty = query.length < 2 && !submittedQuery;
  const isTyping = query.length >= 2 && query !== submittedQuery;
  const isResults = Boolean(submittedQuery) && query === submittedQuery;

  const totalResultCount = results
    ? results.doctors.length + results.hospitals.length + results.symptoms.length
    : 0;

  return (
    <div className="min-h-dvh">
      {/* Top bar — Search variant (S02 § 2.2 Variant D) */}
      <div className="sticky top-0 z-topbar flex h-topbar items-center gap-2 border-b border-neutral-100 bg-white px-2">
        <button
          onClick={() => router.back()}
          aria-label="পেছনে যান"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-neutral-700"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-neutral-100 px-3">
          <SearchIcon className="h-5 w-5 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch(query)}
            placeholder="ডাক্তার, হাসপাতাল, উপসর্গ খুঁজুন..."
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          />
          {query && (
            <button onClick={clearSearch} aria-label="মুছুন">
              <X className="h-4 w-4 text-neutral-400" />
            </button>
          )}
          <button onClick={() => setVoiceOpen(true)} aria-label="ভয়েস সার্চ">
            <Mic className="h-4 w-4 text-brand-600" />
          </button>
        </div>
      </div>

      {/* State 1 — Empty */}
      {isEmpty && (
        <div className="px-4 py-4">
          {recent.length > 0 && (
            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-neutral-800">📌 সাম্প্রতিক খোঁজ</h2>
                <button
                  onClick={() => {
                    clearRecentSearches();
                    setRecent([]);
                  }}
                  className="text-[12px] text-neutral-400"
                >
                  সাফ করুন
                </button>
              </div>
              {recent.map((r) => (
                <div
                  key={r.query}
                  className="flex items-center justify-between border-b border-neutral-100 py-2.5"
                >
                  <button
                    onClick={() => submitSearch(r.query)}
                    className="flex items-center gap-2 text-[14px] text-neutral-700"
                  >
                    <SearchIcon className="h-4 w-4 text-neutral-400" />
                    {r.query}
                  </button>
                  <button
                    onClick={() => {
                      removeRecentSearch(r.query);
                      setRecent(getRecentSearches());
                    }}
                    aria-label="সরান"
                  >
                    <X className="h-4 w-4 text-neutral-300" />
                  </button>
                </div>
              ))}
            </section>
          )}

          {trending && trending.trending.length > 0 && (
            <section className="mb-5">
              <h2 className="mb-2 text-[14px] font-semibold text-neutral-800">🔥 এখন জনপ্রিয়</h2>
              <div className="flex flex-wrap gap-2">
                {trending.trending.map((t) => (
                  <button
                    key={t.query}
                    onClick={() => submitSearch(t.query)}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] text-neutral-700"
                  >
                    {t.query}
                  </button>
                ))}
              </div>
            </section>
          )}

          {trending && trending.categories.length > 0 && (
            <section>
              <h2 className="mb-2 text-[14px] font-semibold text-neutral-800">বিভাগ অনুযায়ী খুঁজুন</h2>
              <div className="grid grid-cols-3 gap-2">
                {trending.categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/doctors?specialty=${c.slug}`}
                    className="flex h-16 items-center justify-center rounded-lg border border-neutral-200 px-2 text-center text-[12px] text-neutral-700"
                  >
                    {getLocalizedField(c.name_translations)}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* State 2 — Typing (dropdown) */}
      {isTyping && (
        <div className="relative">
          <div
            className="fixed inset-0 top-topbar z-dropdown bg-neutral-900/40"
            onClick={() => setQuery(submittedQuery)}
          />
          <div className="relative z-dropdown max-h-[70vh] overflow-y-auto rounded-b-xl bg-white shadow-lg">
            {loading && (
              <p className="py-6 text-center text-[13px] text-neutral-400">খোঁজা হচ্ছে...</p>
            )}
            {!loading && dropdown && (
              <>
                <DropdownSection
                  label="ডাক্তার"
                  items={dropdown.doctors.map((d) => ({
                    id: d.id,
                    label: getLocalizedField(d.name_translations),
                    sub: d.categories ? getLocalizedField(d.categories.name_translations) : '',
                    href: `/doctors/${d.slug}`,
                  }))}
                />
                <DropdownSection
                  label="হাসপাতাল"
                  items={dropdown.hospitals.map((h) => ({
                    id: h.id,
                    label: getLocalizedField(h.name_translations),
                    sub: h.type,
                    href: `/hospitals/${h.slug}`,
                  }))}
                />
                <DropdownSection
                  label="বিভাগ"
                  items={dropdown.categories.map((c) => ({
                    id: c.id,
                    label: getLocalizedField(c.name_translations),
                    sub: 'সব ডাক্তার দেখুন',
                    href: `/doctors?specialty=${c.slug}`,
                  }))}
                />
                <DropdownSection
                  label="উপসর্গ"
                  items={dropdown.symptoms.map((s) => ({
                    id: s.id,
                    label: getLocalizedField(s.title_translations),
                    sub: '',
                    href: `/symptoms/${s.slug}`,
                  }))}
                />
                <button
                  onClick={() => submitSearch(query)}
                  className="flex w-full items-center gap-2 bg-brand-50 px-4 py-3 text-[14px] font-semibold text-brand-600"
                >
                  <SearchIcon className="h-4 w-4" /> &ldquo;{query}&rdquo; এর সব ফলাফল →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* State 3 — Results / State 4 — No Results */}
      {isResults && (
        <div>
          <div className="sticky top-topbar z-sticky flex gap-1 overflow-x-auto border-b border-neutral-100 bg-white px-4 [scrollbar-width:none]">
            {(
              [
                ['all', `সব (${totalResultCount})`],
                ['doctors', `ডাক্তার (${results?.doctors.length ?? 0})`],
                ['hospitals', `হাসপাতাল (${results?.hospitals.length ?? 0})`],
                ['symptoms', `উপসর্গ (${results?.symptoms.length ?? 0})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] ${
                  activeTab === key
                    ? 'border-brand-600 font-semibold text-neutral-900'
                    : 'border-transparent text-neutral-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && (
            <p className="py-8 text-center text-[13px] text-neutral-400">খোঁজা হচ্ছে...</p>
          )}

          {!loading && results && totalResultCount === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-[15px] font-semibold text-neutral-700">
                &ldquo;{submittedQuery}&rdquo; এর কোনো ফলাফল পাওয়া যায়নি
              </p>
              <p className="mt-2 text-[13px] text-neutral-500">
                বাংলায় বা ইংরেজিতে লিখে দেখুন, অথবা শুধু বিশেষজ্ঞতা লিখুন
              </p>
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-md bg-life-600 px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                💬 WhatsApp-এ জানান →
              </a>
            </div>
          )}

          {!loading && results && (
            <div className="px-4 py-3">
              {(activeTab === 'all' || activeTab === 'doctors') &&
                results.doctors.map((d) => (
                  <Link
                    key={d.id}
                    href={`/doctors/${d.slug}`}
                    className="mb-2 block rounded-lg border border-neutral-200 p-3"
                  >
                    <p className="text-[14px] font-semibold text-neutral-900">
                      {getLocalizedField(d.name_translations)}
                    </p>
                    {d.categories && (
                      <p className="text-[12px] text-brand-600">
                        {getLocalizedField(d.categories.name_translations)}
                      </p>
                    )}
                  </Link>
                ))}
              {(activeTab === 'all' || activeTab === 'hospitals') &&
                results.hospitals.map((h) => (
                  <Link
                    key={h.id}
                    href={`/hospitals/${h.slug}`}
                    className="mb-2 block rounded-lg border border-neutral-200 p-3"
                  >
                    <p className="text-[14px] font-semibold text-neutral-900">
                      {getLocalizedField(h.name_translations)}
                    </p>
                  </Link>
                ))}
              {(activeTab === 'all' || activeTab === 'symptoms') &&
                results.symptoms.map((s) => (
                  <Link
                    key={s.id}
                    href={`/symptoms/${s.slug}`}
                    className="mb-2 block rounded-lg border border-neutral-200 p-3"
                  >
                    <p className="text-[14px] font-semibold text-neutral-900">
                      {getLocalizedField(s.title_translations)}
                    </p>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}

      <VoiceSearchOverlay
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onResult={(text) => submitSearch(text)}
      />
    </div>
  );
}

function DropdownSection({
  label,
  items,
}: {
  label: string;
  items: { id: string; label: string; sub: string; href: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="bg-neutral-50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex items-center gap-2 border-b border-neutral-50 px-4 py-3"
        >
          <div>
            <p className="text-[14px] font-medium text-neutral-900">{item.label}</p>
            {item.sub && <p className="text-[12px] text-neutral-500">{item.sub}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
