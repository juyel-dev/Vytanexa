import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { SeoBreadcrumbs } from '@/components/seo/SeoBreadcrumbs';
import { StateDistrictList, StateSpecialtyGrid } from '@/components/seo/SeoInternalLinks';
import { createClient } from '@/lib/supabase/server';
import {
  getStateBySlug,
  getDistrictsForState,
  getAllStates,
  getAllActiveCategories,
  seoDisplayName,
} from '@/lib/queries/seo';
import { buildStateSeo, buildSeoUrls, buildBreadcrumbJsonLd } from '@/lib/seo-helpers';

export const revalidate = 21600; // 6hr — VYTANEXA-BLUEPRINT.md § S21 "ISR revalidate 6hr"
export const dynamicParams = true;

export async function generateStaticParams() {
  // Empty locations table → honest zero pages (CHECKPOINT.md §3).
  try {
    const supabase = createClient();
    const states = await getAllStates(supabase);
    return states.map((s) => ({ state: s.slug }));
  } catch {
    return [];
  }
}

async function loadState(stateSlug: string) {
  const supabase = createClient();
  const state = await getStateBySlug(supabase, stateSlug);
  if (!state) return null;
  const [districts, categories] = await Promise.all([
    getDistrictsForState(supabase, state.id),
    getAllActiveCategories(supabase),
  ]);
  return { state, districts, categories };
}

export async function generateMetadata({
  params,
}: {
  params: { state: string };
}): Promise<Metadata> {
  const data = await loadState(params.state);
  if (!data) return { title: 'রাজ্য পাওয়া যায়নি | Vytanexa' };

  const stateName = seoDisplayName(data.state.name_translations);
  const seo = buildStateSeo({ state: stateName, district: '', specialty: '', doctor_count: 0 });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';
  const { canonical, alternates } = buildSeoUrls(appUrl, { state: params.state });

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

export default async function StateHubPage({ params }: { params: { state: string } }) {
  const data = await loadState(params.state);
  if (!data) notFound();

  const { state, districts, categories } = data;
  const stateName = seoDisplayName(state.name_translations);
  const seo = buildStateSeo({ state: stateName, district: '', specialty: '', doctor_count: 0 });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';

  const breadcrumbLd = buildBreadcrumbJsonLd(appUrl, [
    { name: 'হোম', url: '/' },
    { name: stateName },
  ]);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- static JSON-LD we constructed ourselves */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <TopBarSection title={stateName} />

      <SeoBreadcrumbs
        crumbs={[
          { label: 'হোম', href: '/' },
          { label: stateName },
        ]}
      />

      <div className="px-4 pt-2">
        <h1 className="text-[22px] font-bold leading-7 text-neutral-900">{seo.h1}</h1>
        <p className="mt-2 text-[14px] leading-6 text-neutral-600">{seo.intro}</p>
      </div>

      <StateDistrictList stateSlug={params.state} districts={districts} />

      <StateSpecialtyGrid categories={categories} />

      {/* Trust band — content-rich shell, not a thin doorway page */}
      <section className="mx-4 mt-8 rounded-xl bg-brand-50 p-4">
        <h2 className="text-[14px] font-bold text-brand-800">Vytanexa কীভাবে সাহায্য করে</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-6 text-neutral-700">
          <li>ভেরিফাইড ডাক্তার প্রোফাইল ও রিভিউ</li>
          <li>চেম্বার সময়সূচি ও সরাসরি যোগাযোগ</li>
          <li>হাসপাতাল, ল্যাব টেস্ট ও জরুরি সেবা এক জায়গায়</li>
        </ul>
        <Link
          href="/doctors"
          className="mt-4 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          সব ডাক্তার দেখুন →
        </Link>
      </section>

      <div className="h-8" />
    </>
  );
}
