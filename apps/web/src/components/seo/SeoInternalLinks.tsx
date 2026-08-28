import Link from 'next/link';
import type { SeoLocation, SeoCategory } from '@/lib/queries/seo';
import { getLocalizedField } from '@/lib/i18n';

export function NearbyDistricts({
  stateSlug,
  districts,
}: {
  stateSlug: string;
  districts: SeoLocation[];
}) {
  if (districts.length === 0) return null;
  return (
    <section className="mx-4 mt-6">
      <h2 className="text-[14px] font-bold text-neutral-800">আশেপাশের এলাকা</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {districts.map((d) => (
          <Link
            key={d.id}
            href={`/${stateSlug}/${d.slug}`}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700"
          >
            {getLocalizedField(d.name_translations)}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OtherSpecialties({
  stateSlug,
  districtSlug,
  categories,
}: {
  stateSlug: string;
  districtSlug: string;
  categories: SeoCategory[];
}) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-4 mt-6">
      <h2 className="text-[14px] font-bold text-neutral-800">অন্যান্য বিভাগ</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/${stateSlug}/${districtSlug}/${c.slug}`}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700"
          >
            {getLocalizedField(c.name_translations)}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StateDistrictList({
  stateSlug,
  districts,
}: {
  stateSlug: string;
  districts: SeoLocation[];
}) {
  if (districts.length === 0) {
    return (
      <p className="mx-4 mt-4 text-[13px] text-neutral-500">
        এই রাজ্যে এখনো কোনো জেলা যোগ করা হয়নি। অ্যাডমিন প্যানেল থেকে যোগ করা হলে এখানে দেখা যাবে।
      </p>
    );
  }
  return (
    <section className="mx-4 mt-4">
      <h2 className="text-[14px] font-bold text-neutral-800">জেলা অনুযায়ী খুঁজুন</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {districts.map((d) => (
          <Link
            key={d.id}
            href={`/${stateSlug}/${d.slug}`}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-center text-[14px] font-semibold text-neutral-800 hover:border-brand-300 hover:text-brand-700"
          >
            {getLocalizedField(d.name_translations)}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StateSpecialtyGrid({
  categories,
}: {
  categories: SeoCategory[];
}) {
  // Generic specialty quick-links from a state / district hub — links to
  // the specialist search filtered nationally (district-specialty pages
  // themselves are per-district; this is a shortcut overview).
  if (categories.length === 0) return null;
  return (
    <section className="mx-4 mt-6">
      <h2 className="text-[14px] font-bold text-neutral-800">বিশেষজ্ঞ অনুযায়ী খুঁজুন</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/doctors?specialty=${c.slug}`}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:border-brand-200 hover:text-brand-700"
          >
            {getLocalizedField(c.name_translations)}
          </Link>
        ))}
      </div>
    </section>
  );
}
