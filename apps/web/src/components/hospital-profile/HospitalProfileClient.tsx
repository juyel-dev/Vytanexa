'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Share2, MoreVertical, Phone, Navigation, Star } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import type { HospitalDetail } from '@/lib/queries/hospital-detail';
import type { MatchedService } from './ServicesTab';
import { GalleryCarousel } from './GalleryCarousel';
import { InfoTab } from './InfoTab';
import { DoctorsTab } from './DoctorsTab';
import { ServicesTab } from './ServicesTab';
import { ReviewsTab, type Review } from '@/components/shared/ReviewsTab';
import { ShareSheet } from '@/components/shared/ShareSheet';
import { MoreOptionsSheet } from '@/components/shared/MoreOptionsSheet';
import { DataReportSheet } from '@/components/shared/DataReportSheet';

const TYPE_LABELS: Record<string, string> = {
  hospital: 'সরকারি হাসপাতাল',
  clinic: 'ক্লিনিক',
  diagnostic: 'ডায়াগনস্টিক সেন্টার',
  nursing_home: 'নার্সিং হোম',
};

const TABS = [
  ['info', 'তথ্য'],
  ['doctors', 'ডাক্তার'],
  ['services', 'সেবা'],
  ['reviews', 'রিভিউ'],
] as const;

/**
 * Hospital Profile — VYTANEXA-BLUEPRINT.md § S08 "Hospital Detail
 * Page". Structure per spec: "Transparent→solid topbar → Image
 * gallery → Hero info block → Sticky tab bar → Sticky bottom bar
 * (call + directions)." Client-side tab switching, same as S07 (not a
 * route change).
 */
export function HospitalProfileClient({
  hospital,
  reviews,
  matchedServices,
  unmatchedServiceKeys,
  pageUrl,
}: {
  hospital: HospitalDetail;
  reviews: Review[];
  matchedServices: MatchedService[];
  unmatchedServiceKeys: string[];
  pageUrl: string;
}) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number][0]>('info');
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const name = getLocalizedField(hospital.name_translations);
  const doctorCount = hospital.doctor_hospital_links.filter((l) => l.doctors !== null).length;
  const callNumber = hospital.has_emergency_dept
    ? (hospital.whatsapp_number ?? hospital.phone)
    : hospital.phone;
  const directionsHref = hospital.map_link
    ? hospital.map_link
    : hospital.latitude && hospital.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`
      : null;

  return (
    <div className="pb-24">
      {/* Top bar — overlays gallery, no scroll-reactivity in this
          first pass, same pragmatic call as S07 */}
      <div className="sticky top-0 z-topbar flex h-topbar items-center justify-between bg-transparent px-2">
        <Link
          href="/hospitals"
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
          <button
            onClick={() => setMoreOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image gallery */}
      <div className="-mt-topbar">
        <GalleryCarousel
          images={hospital.gallery_images.length > 0 ? hospital.gallery_images : hospital.cover_image_url ? [hospital.cover_image_url] : []}
          alt={name}
        />
      </div>

      {/* Hero info block */}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-[20px] font-bold text-neutral-900">{name}</h1>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {hospital.verification_status === 'verified' && (
              <span className="rounded-full bg-life-50 px-2 py-0.5 text-[11px] font-semibold text-life-700">
                ✅ Verified
              </span>
            )}
            {hospital.has_emergency_dept && (
              <span className="rounded-full bg-emergency-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                🚨 জরুরি
              </span>
            )}
          </div>
        </div>

        <p className="mt-1 text-[14px] text-neutral-600">
          🏥 {TYPE_LABELS[hospital.type] ?? hospital.type}
        </p>

        {hospital.rating_count > 0 && (
          <button
            onClick={() => setActiveTab('reviews')}
            className="mt-1.5 flex items-center gap-1"
          >
            <Star className="h-4 w-4 fill-accent-500 text-accent-500" />
            <span className="text-[14px] font-bold text-neutral-900">{hospital.rating_avg}</span>
            <span className="text-[13px] text-neutral-500">({hospital.rating_count} রিভিউ)</span>
          </button>
        )}

        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-neutral-600">
          📍 {hospital.address_line}
        </p>

        {hospital.has_emergency_dept && (
          <div className="mt-3 rounded-md bg-emergency-50 px-3 py-2.5">
            <p className="text-[12px] font-semibold text-emergency-700">🚨 জরুরি সেবা ২৪×৭</p>
            <a href={`tel:${callNumber}`} className="text-[14px] font-bold text-emergency-700">
              📞 {callNumber}
            </a>
          </div>
        )}
      </div>

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
            {key === 'doctors' && doctorCount > 0 && ` (${doctorCount})`}
            {key === 'reviews' && hospital.rating_count > 0 && ` (${hospital.rating_count})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && <InfoTab hospital={hospital} />}
      {activeTab === 'doctors' && <DoctorsTab links={hospital.doctor_hospital_links} />}
      {activeTab === 'services' && (
        <ServicesTab matched={matchedServices} unmatchedKeys={unmatchedServiceKeys} />
      )}
      {activeTab === 'reviews' && (
        <ReviewsTab
          entityType="hospital"
          entityId={hospital.id}
          entityName={name}
          reviews={reviews}
          ratingAvg={hospital.rating_avg}
          ratingCount={hospital.rating_count}
        />
      )}

      {/* Sticky bottom bar — call + directions, no fee display
          (S08: "hospitals don't have single appointment fee like
          doctors") */}
      <div className="fixed bottom-0 left-0 right-0 z-navbar grid h-[72px] grid-cols-2 gap-2 border-t border-neutral-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <a
          href={`tel:${callNumber}`}
          className="flex items-center justify-center gap-2 rounded-md bg-brand-600 text-[15px] font-semibold text-white"
        >
          <Phone className="h-4 w-4" /> কল করুন
        </a>
        {directionsHref ? (
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md border border-neutral-200 text-[15px] font-semibold text-neutral-700"
          >
            <Navigation className="h-4 w-4" /> দিকনির্দেশনা
          </a>
        ) : (
          <span className="flex items-center justify-center gap-2 rounded-md border border-neutral-100 text-[15px] font-semibold text-neutral-300">
            <Navigation className="h-4 w-4" /> দিকনির্দেশনা
          </span>
        )}
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={name}
        subtitle={TYPE_LABELS[hospital.type] ?? hospital.type}
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
        entityType="hospital"
        entityId={hospital.id}
      />
    </div>
  );
}
