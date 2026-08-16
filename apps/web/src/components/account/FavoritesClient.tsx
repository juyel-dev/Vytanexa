'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DoctorCard, type DoctorCardData } from '@/components/shared/DoctorCard';
import { HospitalCard, type HospitalCardData } from '@/components/shared/HospitalCard';

/**
 * Favorites — VYTANEXA-BLUEPRINT.md § S17 "Favorites": doctor/hospital
 * tabs with counts, full-variant cards (same `DoctorCard`/
 * `HospitalCard` used everywhere else — unfavoriting here works via
 * the exact same heart toggle, no separate "remove" affordance
 * needed). Empty state per spec: "এখনো কোনো পছন্দ যোগ করেননি" +
 * "ডাক্তার খুঁজুন →" CTA.
 */
export function FavoritesClient({
  doctors,
  hospitals,
}: {
  doctors: DoctorCardData[];
  hospitals: HospitalCardData[];
}) {
  const [tab, setTab] = useState<'doctors' | 'hospitals'>(
    doctors.length === 0 && hospitals.length > 0 ? 'hospitals' : 'doctors'
  );

  if (doctors.length === 0 && hospitals.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="mb-3 text-[15px] font-semibold text-neutral-700">
          এখনো কোনো পছন্দ যোগ করেননি
        </p>
        <Link href="/doctors" className="text-[14px] font-semibold text-brand-600">
          ডাক্তার খুঁজুন →
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={() => setTab('doctors')}
          className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
            tab === 'doctors' ? 'bg-brand-600 text-white' : 'border border-neutral-200 text-neutral-700'
          }`}
        >
          ডাক্তার ({doctors.length})
        </button>
        <button
          onClick={() => setTab('hospitals')}
          className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
            tab === 'hospitals'
              ? 'bg-brand-600 text-white'
              : 'border border-neutral-200 text-neutral-700'
          }`}
        >
          হাসপাতাল ({hospitals.length})
        </button>
      </div>

      {tab === 'doctors' ? (
        doctors.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-neutral-400">
            পছন্দের তালিকায় কোনো ডাক্তার নেই
          </p>
        ) : (
          doctors.map((d) => <DoctorCard key={d.id} doctor={d} />)
        )
      ) : hospitals.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13px] text-neutral-400">
          পছন্দের তালিকায় কোনো হাসপাতাল নেই
        </p>
      ) : (
        hospitals.map((h) => <HospitalCard key={h.id} hospital={h} />)
      )}
    </div>
  );
}
