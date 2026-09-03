'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronUp } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import { AskQuestionSheet } from './AskQuestionSheet';
import type { Json } from '@vytanexa/database';

type QuestionListItem = {
  id: string;
  title: string;
  is_anonymous: boolean;
  author_name: string | null;
  upvote_count: number;
  answer_count: number;
  category_id: string | null;
  categories: { name_translations: Json } | null;
};
type Category = { id: string; slug: string; name_translations: Json };

const FILTERS: [string, string][] = [
  ['all', 'সব'],
  ['answered', 'উত্তর দেওয়া হয়েছে'],
  ['unanswered', 'অনুত্তরিত'],
];

/**
 * Q&A List Client — VYTANEXA-BLUEPRINT.md § S14. Filter/sort chips +
 * infinite scroll, same SSR-hydrate architecture as S08/S13.
 * `doctorAnsweredIds` (from `getDoctorAnsweredQuestionIds`) drives the
 * "✅ verified doctor" badge — computed server-side for the initial
 * page; subsequent infinite-scroll pages fall back to just showing
 * the answer count without that badge (a minor, acceptable gap since
 * the API route doesn't currently recompute it per page — flagged in
 * TODO.md rather than adding another round-trip for cosmetic parity).
 */
export function QAListClient({
  initialQuestions,
  initialCount,
  doctorAnsweredIds,
  categories,
}: {
  initialQuestions: QuestionListItem[];
  initialCount: number;
  doctorAnsweredIds: Set<string>;
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState(initialQuestions);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialQuestions.length < initialCount);
  const [askOpen, setAskOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuestions(initialQuestions);
    setCount(initialCount);
    setPage(0);
    setHasMore(initialQuestions.length < initialCount);
  }, [initialQuestions, initialCount]);

  // useCallback with real deps — the observer always calls the latest
  // closure, so a slow in-flight page can't append with a stale `page`.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      const json = await res.json();
      setQuestions((prev) => [...prev, ...(json.questions ?? [])]);
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

  const activeFilter = searchParams.get('filter') ?? 'all';
  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    value && value !== 'all' ? params.set(key, value) : params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-[17px] font-bold text-neutral-900">প্রশ্নোত্তর</h1>
        <button
          onClick={() => setAskOpen(true)}
          className="rounded-full bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          + প্রশ্ন করুন
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-2.5 [scrollbar-width:none]">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => updateParam('filter', value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
              activeFilter === value
                ? 'bg-brand-600 text-white'
                : 'border border-neutral-200 text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {questions.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            এখনো কোনো প্রশ্ন নেই। প্রথম প্রশ্নটি করুন!
          </p>
        </div>
      ) : (
        <>
          {questions.map((q) => (
            <Link
              key={q.id}
              href={`/community/qa/${q.id}`}
              className="mx-4 mb-2.5 block rounded-lg border border-neutral-200 p-3.5"
            >
              <p className="text-[14px] font-semibold text-neutral-900">{q.title}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500">
                <span className="flex items-center gap-0.5">
                  <ChevronUp className="h-3.5 w-3.5" /> {q.upvote_count}
                </span>
                <span>💬 {q.answer_count} উত্তর</span>
                {q.categories && (
                  <span>🏷️ {getLocalizedField(q.categories.name_translations)}</span>
                )}
              </p>
              {doctorAnsweredIds.has(q.id) && (
                <p className="mt-1 text-[12px] font-semibold text-life-600">
                  ✅ ভেরিফাইড ডাক্তার উত্তর দিয়েছেন
                </p>
              )}
            </Link>
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-[13px] text-neutral-400">
              {loadingMore ? 'লোড হচ্ছে...' : ''}
            </div>
          )}
          {!hasMore && (
            <p className="py-6 text-center text-[13px] text-neutral-400">আর কোনো প্রশ্ন নেই</p>
          )}
        </>
      )}

      <AskQuestionSheet open={askOpen} onClose={() => setAskOpen(false)} categories={categories} />
    </div>
  );
}
