import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { SeoBreadcrumbs } from '@/components/seo/SeoBreadcrumbs';
import { NearbyDistricts } from '@/components/seo/SeoInternalLinks';
import { createClient } from '@/lib/supabase/server';
import {
  getStateBySlug,
  getDistrictBySlug,
  getAllStates,
  getAllDistricts,
  getSiblingDistricts,
  getAllActiveCategories,
  getCategoriesWithDoctors,
  seoDisplayName,
} from '@/lib/queries/seo';
import { buildDistrictSeo, buildSeoUrls, buildBreadcrumbJsonLd } from '@/lib/seo-helpers';
import { getLocalizedField } from '@/lib/i18n';

export const revalidate = 21600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const supabase = createClient();
    const [states, districts] = await Promise.all([getAllStates(supabase), getAllDistricts(supabase)]);
    const byState = new Map<string, { id: string; slug: string }>();
    for (const s of states) byState.set(s.id, { id: s.id, slug: s.slug });
    // Emit every real state→district pairing that exists in DB.
    const params: { state: string; district: string }[] = [];
    for (const d of districts) {
      const parent = d.parent_id ? byState.get(d.parent_id) : null;
      if (parent) params.push({ state: parent.slug, district: d.slug });
    }
    return params;
  } catch {
    return [];
  }
}

async function loadDistrict(stateSlug: string, districtSlug: string) {
  const supabase = createClient();
  const state = await getStateBySlug(supabase, stateSlug);
  if (!state) return null;
  const district = await getDistrictBySlug(supabase, districtSlug, state.id);
  if (!district) return null;
  const [siblings, categories] = await Promise.all([
    getSiblingDistricts(supabase, state.id, district.id),
    getCategoriesWithDoctors(supabase),
  ]);
  // Also fetch a light fallback if categoriesWithDoctors is empty (empty DB)
  const fallbackCats = categories.length === 0 ? await getAllActiveCategories(supabase) : [];
  return {
    state,
    district,
    siblings,
    categories: categories.length > 0 ? categories : fallbackCats,
  };
}

export async function generateMetadata({
  params,
}: {
  params: { state: string; district: string };
}): Promise<Metadata> {
  const data = await loadDistrict(params.state, params.district);
  if (!data) return { title: 'জেলা পাওয়া যায়নি | Vytanexa' };

  const districtName = seoDisplayName(data.district.name_translations);
  const seo = buildDistrictSeo({
    state: seoDisplayName(data.state.name_translations),
    district: districtName,
    specialty: '',
    doctor_count: 0,
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';
  const { canonical, alternates } = buildSeoUrls(appUrl, {
    state: params.state,
    district: params.district,
  });

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical, languages: alternates },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: 'website',
    },
  };
}

export default async function DistrictHubPage({
  params,
}: {
  params: { state: string; district: string };
}) {
  const data = await loadDistrict(params.state, params.district);
  if (!data) notFound();

  const { state, district, siblings, categories } = data;
  const stateName = seoDisplayName(state.name_translations);
  const districtName = seoDisplayName(district.name_translations);
  const seo = buildDistrictSeo({
    state: stateName,
    district: districtName,
    specialty: '',
    doctor_count: 0,
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';

  const breadcrumbLd = buildBreadcrumbJsonLd(appUrl, [
    { name: 'হোম', url: '/' },
    { name: stateName, url: `/${params.state}` },
    { name: districtName },
  ]);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <TopBarSection title={districtName} />

      <SeoBreadcrumbs
        crumbs={[
          { label: 'হোম', href: '/' },
          { label: stateName, href: `/${params.state}` },
          { label: districtName },
        ]}
      />

      <div className="px-4 pt-2">
        <h1 className="text-[22px] font-bold leading-7 text-neutral-900">{seo.h1}</h1>
        <p className="mt-2 text-[14px] leading-6 text-neutral-600">{seo.intro}</p>
      </div>

      {/* Specialty grid — main internal linking: each tile → district+specialty long-tail page */}
      {categories.length > 0 ? (
        <section className="mx-4 mt-6">
          <h2 className="text-[14px] font-bold text-neutral-800">বিশেষজ্ঞ অনুযায়ী খুঁজুন</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/${params.state}/${params.district}/${c.slug}`}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-4 text-center hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="text-[14px] font-semibold text-neutral-800">
                  {getLocalizedField(c.name_translations)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className="mx-4 mt-6 text-[13px] text-neutral-500">এখনো কোনো বিশেষজ্ঞ বিভাগ যোগ করা হয়নি।</p>
      )}

      <NearbyDistricts stateSlug={params.state} districts={siblings} />

      <section className="mx-4 mt-8 rounded-xl bg-brand-50 p-4">
        <p className="text-[13px] leading-6 text-neutral-700">
          আরও ফিল্টার, রেটিং ও ফি অনুযায়ী সাজাতে মূল ডাক্তার তালিকা দেখুন।
        </p>
        <Link
          href="/doctors"
          className="mt-3 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          সব ডাক্তার দেখুন →
        </Link>
      </section>

      <div className="h-8" />
    </>
  );
}
