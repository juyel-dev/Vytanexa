'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getLocalizedField } from '@/lib/i18n';
import type { DoctorDetail } from '@/lib/queries/doctor-detail';

type HospitalLink = DoctorDetail['doctor_hospital_links'][number];

/**
 * Tab 4 — হাসপাতাল (Hospital Affiliations) — VYTANEXA-BLUEPRINT.md §
 * S07 Tab 4.
 */
export function HospitalsTab({
  links,
  onGoToChambers,
}: {
  links: HospitalLink[];
  onGoToChambers: () => void;
}) {
  if (links.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-neutral-600">
          এই ডাক্তার কোনো হাসপাতালের সাথে যুক্ত নেই। ব্যক্তিগত চেম্বারে চিকিৎসা দেন।
        </p>
        <button onClick={onGoToChambers} className="mt-3 text-[13px] font-semibold text-brand-600">
          চেম্বার দেখুন →
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-[14px] font-semibold text-neutral-800">
        এই ডাক্তার যেসব হাসপাতালে ভিজিট করেন:
      </p>
      {links.map((link) =>
        link.hospitals ? (
          <Link
            key={link.id}
            href={`/hospitals/${link.hospitals.slug}`}
            className="mb-2 flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
          >
            {/* TODO.md Phase 9.1: cover_image_url was already being
                fetched by doctor-detail.ts's join but never rendered —
                this was a hardcoded empty gray box regardless of
                whether the hospital had a real photo. */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              {link.hospitals.cover_image_url && (
                <Image
                  src={link.hospitals.cover_image_url}
                  alt={getLocalizedField(link.hospitals.name_translations)}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-neutral-900">
                {getLocalizedField(link.hospitals.name_translations)}
              </p>
              {link.role && <p className="text-[12px] text-brand-600">{link.role}</p>}
              <p className="mt-1 text-[12px] text-brand-600">বিস্তারিত দেখুন →</p>
            </div>
          </Link>
        ) : null
      )}
    </div>
  );
}
