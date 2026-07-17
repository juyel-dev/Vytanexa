import Link from 'next/link';
import { Star, Phone, MessageCircle } from 'lucide-react';
import type { Json } from '@vytanexa/database';
import { getLocalizedField } from '@/lib/i18n';

export type DoctorCardData = {
  id: string;
  slug: string;
  name_translations: Json;
  photo_url: string | null;
  experience_years: number;
  rating_avg: number;
  rating_count: number;
  consultation_fee_min: number | null;
  consultation_fee_max: number | null;
  is_featured: boolean;
  whatsapp_number: string | null;
  categories: { name_translations: Json } | null;
};

/**
 * Doctor Card — VYTANEXA-BLUEPRINT.md § S06 "Doctor Card — Full
 * Variant" (pragmatic first implementation: this component is reused
 * across S04 Popular Doctors, and later S05/S06 results — some fields
 * from the full spec (live chamber availability chip, primary-chamber
 * location) are deferred until chambers are fetched alongside doctors
 * in the screens that need that; this version covers what's knowable
 * from the `doctors` table alone, which is everywhere this card is
 * used today).
 */
export function DoctorCard({ doctor }: { doctor: DoctorCardData }) {
  const name = getLocalizedField(doctor.name_translations);
  const specialty = doctor.categories
    ? getLocalizedField(doctor.categories.name_translations)
    : '';
  const initials = name.slice(0, 1) || 'D';
  const feeText =
    doctor.consultation_fee_min != null
      ? doctor.consultation_fee_max != null &&
        doctor.consultation_fee_max !== doctor.consultation_fee_min
        ? `₹${doctor.consultation_fee_min}-${doctor.consultation_fee_max}`
        : `₹${doctor.consultation_fee_min}`
      : null;

  return (
    <div className="relative mx-4 mb-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
      {doctor.is_featured && (
        <span className="absolute -top-2 right-3 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
          PRO
        </span>
      )}
      <div className="flex gap-3">
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-600 ring-1 ring-brand-100">
          {doctor.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar-sized, next/image overhead not worth it here
            <img
              src={doctor.photo_url}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-bold text-neutral-900">{name}</h3>
          {specialty && (
            <p className="text-[14px] font-medium text-brand-600">{specialty}</p>
          )}
          <p className="text-[13px] text-neutral-500">{doctor.experience_years}+ বছর অভিজ্ঞতা</p>
          {doctor.rating_count > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent-500 text-accent-500" />
              <span className="text-[14px] font-bold text-neutral-800">
                {doctor.rating_avg}
              </span>
              <span className="text-[13px] text-neutral-500">
                ({doctor.rating_count} রিভিউ)
              </span>
            </div>
          )}
        </div>
      </div>

      {feeText && (
        <span className="mt-3 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-[12px] font-semibold text-neutral-700">
          💰 ভিজিট: {feeText}
        </span>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {doctor.whatsapp_number ? (
          <a
            href={`https://wa.me/${doctor.whatsapp_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center justify-center gap-1 rounded-md bg-life-600 text-[13px] font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        ) : (
          <span className="col-span-1" />
        )}
        <a
          href={`tel:${doctor.whatsapp_number ?? ''}`}
          className="flex h-10 items-center justify-center gap-1 rounded-md bg-brand-600 text-[13px] font-semibold text-white"
        >
          <Phone className="h-4 w-4" /> কল করুন
        </a>
        <Link
          href={`/doctors/${doctor.slug}`}
          className="flex h-10 items-center justify-center rounded-md border border-neutral-200 text-[13px] font-semibold text-neutral-700"
        >
          বিস্তারিত
        </Link>
      </div>
    </div>
  );
}
