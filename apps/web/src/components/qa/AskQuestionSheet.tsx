'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getLocalizedField } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';

type Category = { id: string; slug: string; name_translations: Json };

/**
 * Ask a Question — VYTANEXA-BLUEPRINT.md § S14. Anonymous checkbox
 * ("গুরুত্বপূর্ণ for sensitive health topics") hides the name field
 * when checked rather than just ignoring it, so the person isn't left
 * wondering whether their name will show. Moderated before publish —
 * "প্রশ্নটি অনুমোদনের পর প্রকাশিত হবে" shown in the success state, not
 * an immediate redirect to the (not-yet-visible) question.
 */
export function AskQuestionSheet({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = title.trim().length >= 10 && categoryId && (isAnonymous || authorName.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/questions', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        category_id: categoryId,
        is_anonymous: isAnonymous,
        author_name: isAnonymous ? null : authorName,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'প্রশ্ন জমা দিতে সমস্যা হয়েছে');
      return;
    }
    setSuccess(true);
    router.refresh();
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setTitle('');
      setBody('');
      setCategoryId('');
      setIsAnonymous(false);
      setAuthorName('');
    }, 1800);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="প্রশ্ন করুন">
      {success ? (
        <p className="py-8 text-center text-[15px] font-semibold text-life-600">
          ✅ ধন্যবাদ! প্রশ্নটি অনুমোদনের পর প্রকাশিত হবে
        </p>
      ) : (
        <>
          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            শিরোনাম *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="আপনার প্রশ্ন সংক্ষেপে লিখুন"
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">বিস্তারিত</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mb-3 w-full rounded-md border border-neutral-200 px-3 py-2 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">বিভাগ *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          >
            <option value="">নির্বাচন করুন</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {getLocalizedField(c.name_translations)}
              </option>
            ))}
          </select>

          <label className="mb-3 flex items-center gap-2 text-[13px] text-neutral-700">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <span>নাম গোপন রাখুন (বেনামে জিজ্ঞাসা করুন)</span>
          </label>

          {!isAnonymous && (
            <>
              <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                আপনার নাম *
              </label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
              />
            </>
          )}

          {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="h-12 w-full rounded-md bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? 'জমা হচ্ছে...' : 'প্রশ্ন জমা দিন'}
          </button>
          <p className="mt-2 text-center text-[11px] text-neutral-400">
            প্রশ্নটি অনুমোদনের পর প্রকাশিত হবে।
          </p>
        </>
      )}
    </BottomSheet>
  );
}
