import { Suspense } from 'react';
import { TopBarSection } from '@/components/layout/TopBar';
import { DoctorListClient } from '@/components/doctors/DoctorListClient';
import { createClient } from '@/lib/supabase/server';
import { queryDoctorList } from '@/lib/queries/doctor-list';

/**
 * Doctor List Page — VYTANEXA-BLUEPRINT.md § S06. SSR renders page 0
 * (server-side, no client JS needed for first paint — good for SEO/
 * slow connections per S22's performance stance); DoctorListClient
 * takes over from there for filter/sort navigation and infinite
 * scroll continuation.
 */
export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = createClient();

  const [{ data: doctors, count }, { data: categories }] = await Promise.all([
    queryDoctorList(supabase, {
      specialty: searchParams.specialty,
      feeMin: searchParams.feeMin ? Number(searchParams.feeMin) : undefined,
      feeMax: searchParams.feeMax ? Number(searchParams.feeMax) : undefined,
      rating: searchParams.rating,
      languages: searchParams.languages,
      sort: searchParams.sort as never,
      page: 0,
    }),
    supabase
      .from('categories')
      .select('id, slug, name_translations')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ]);

  return (
    <>
      <TopBarSection title="ডাক্তার খুঁজুন" />
      <Suspense fallback={null}>
        <DoctorListClient
          initialDoctors={doctors}
          initialCount={count}
          categories={categories ?? []}
        />
      </Suspense>
    </>
  );
}
