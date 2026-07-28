import { Suspense } from 'react';
import { TopBarSection } from '@/components/layout/TopBar';
import { HospitalListClient } from '@/components/hospitals/HospitalListClient';
import { createClient } from '@/lib/supabase/server';
import { queryHospitalList } from '@/lib/queries/hospital-list';

/**
 * Hospital List Page — VYTANEXA-BLUEPRINT.md § S08. Mirrors the SSR +
 * client-infinite-scroll architecture established in S06's Doctor List.
 */
export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = createClient();

  const { data: hospitals, count } = await queryHospitalList(supabase, {
    type: searchParams.type,
    emergencyOnly: searchParams.emergencyOnly === 'true',
    page: 0,
  });

  return (
    <>
      <TopBarSection title="হাসপাতাল" />
      <Suspense fallback={null}>
        <HospitalListClient initialHospitals={hospitals} initialCount={count} />
      </Suspense>
    </>
  );
}
