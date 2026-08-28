import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { SeoBreadcrumbs } from '@/components/seo/SeoBreadcrumbs';
import { SeoFaq } from '@/components/seo/SeoFaq';
import { NearbyDistricts, OtherSpecialties } from '@/components/seo/SeoInternalLinks';
import { DoctorCard } from '@/components/shared/DoctorCard';
import { createClient } from '@/lib/supabase/server';
import { queryDoctorList } from '@/lib/queries/doctor-list';
import {
  getStateBySlug,
  getDistrictBySlug,
  getCategoryBySlug,
  getAllStates,
  getAllDistricts,
  getCategoriesWithDoctors,
  getDoctorCountForCategory,
  getSiblingDistricts,
  getOtherCategories,
  seoDisplayName,
} from '@/lib/queries/seo';
import {
  buildDistrictSpecialtySeo,
  buildSeoUrls,
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  buildFaqItems,
  buildFaqJsonLd,
} from '@/lib/seo-helpers';
import { getLocalizedField } from '@/lib/i18n';

export const revalidate = 21600;
export const dynamicParams = true;

/**
 * generateStaticParams — VYTANEXA-BLUEPRINT.md § S21:
 * SSG at build time for existing combinations, ISR 6hr for freshness,
 * dynamicParams true so new combos render on-demand.
 * Guardrail: only includes combos with doctor_count >= 1 (national).
 * Honest zero when locations/categories empty (CHECKPOINT.md §3).
 */
export async function generateStaticParams() {
  try {
    const supabase = createClient();
    const [states, districts, categories] = await Promise.all([
      getAllStates(supabase),
      getAllDistricts(supabase),
      getCategoriesWithDoctors(supabase),
    ]);

    if (states.length === 0 || districts.length === 0 || categories.length === 0) return [];

    const stateById = new Map(states.map((s) => [s.id, s]));
    const params: { state: string; district: string; specialty: string }[] = [];

    for (const d of districts) {
      const st = d.parent_id ? stateById.get(d.parent_id) : null;
      if (!st) continue;
      for (const cat of categories) {
        params.push({ state: st.slug, district: d.slug, specialty: cat.slug });
      }
    }

    return params;
  } catch {
    return [];
  }
}

async function loadSeoData(stateSlug: string, districtSlug: string, specialtySlug: string) {
  const supabase = createClient();

  const state = await getStateBySlug(supabase, stateSlug);
  if (!state) return null;

  const district = await getDistrictBySlug(supabase, districtSlug, state.id);
  if (!district) return null;

  const category = await getCategoryBySlug(supabase, specialtySlug);
  if (!category) return null;

  // Guardrail — national doctor count for this specialty
  const doctorCount = await getDoctorCountForCategory(supabase, category.id);
  if (doctorCount === 0) return null; // no empty SEO pages (S21 Guardrail)

  const [doctorsResult, siblings, otherCats] = await Promise.all([
    queryDoctorList(supabase, { specialty: category.slug, page: 0 }),
    getSiblingDistricts(supabase, state.id, district.id),
    getOtherCategories(supabase, category.id),
  ]);

  return {
    state,
    district,
    category,
    doctorCount,
    doctors: doctorsResult.data ?? [],
    totalCount: doctorsResult.count,
    siblings,
    otherCats,
  };
}

export async function generateMetadata({
  params,
}: {
  params: { state: string; district: string; specialty: string };
}): Promise<Metadata> {
  const data = await loadSeoData(params.state, params.district, params.specialty);
  if (!data) return { title: 'পাওয়া যায়নি | Vytanexa' };

  const stateName = seoDisplayName(data.state.name_translations);
  const districtName = seoDisplayName(data.district.name_translations);
  const specialtyName = getLocalizedField(data.category.name_translations);
  const seo = buildDistrictSpecialtySeo({
    state: stateName,
    district: districtName,
    specialty: specialtyName,
    doctor_count: data.doctorCount,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';
  const { canonical, alternates } = buildSeoUrls(appUrl, {
    state: params.state,
    district: params.district,
    specialty: params.specialty,
  });

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: 'website',
    },
  };
}

