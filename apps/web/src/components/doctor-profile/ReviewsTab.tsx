'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  admin_reply: string | null;
  created_at: string;
};

/**
 * Tab 3 — রিভিউ (Reviews) — VYTANEXA-BLUEPRINT.md § S07 Tab 3.
 * Rating distribution bars computed client-side from the same
 * `reviews` prop (approved reviews only, fetched server-side by the
 * parent page) — no separate aggregate query needed since
 * `doctor.rating_avg`/`rating_count` already carry the DB-trigger-
 * maintained totals (DATABASE-SCHEMA.md § 4.1).
 */
export function ReviewsTab({
  doctorId,
  doctorName,
  reviews,
  ratingAvg,
  ratingCount,
}: {
  doctorId: string;
  doctorName: string;
  reviews: Review[];
  ratingAvg: number;
  ratingCount: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="pb-20">
      <div className="px-4 py-5 text-center">
        <p className="text-[40px] font-bold text-neutral-900">{ratingAvg || '—'}</p>
        <div className="flex justify-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i <= Math.round(ratingAvg) ? 'fill-accent-500 text-accent-500' : 'text-neutral-200'}`}
            />
          ))}
        </div>
        <p className="text-[13px] text-neutral-500">{ratingCount} রিভিউ ভিত্তিতে</p>
      </div>

      {ratingCount > 0 && (
        <div className="px-4 pb-4">
          {distribution.map(({ star, count }) => (
            <div key={star} className="mb-1 flex items-center gap-2 text-[13px]">
              <span className="w-8 text-neutral-600">{star} ★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full bg-accent-500 transition-all"
                  style={{ width: `${ratingCount > 0 ? (count / ratingCount) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right text-neutral-500">{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-neutral-100 px-4 py-3">
        {reviews.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-neutral-400">
            এখনো কোনো রিভিউ নেই। প্রথম রিভিউ দিন!
          </p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="mb-2.5 rounded-lg bg-neutral-50 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-neutral-900">{r.reviewer_name}</p>
                <p className="text-[12px] text-neutral-400">
                  {new Date(r.created_at).toLocaleDateString('bn-BD')}
                </p>
              </div>
              <div className="mt-0.5 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i <= r.rating ? 'fill-accent-500 text-accent-500' : 'text-neutral-200'}`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-700">{r.review_text}</p>
              {r.admin_reply && (
                <div className="mt-2 rounded-md bg-brand-50 p-2.5">
                  <p className="text-[12px] font-semibold text-brand-700">
                    💬 ডাক্তারের প্রতিক্রিয়া:
                  </p>
                  <p className="text-[13px] text-neutral-700">{r.admin_reply}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-[calc(theme(spacing.navbar)+72px+env(safe-area-inset-bottom))] left-4 right-4 z-sticky">
        <button
          onClick={() => setModalOpen(true)}
          className="h-11 w-full rounded-md border-2 border-life-600 bg-white text-[14px] font-semibold text-life-600 shadow-lg"
        >
          + আপনার রিভিউ দিন
        </button>
      </div>

      <ReviewSubmissionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        doctorId={doctorId}
        doctorName={doctorName}
      />
    </div>
  );
}

function ReviewSubmissionModal({
  open,
  onClose,
  doctorId,
  doctorName,
}: {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
}) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = rating > 0 && name.trim().length >= 2 && text.trim().length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        doctor_id: doctorId,
        reviewer_name: name,
        rating,
        review_text: text,
        honeypot,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'সাবমিট করতে সমস্যা হয়েছে');
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setRating(0);
      setName('');
      setText('');
    }, 1500);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="রিভিউ দিন">
      {success ? (
        <p className="py-8 text-center text-[15px] font-semibold text-life-600">
          ✅ ধন্যবাদ! অনুমোদনের পর দেখা যাবে
        </p>
      ) : (
        <>
          <p className="mb-3 text-center text-[14px] text-neutral-700">
            {doctorName} কে রেট করুন
          </p>
          <div className="mb-4 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)} aria-label={`${i} star`}>
                <Star
                  className={`h-9 w-9 transition-transform active:scale-110 ${
                    i <= rating ? 'fill-accent-500 text-accent-500' : 'text-neutral-200'
                  }`}
                />
              </button>
            ))}
          </div>

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            আপনার নাম *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            আপনার অভিজ্ঞতা * (কমপক্ষে ২০ অক্ষর)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            rows={4}
            className="mb-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-[14px]"
          />
          <p className="mb-3 text-right text-[11px] text-neutral-400">{text.length}/500 অক্ষর</p>

          {/* Honeypot -- visually hidden, never seen by real users */}
          <input
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="absolute -left-[9999px]"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="h-12 w-full rounded-md bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? 'সাবমিট হচ্ছে...' : 'রিভিউ সাবমিট করুন'}
          </button>
          <p className="mt-2 text-center text-[11px] text-neutral-400">
            আপনার রিভিউ অনুমোদনের পর প্রকাশিত হবে
          </p>
        </>
      )}
    </BottomSheet>
  );
}
