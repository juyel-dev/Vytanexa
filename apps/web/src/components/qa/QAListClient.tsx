'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronUp } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { useLocalizedField } from '@/lib/i18n-client';
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

const FILTERS = ['all', 'answered', 'unanswered'] as const;

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
  doctorAnsweredIds: initialDoctorAnsweredIds,
  loadError = false,
  categories,
}: {
  initialQuestions: QuestionListItem[];
  initialCount: number;
  doctorAnsweredIds: Set<string>;
  loadError?: boolean;
  categories: Category[];
}) {
  const t = useT('qa');
  const tc = useT('common');
  const localize = useLocalizedField();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState(initialQuestions);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialQuestions.length < initialCount);
  const [askOpen, setAskOpen] = useState(false);
  const [doctorAnsweredIds, setDoctorAnsweredIds] = useState(initialDoctorAnsweredIds);
  const [moreFailed, setMoreFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Query string the displayed list belongs to — a slow load-more for an
  // OLD filter must not append into the list of a NEW one.
  const queryKeyRef = useRef(searchParams.toString());
  queryKeyRef.current = searchParams.toString();

  useEffect(() => {
    setQuestions(initialQuestions);
    setCount(initialCount);
    setPage(0);
    setHasMore(initialQuestions.length < initialCount);
    setDoctorAnsweredIds(initialDoctorAnsweredIds);
    setMoreFailed(false);
  }, [initialQuestions, initialCount, initialDoctorAnsweredIds]);

  // Previously a 500/404 was parsed as `{}`: nothing appended and `hasMore`
  // became undefined -> a false "no more questions". Now: retry button,
  // stale (old-filter) responses dropped, de-dupe by id.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setMoreFailed(false);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    const requestKey = params.toString();
    params.set('page', String(nextPage));
    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (queryKeyRef.current !== requestKey) return; // filter changed meanwhile
      setQuestions((prev) => {
        const seen = new Set(prev.map((q) => q.id));
        return [...prev, ...(json.questions ?? []).filter((q: QuestionListItem) => !seen.has(q.id))];
      });
      setDoctorAnsweredIds((prev) => new Set([...prev, ...(json.doctorAnsweredIds ?? [])]));
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

  const activeFilter = searchParams.get('filter') ?? 'all';
  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    value && value !== 'all' ? params.set(key, value) : params.delete(key);
    // replace, not push — chip taps shouldn't stack history entries.
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-[17px] font-bold text-neutral-900">{t('heading')}</h1>
        <button
          onClick={() => setAskOpen(true)}
          className="rounded-full bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          + {t('askQuestion')}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-2.5 [scrollbar-width:none]">
        {FILTERS.map((value) => (
          <button
            key={value}
            aria-pressed={activeFilter === value}
            onClick={() => updateParam('filter', value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${
              activeFilter === value
                ? 'bg-brand-600 text-white'
                : 'border border-neutral-200 text-neutral-700'
            }`}
          >
            {t(`filter.${value}`)}
          </button>
        ))}
      </div>

      {questions.length === 0 && loadError ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">{tc('error')}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 h-11 rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white"
          >
            {tc('retry')}
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-neutral-700">
            {t('noQuestionsYet')}
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
                <span>💬 {t('answersCount', { count: q.answer_count })}</span>
                {q.categories && (
                  <span>🏷️ {localize(q.categories.name_translations)}</span>
                )}
              </p>
              {doctorAnsweredIds.has(q.id) && (
                <p className="mt-1 text-[12px] font-semibold text-life-600">
                  {t('verifiedDoctorAnswered')}
                </p>
              )}
            </Link>
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-[13px] text-neutral-400">
              {moreFailed ? (
                <button
                  onClick={loadMore}
                  className="h-10 rounded-md border border-neutral-300 px-5 font-semibold text-neutral-700"
                >
                  {tc('retry')}
                </button>
              ) : loadingMore ? (
                tc('loading')
              ) : (
                ''
              )}
            </div>
          )}
          {!hasMore && !moreFailed && (
            <p className="py-6 text-center text-[13px] text-neutral-400">{t('noMoreQuestions')}</p>
          )}
        </>
      )}

      <AskQuestionSheet open={askOpen} onClose={() => setAskOpen(false)} categories={categories} />
    </div>
  );
}