export default async function DistrictSpecialtyLandingPage({
  params,
}: {
  params: { state: string; district: string; specialty: string };
}) {
  const data = await loadSeoData(params.state, params.district, params.specialty);
  if (!data) notFound();

  const { state, district, category, doctorCount, doctors, siblings, otherCats } = data;
  const stateName = seoDisplayName(state.name_translations);
  const districtName = seoDisplayName(district.name_translations);
  const specialtyName = getLocalizedField(category.name_translations);
  const vars = { state: stateName, district: districtName, specialty: specialtyName, doctor_count: doctorCount };
  const seo = buildDistrictSpecialtySeo(vars);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';
  const faqs = buildFaqItems(vars);

  const breadcrumbLd = buildBreadcrumbJsonLd(appUrl, [
    { name: 'হোম', url: '/' },
    { name: stateName, url: `/${params.state}` },
    { name: districtName, url: `/${params.state}/${params.district}` },
    { name: specialtyName },
  ]);
  const itemListLd = buildItemListJsonLd(appUrl, seo.h1, doctors.map((d) => ({ slug: d.slug, name_translations: d.name_translations })));
  const faqLd = buildFaqJsonLd(faqs);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <TopBarSection title={specialtyName} />

      <SeoBreadcrumbs
        crumbs={[
          { label: 'হোম', href: '/' },
          { label: stateName, href: `/${params.state}` },
          { label: districtName, href: `/${params.state}/${params.district}` },
          { label: specialtyName },
        ]}
      />

      <div className="px-4 pt-2">
        <h1 className="text-[22px] font-bold leading-7 text-neutral-900">{seo.h1}</h1>
        <p className="mt-2 text-[14px] leading-6 text-neutral-600">{seo.intro}</p>
        <p className="mt-2 text-[13px] font-medium text-brand-700">
          {districtName} জেলায় {doctorCount} জন {specialtyName} বিশেষজ্ঞ
        </p>
      </div>

      {/* Doctor list — same query as S06, pre-filtered (S21 spec). */}
      <div className="mt-4">
        {doctors.length === 0 ? (
          <p className="mx-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-6 text-neutral-700">
            এই মুহূর্তে এই এলাকায় কোনো {specialtyName} বিশেষজ্ঞের প্রোফাইল প্রকাশিত নেই। নিচের তালিকায়
            অন্য এলাকার ভেরিফাইড ডাক্তাররা দেখানো হতে পারে — জেলা-স্তরের ফিল্টারিং চেম্বার ডেটা সক্রিয় হলে
            আরও নির্ভুল হবে।
          </p>
        ) : (
          <>
            {doctors.map((d) => (
              // DoctorCard expects categories.name_translations; the S21 query
              // includes categories via !inner join so shape already matches.
              // Cast to the card's expected row type (extra fields ignored).
              <DoctorCard
                key={d.id}
                doctor={
                  d as unknown as Parameters<typeof DoctorCard>[0]['doctor']
                }
              />
            ))}
            <div className="mx-4 mt-3 flex justify-center">
              <Link
                href={`/doctors?specialty=${category.slug}`}
                className="rounded-full border border-brand-200 bg-brand-50 px-5 py-2.5 text-[14px] font-semibold text-brand-700"
              >
                আরও {specialtyName} ডাক্তার দেখুন →
              </Link>
            </div>
          </>
        )}
      </div>

      <SeoFaq faqs={faqs} />

      <NearbyDistricts stateSlug={params.state} districts={siblings} />
      <OtherSpecialties
        stateSlug={params.state}
        districtSlug={params.district}
        categories={otherCats}
      />

      <div className="h-8" />
    </>
  );
}
