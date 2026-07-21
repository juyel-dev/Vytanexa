'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getLocalizedField } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';

type Category = { id: string; slug: string; name_translations: Json };

const LANGUAGES = [
  { code: 'bn', label: 'বাংলা' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
];

/**
 * Filter Sheet — VYTANEXA-BLUEPRINT.md § S06 "FILTER SHEET — Full Modal"
 * District filtering deferred (see lib/queries/doctor-list.ts comment
 * — needs real chamber data to be meaningful); everything else in the
 * spec that's queryable today is wired: specialty multi-select, fee
 * range, rating, language.
 */
export function FilterSheet({
  open,
  onClose,
  categories,
  currentParams,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  currentParams: URLSearchParams;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [specialties, setSpecialties] = useState<string[]>(
    currentParams.get('specialty')?.split(',').filter(Boolean) ?? []
  );
  const [feeMax, setFeeMax] = useState(Number(currentParams.get('feeMax') ?? '2000'));
  const [rating, setRating] = useState(currentParams.get('rating') ?? 'any');
  const [languages, setLanguages] = useState<string[]>(
    currentParams.get('languages')?.split(',').filter(Boolean) ?? []
  );

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(currentParams);
    specialties.length > 0
      ? params.set('specialty', specialties.join(','))
      : params.delete('specialty');
    feeMax < 2000 ? params.set('feeMax', String(feeMax)) : params.delete('feeMax');
    rating !== 'any' ? params.set('rating', rating) : params.delete('rating');
    languages.length > 0
      ? params.set('languages', languages.join(','))
      : params.delete('languages');
    router.push(`${pathname}?${params.toString()}`);
    onClose();
  };

  const resetFilters = () => {
    setSpecialties([]);
    setFeeMax(2000);
    setRating('any');
    setLanguages([]);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="ফিল্টার">
      <div className="mb-4">
        <p className="mb-2 text-[13px] font-semibold text-neutral-700">বিশেষজ্ঞতা</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = specialties.includes(c.slug);
            return (
              <button
                key={c.id}
                onClick={() => toggle(specialties, setSpecialties, c.slug)}
                className={`rounded-full px-3 py-1.5 text-[12px] ${
                  active ? 'bg-brand-600 text-white' : 'border border-neutral-200 text-neutral-700'
                }`}
              >
                {active && '✓ '}
                {getLocalizedField(c.name_translations)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[13px] font-semibold text-neutral-700">
          সর্বোচ্চ ভিজিট ফি: ₹{feeMax}
        </p>
        <input
          type="range"
          min={0}
          max={2000}
          step={50}
          value={feeMax}
          onChange={(e) => setFeeMax(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[13px] font-semibold text-neutral-700">রেটিং</p>
        <div className="flex gap-2">
          {[
            ['4.5', '৪.৫+ অসাধারণ'],
            ['4.0', '৪.০+ ভালো'],
            ['any', 'যেকোনো'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRating(value!)}
              className={`rounded-full px-3 py-1.5 text-[12px] ${
                rating === value
                  ? 'bg-brand-600 text-white'
                  : 'border border-neutral-200 text-neutral-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[13px] font-semibold text-neutral-700">ভাষা</p>
        <div className="flex gap-2">
          {LANGUAGES.map((l) => {
            const active = languages.includes(l.code);
            return (
              <button
                key={l.code}
                onClick={() => toggle(languages, setLanguages, l.code)}
                className={`rounded-full px-3 py-1.5 text-[12px] ${
                  active ? 'bg-brand-600 text-white' : 'border border-neutral-200 text-neutral-700'
                }`}
              >
                {active && '✓ '}
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 border-t border-neutral-100 pt-3">
        <button
          onClick={resetFilters}
          className="h-11 flex-1 rounded-md border border-neutral-200 text-[13px] font-medium text-neutral-600"
        >
          রিসেট
        </button>
        <button
          onClick={applyFilters}
          className="h-11 flex-[2] rounded-md bg-brand-600 text-[14px] font-semibold text-white"
        >
          ফলাফল দেখুন
        </button>
      </div>
    </BottomSheet>
  );
}
