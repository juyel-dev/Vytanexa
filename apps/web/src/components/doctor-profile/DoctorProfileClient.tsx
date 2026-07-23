'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Share2, MoreVertical, Star, Calendar } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import type { DoctorDetail } from '@/lib/queries/doctor-detail';
import { InfoTab } from './InfoTab';
import { ChambersTab } from './ChambersTab';
import { ReviewsTab } from './ReviewsTab';
import { HospitalsTab } from './HospitalsTab';
import { AppointmentSheet } from './AppointmentSheet';
import { ShareSheet } from '@/components/shared/ShareSheet';

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  admin_reply: string | null;
  created_at: string;
};

const TABS = [
  ['info', 'তথ্য'],
  ['chambers', 'চেম্বার'],
  ['reviews', 'রিভিউ'],
  ['hospitals', 'হাসপাতাল'],
] as const;

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
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number][0]>('info');
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const name = getLocalizedField(doctor.name_translations);
  const specialty = doctor.categories
    ? getLocalizedField(doctor.categories.name_translations)
    : '';
  const initials = name.slice(0, 1) || 'D';
  const primaryChamber = doctor.chambers.find((c) => c.is_primary) ?? doctor.chambers[0];
  const feeText =
    doctor.consultation_fee_min != null
      ? doctor.consultation_fee_max &&
        doctor.consultation_fee_max !== doctor.consultation_fee_min
        ? `₹${doctor.consultation_fee_min}-${doctor.consultation_fee_max}`
        : `₹${doctor.consultation_fee_min}`
      : primaryChamber?.consultation_fee
        ? `₹${primaryChamber.consultation_fee}`
        : null;

  return (
    <div className="pb-24">
      {/* Top bar — overlays hero, no scroll-reactivity in this first
          pass (S07's Variant C transparent->solid transition is a
          nice-to-have polish item, not required for correctness) */}
      <div className="sticky top-0 z-topbar flex h-topbar items-center justify-between bg-brand-600/0 px-2">
        <Link
          href="/doctors"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white">
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
              ({doctor.rating_count} রিভিউ দেখুন)
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
              🔥 জনপ্রিয়
            </span>
          )}
          <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] text-white">
            {doctor.experience_years}+ বছর অভিজ্ঞতা
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
                .map((l) => (l === 'bn' ? 'বাংলা' : l === 'en' ? 'English' : 'हिन्दी'))
                .join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Sticky tab bar */}
      <div className="sticky top-topbar z-sticky flex border-b border-neutral-200 bg-white">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 border-b-2 py-3 text-[14px] font-semibold ${
              activeTab === key
                ? 'border-brand-600 text-neutral-900'
                : 'border-transparent text-neutral-500'
            }`}
          >
            {label}
            {key === 'reviews' && doctor.rating_count > 0 && ` (${doctor.rating_count})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && <InfoTab doctor={doctor} />}
      {activeTab === 'chambers' && <ChambersTab chambers={doctor.chambers} />}
      {activeTab === 'reviews' && (
        <ReviewsTab
          doctorId={doctor.id}
          doctorName={name}
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
      <div className="fixed bottom-0 left-0 right-0 z-navbar flex h-[72px] items-center justify-between border-t border-neutral-200 bg-white px-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div>
          <p className="text-[12px] text-neutral-500">💰 ভিজিট ফি</p>
          <p className="text-[18px] font-bold text-neutral-900">{feeText ?? '—'}</p>
        </div>
        <button
          onClick={() => setAppointmentOpen(true)}
          className="flex h-12 items-center gap-2 rounded-md bg-brand-600 px-6 text-[15px] font-semibold text-white"
        >
          <Calendar className="h-4 w-4" /> অ্যাপয়েন্টমেন্ট
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
    </div>
  );
}
