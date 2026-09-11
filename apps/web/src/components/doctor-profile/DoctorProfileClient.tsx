'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Share2, MoreVertical, Star, Calendar } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { useLocalizedField, useFormatter, SPOKEN_LANGUAGE_LABELS } from '@/lib/i18n-client';
import type { DoctorDetail } from '@/lib/queries/doctor-detail';
import { InfoTab } from './InfoTab';
import { ChambersTab } from './ChambersTab';
import { HospitalsTab } from './HospitalsTab';
import { AppointmentSheet } from './AppointmentSheet';
import { ShareSheet } from '@/components/shared/ShareSheet';
import { ReviewsTab } from '@/components/shared/ReviewsTab';
import { MoreOptionsSheet } from '@/components/shared/MoreOptionsSheet';
import { DataReportSheet } from '@/components/shared/DataReportSheet';

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  admin_reply: string | null;
  created_at: string;
};

const TAB_KEYS = ['info', 'chambers', 'reviews', 'hospitals'] as const;

/**
 * Doctor Profile — VYTANEXA-BLUEPRINT.md § S07, the "most critical
 * page" per the spec's own framing. Client-side tab switching (not a
 * route change, per spec: "NOT route change — client state").
 */
export function DoctorProfileClient({
  doctor,
  reviews,
  pageUrl,
}: {
  doctor: DoctorDetail;
  reviews: Review[];
  pageUrl: string;
}) {
  const localize = useLocalizedField();
  const t = useT('doctor');
  const tc = useT('common');
  const tShared = useT('shared');
  const format = useFormatter();
  const tabLabels = t.raw('tabs' as Parameters<typeof t.raw>[0]) as Record<string, string>;
  const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>('info');
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const name = localize(doctor.name_translations);
  const specialty = doctor.categories
    ? localize(doctor.categories.name_translations)
    : '';
  const initials = name.slice(0, 1) || 'D';
  const primaryChamber = doctor.chambers.find((c) => c.is_primary) ?? doctor.chambers[0];
  const feeText =
    doctor.consultation_fee_min != null
      ? doctor.consultation_fee_max &&
        doctor.consultation_fee_max !== doctor.consultation_fee_min
        ? format.currencyRange(doctor.consultation_fee_min, doctor.consultation_fee_max)
        : format.currency(doctor.consultation_fee_min)
      : primaryChamber?.consultation_fee
        ? format.currency(primaryChamber.consultation_fee)
        : null;

  return (
    <div className="pb-24">
      {/* Top bar — overlays hero, no scroll-reactivity in this first
          pass (S07's Variant C transparent->solid transition is a
          nice-to-have polish item, not required for correctness) */}
      <div className="sticky top-0 z-topbar flex h-topbar items-center justify-between bg-gradient-to-b from-black/40 to-transparent px-2">
        <Link
          href="/doctors"
          aria-label={tc('goBack')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setShareOpen(true)}
            aria-label={t('shareAriaLabel')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMoreOpen(true)}
            aria-label={tShared('moreOptions.title')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="-mt-topbar bg-gradient-to-br from-brand-600 to-brand-700 px-6 pb-6 pt-16 text-center">
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-brand-500 text-3xl font-bold text-white shadow-lg">
          {doctor.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.photo_url}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
          {doctor.verification_status === 'verified' && (
            <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-life-600 text-white">
              ✓
            </span>
          )}
        </div>

        <h1 className="mt-3 text-[22px] font-bold text-white">{name}</h1>
        {specialty && <p className="text-[15px] text-white/90">{specialty}</p>}
        {doctor.degree.length > 0 && (
          <p className="text-[13px] text-white/75">{doctor.degree.slice(0, 3).join(', ')}</p>
        )}

        {doctor.rating_count > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <Star className="h-4 w-4 fill-accent-400 text-accent-400" />
            <span className="text-[16px] font-bold text-white">{doctor.rating_avg}</span>
            <button
              onClick={() => setActiveTab('reviews')}
              className="text-[13px] text-white/80 underline"
            >
              {t('seeReviewsCount', { count: doctor.rating_count })}
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {doctor.is_featured && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-600">
              PRO
            </span>
          )}
          {doctor.rating_count >= 10 && (
            <span className="rounded-full bg-accent-400 px-2.5 py-1 text-[11px] font-bold text-brand-700">
              {t('popularBadge')}
            </span>
          )}
          <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] text-white">
            {t('experience', { years: doctor.experience_years })}
          </span>
        </div>
      </div>

      {/* Trust strip */}
      {(doctor.bmdc_registration_no || doctor.languages.length > 0) && (
        <div className="flex flex-wrap gap-4 border-b border-neutral-100 bg-white px-4 py-2.5 text-[12px] text-neutral-600">
          {doctor.bmdc_registration_no && <span>🏛️ BMDC: {doctor.bmdc_registration_no}</span>}
          {doctor.languages.length > 0 && (
            <span>
              🗣️{' '}
              {doctor.languages
                .map((l) => SPOKEN_LANGUAGE_LABELS[l] ?? l)
                .join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Sticky tab bar */}
      <div className="sticky top-topbar z-sticky flex border-b border-neutral-200 bg-white">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 border-b-2 py-3 text-[14px] font-semibold ${
              activeTab === key
                ? 'border-brand-600 text-neutral-900'
                : 'border-transparent text-neutral-500'
            }`}
          >
            {tabLabels[key]}
            {key === 'reviews' && doctor.rating_count > 0 && ` (${doctor.rating_count})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && <InfoTab doctor={doctor} />}
      {activeTab === 'chambers' && <ChambersTab chambers={doctor.chambers} />}
      {activeTab === 'reviews' && (
        <ReviewsTab
          entityType="doctor"
          entityId={doctor.id}
          entityName={name}
          reviews={reviews}
          ratingAvg={doctor.rating_avg}
          ratingCount={doctor.rating_count}
        />
      )}
      {activeTab === 'hospitals' && (
        <HospitalsTab
          links={doctor.doctor_hospital_links}
          onGoToChambers={() => setActiveTab('chambers')}
        />
      )}

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-1/2 z-navbar flex h-[72px] w-full max-w-[480px] -translate-x-1/2 items-center justify-between border-t border-neutral-200 bg-white px-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div>
          <p className="text-[12px] text-neutral-500">{t('visitFeeLabel')}</p>
          <p className="text-[18px] font-bold text-neutral-900">{feeText ?? '—'}</p>
        </div>
        <button
          onClick={() => setAppointmentOpen(true)}
          className="flex h-12 items-center gap-2 rounded-md bg-brand-600 px-6 text-[15px] font-semibold text-white"
        >
          <Calendar className="h-4 w-4" /> {t('appointmentShort')}
        </button>
      </div>

      <AppointmentSheet
        open={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
        doctorId={doctor.id}
        doctorName={name}
        chambers={doctor.chambers}
        whatsappNumber={doctor.whatsapp_number}
      />
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={name}
        subtitle={specialty}
        url={pageUrl}
      />
      <MoreOptionsSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onReportClick={() => setReportOpen(true)}
      />
      <DataReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        entityType="doctor"
        entityId={doctor.id}
      />
    </div>
  );
}
