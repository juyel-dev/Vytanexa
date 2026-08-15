'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronUp } from 'lucide-react';
import { getLocalizedField, formatRelativeTimeBn } from '@/lib/i18n';
import { getDeviceId } from '@/lib/device-id';
import type { QuestionDetail } from '@/lib/queries/qa-detail';
import type { Json } from '@vytanexa/database';

type Answer = {
  id: string;
  body: string;
  author_name: string | null;
  created_at: string;
  doctor_id: string | null;
  doctors: {
    slug: string;
    name_translations: Json;
    photo_url: string | null;
    categories: { name_translations: Json } | null;
  } | null;
};

/**
 * Question Detail — VYTANEXA-BLUEPRINT.md § S14 "Question Detail":
 * "Question body → answer list (doctor answers pinned top with ✅
 * Verified Doctor badge + doctor's specialty + link to their profile;
 * community answers below, chronological) → 'উত্তর দিন' input at
 * bottom."
 *
 * The answer form is NOT sign-in-gated here — see `/api/answers`'s own
 * comment for why (no real auth system exists yet to gate behind;
 * that's S22 scope). This stays a guest-submittable, moderated form
 * in the meantime, which is what the RLS policy actually allows today.
 */
export function QuestionDetailClient({
  question,
  doctorAnswers,
  communityAnswers,
}: {
  question: QuestionDetail;
  doctorAnswers: Answer[];
  communityAnswers: Answer[];
}) {
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(question.upvote_count);
  const [answerBody, setAnswerBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'question_view',
        entity_type: 'question',
        entity_id: question.id,
      }),
    }).catch(() => {});
  }, [question.id]);

  const handleUpvote = async () => {
    const deviceId = getDeviceId();
    // Optimistic UI, matching S15's polls: "reveals + animates
    // immediately after voting, then reconciled with server count."
    const wasUpvoted = upvoted;
    setUpvoted(!wasUpvoted);
    setUpvoteCount((c) => (wasUpvoted ? c - 1 : c + 1));

    const res = await fetch(`/api/questions/${question.id}/upvote`, {
      method: 'POST',
      body: JSON.stringify({ voterKey: deviceId }),
    });
    if (!res.ok) {
      // revert on failure
      setUpvoted(wasUpvoted);
      setUpvoteCount((c) => (wasUpvoted ? c + 1 : c - 1));
      return;
    }
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'question_upvote',
        entity_type: 'question',
        entity_id: question.id,
      }),
    }).catch(() => {});
  };

  const handleSubmitAnswer = async () => {
    if (answerBody.trim().length < 5) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/answers', {
      method: 'POST',
      body: JSON.stringify({
        question_id: question.id,
        body: answerBody,
        author_name: authorName,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'উত্তর জমা দিতে সমস্যা হয়েছে');
      return;
    }
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'answer_submit',
        entity_type: 'question',
        entity_id: question.id,
      }),
    }).catch(() => {});
    setSuccess(true);
    setAnswerBody('');
    setAuthorName('');
  };

  const displayName = question.is_anonymous
    ? 'একজন ব্যবহারকারী'
    : (question.author_name ?? 'একজন ব্যবহারকারী');

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-topbar flex h-topbar items-center border-b border-neutral-100 bg-white px-2">
        <Link
          href="/community/qa"
          className="flex h-11 w-11 items-center justify-center text-neutral-700"
          aria-label="পেছনে যান"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>

      <div className="px-4 py-4">
        <h1 className="text-[18px] font-bold leading-snug text-neutral-900">{question.title}</h1>
        {question.body && (
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-700">{question.body}</p>
        )}
        <p className="mt-2 text-[12px] text-neutral-500">
          {displayName} · {formatRelativeTimeBn(question.created_at)}
          {question.categories && ` · 🏷️ ${getLocalizedField(question.categories.name_translations)}`}
        </p>

        <button
          onClick={handleUpvote}
          className={`mt-3 flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold ${
            upvoted
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-neutral-200 text-neutral-700'
          }`}
        >
          <ChevronUp className="h-4 w-4" /> {upvoteCount} জন একমত
        </button>
      </div>

      <div className="border-t border-neutral-100 px-4 py-4">
        {doctorAnswers.length === 0 && communityAnswers.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-neutral-400">
            এখনো কোনো উত্তর নেই। প্রথম উত্তর দিন!
          </p>
        ) : (
          <>
            {doctorAnswers.map((a) => (
              <div key={a.id} className="mb-3 rounded-lg border border-life-100 bg-life-50 p-3.5">
                <div className="flex items-center gap-2">
                  {a.doctors?.photo_url && (
                    <Image
                      src={a.doctors.photo_url}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  )}
                  <div>
                    {a.doctors && (
                      <Link
                        href={`/doctors/${a.doctors.slug}`}
                        className="text-[13px] font-semibold text-life-700"
                      >
                        ✅ {getLocalizedField(a.doctors.name_translations)}
                      </Link>
                    )}
                    {a.doctors?.categories && (
                      <p className="text-[11px] text-neutral-500">
                        {getLocalizedField(a.doctors.categories.name_translations)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-800">{a.body}</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {formatRelativeTimeBn(a.created_at)}
                </p>
              </div>
            ))}
            {communityAnswers.map((a) => (
              <div key={a.id} className="mb-2.5 rounded-lg bg-neutral-50 p-3.5">
                <p className="text-[13px] font-semibold text-neutral-800">
                  {a.author_name ?? 'একজন ব্যবহারকারী'}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">{a.body}</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {formatRelativeTimeBn(a.created_at)}
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-navbar border-t border-neutral-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {success ? (
          <p className="text-center text-[13px] font-semibold text-life-600">
            ✅ ধন্যবাদ! অনুমোদনের পর প্রকাশিত হবে
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={answerBody}
                onChange={(e) => setAnswerBody(e.target.value)}
                placeholder="উত্তর দিন..."
                className="h-11 flex-1 rounded-full border border-neutral-200 px-4 text-[14px]"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || answerBody.trim().length < 5}
                className="rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                {submitting ? '...' : 'পাঠান'}
              </button>
            </div>
            {answerBody.length > 0 && (
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="আপনার নাম (ঐচ্ছিক)"
                className="mt-2 h-9 w-full rounded-md border border-neutral-200 px-3 text-[13px]"
              />
            )}
            {error && <p className="mt-1 text-[12px] text-emergency-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
