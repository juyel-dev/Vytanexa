import Link from 'next/link';
import Image from 'next/image';
import { Phone, Navigation } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';
import { FavoriteToggle } from './FavoriteToggle';

export type HospitalCardData = {
  id: string;
  slug: string;
  name_translations: Json;
  cover_image_url: string | null;
  type: string;
  has_emergency_dept: boolean;
  facility_tags: string[];
  phone: string;
  rating_avg: number;
  rating_count: number;
};const TYPE_LABELS: Record<string, string> = {
  hospital: 'হাসপাতাল',
  clinic: 'ক্লিনিক',
  diagnostic: 'ডায়াগনস্টিক',
  nursing_home: 'নার্সিং হোম',
};

const FACILITY_LABELS: Record<string, string> = {
  icu: '🩺 ICU',
  ambulance: '🚑 অ্যাম্বুলেন্স',
  emergency_24h: '🚨 ২৪/৭ জরুরি',
  blood_bank: '🩸 ব্লাড ব্যাংক',
};

/**
 * Hospital Card — VYTANEXA-BLUEPRINT.md § S08 "Hospital List — Full
 * Variant". Full-width list card, distinct from S04's compact
 * horizontal TrendingHospitals card (different context, different
 * information density needed).
 *
 * `matchedTestLabel` (optional) — VYTANEXA-BLUEPRINT.md § S10 "Result
 * Card": "same card system as Hospital compact card (S08) with one
 * addition: a confirmation line showing which searched test is
 * available there." Additive prop, undefined by default, so existing
 * S06/S08 call sites are unaffected.
 */
export function HospitalCard({
  hospital,
  matchedTestLabel,
}: {
  hospital: HospitalCardData;
  matchedTestLabel?: string;
}) {
  const name = getLocalizedField(hospital.name_translations);

  return (
    <div className="mx-4 mb-3 block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
      <Link
        href={`/hospitals/${hospital.slug}`}
        className="relative block h-[140px] w-full bg-neutral-100"
        aria-label={name}
      >
        {hospital.cover_image_url && (
          <Image
            src={hospital.cover_image_url}
            alt={name}
            fill
            sizes="100vw"
            className="object-cover"
          />
        )}
        {hospital.has_emergency_dept && (
          <span className="absolute right-2 top-2 rounded-full bg-emergency-600 px-2 py-1 text-[11px] font-semibold text-white">
            🚨 জরুরি বিভাগ
          </span>
        )}
        <div
          className="absolute left-2 top-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <FavoriteToggle entityType="hospital" entityId={hospital.id} />
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/hospitals/${hospital.slug}`}>
          <h3 className="text-[16px] font-bold text-neutral-900">{name}</h3>
        </Link>
        {matchedTestLabel && (
          <p className="mt-1 text-[12px] font-medium text-life-600">
            ✅ এই টেস্ট পাওয়া যায়: {matchedTestLabel}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">
            {TYPE_LABELS[hospital.type] ?? hospital.type}
          </span>
          {hospital.rating_count > 0 && (
            <span className="text-[12px] text-neutral-500">
              ⭐ {hospital.rating_avg} ({hospital.rating_count})
            </span>
          )}
        </div>

        {hospital.facility_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hospital.facility_tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600"
              >
                {FACILITY_LABELS[tag] ?? tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={`tel:${hospital.phone}`}
            className="flex h-9 items-center justify-center gap-1 rounded-md bg-brand-600 text-[12px] font-semibold text-white"
          >
            <Phone className="h-3.5 w-3.5" /> কল করুন
          </a>
          <Link
            href={`/hospitals/${hospital.slug}`}
            className="flex h-9 items-center justify-center gap-1 rounded-md border border-neutral-200 text-[12px] font-semibold text-neutral-700"
          >
            <Navigation className="h-3.5 w-3.5" /> বিস্তারিত
          </Link>
        </div>
      </div>
    </div>
  );
}
