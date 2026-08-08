'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Share2, AlertTriangle } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import type { SymptomDetail } from '@/lib/queries/symptom-detail';
import { ShareSheet } from '@/components/shared/ShareSheet';

type SpecialtyLink = SymptomDetail['symptom_categories'][number];

/**
 * Symptom Detail — VYTANEXA-BLUEPRINT.md § S09 "Symptom Detail Page".
 * Emergency banner (if `is_emergency`) is "the single most important
 * visual escalation in the whole app" per spec, positioned immediately
 * below the cover image. Content sections auto-hidden if empty (see
 * `lib/queries/symptom-detail.ts` for the common_causes/
 * when_to_see_doctor schema-gap note — those two sections never
 * render today since the columns don't exist).
 */
export function SymptomDetailClient({
  symptom,
  doctorCounts,
  pageUrl,
}: {
  symptom: SymptomDetail;
  doctorCounts: Map<string, number>;
  pageUrl: string;
}) {
  const [shareOpen, setShareOpen] = useState(false);

  const title = getLocalizedField(symptom.title_translations);
  const description = getLocalizedField(symptom.description_translations);
  const specialties = [...symptom.symptom_categories]
    .filter((l): l is SpecialtyLink & { categories: NonNullable<SpecialtyLink['categories']> } =>
      l.categories !== null
    )
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-topbar flex h-topbar items-center justify-between border-b border-neutral-100 bg-white px-2">
        <Link
          href="/symptoms"
          className="flex h-11 w-11 items-center justify-center text-neutral-700"
          aria-label="পেছনে যান"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 truncate text-center text-[17px] font-semibold text-neutral-900">
          {title}
        </h1>
        <button
          onClick={() => setShareOpen(true)}
          className="flex h-11 w-11 items-center justify-center text-neutral-700"
          aria-label="শেয়ার করুন"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {symptom.cover_image_url && (
        <div className="relative h-[200px] w-full bg-neutral-100">
          <Image src={symptom.cover_image_url} alt={title} fill className="object-cover" />
        </div>
      )}

      {symptom.is_emergency && (
        <div className="mx-4 mt-4 rounded-lg border-l-4 border-emergency-600 bg-emergency-50 p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-emergency-600" />
            <h2 className="text-[14px] font-bold text-emergency-700">🚨 জরুরি সতর্কতা</h2>
          </div>
          <p className="mb-3 text-[13px] leading-relaxed text-emergency-700">
            এই লক্ষণ গুরুতর হতে পারে। দেরি না করে নিকটস্থ হাসপাতালে যান বা ১০২ নম্বরে কল করুন।
          </p>
          <Link
            href="/emergency"
            className="flex h-11 items-center justify-center rounded-md bg-emergency-600 text-[14px] font-semibold text-white"
          >
            🚨 জরুরি সেবা দেখুন →
          </Link>
        </div>
      )}

      {description && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">বিবরণ</h3>
          <p className="text-[14px] leading-relaxed text-neutral-700">{description}</p>
        </section>
      )}

      {specialties.length > 0 && (
        <section className="px-4 py-4">
          <h3 className="mb-3 text-[15px] font-bold text-neutral-800">এই বিশেষজ্ঞ দেখুন</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {specialties.map((link) => {
              const name = getLocalizedField(link.categories.name_translations);
              const count = doctorCounts.get(link.categories.id) ?? 0;
              return (
                <Link
                  key={link.categories.id}
                  href={`/doctors?specialty=${link.categories.slug}`}
                  className="rounded-lg border border-neutral-200 p-3.5 text-center transition-transform active:scale-95"
                >
                  <p className="text-[14px] font-semibold text-neutral-900">{name}</p>
                  <p className="mt-0.5 text-[12px] text-neutral-500">{count} জন</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="px-4 py-2">
        <Link
          href={
            specialties.length > 0
              ? `/doctors?specialty=${specialties.map((s) => s.categories.slug).join(',')}`
              : '/doctors'
          }
          className="flex h-12 items-center justify-center rounded-md bg-brand-600 text-[15px] font-semibold text-white"
        >
          সংশ্লিষ্ট বিশেষজ্ঞ ডাক্তার খুঁজুন →
        </Link>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={title}
        subtitle="Vytanexa"
        url={pageUrl}
      />
    </div>
  );
}
