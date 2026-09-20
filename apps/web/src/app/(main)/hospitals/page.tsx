import { Suspense } from 'react';
import { TopBarSection } from '@/components/layout/TopBar';
import { HospitalListClient } from '@/components/hospitals/HospitalListClient';
import { createClient } from '@/lib/supabase/server';
import { queryHospitalList } from '@/lib/queries/hospital-list';
import { getT } from '@vytanexa/i18n/server';

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

  const [{ data: hospitals, count }, t] = await Promise.all([
    queryHospitalList(supabase, {
      type: searchParams.type,
      emergencyOnly: searchParams.emergencyOnly === 'true',
      locationId: searchParams.district,
      page: 0,
    }),
    getT('hospital'),
  ]);

  return (
    <>
      <TopBarSection title={t('pageTitle')} />
      <Suspense fallback={null}>
        <HospitalListClient initialHospitals={hospitals} initialCount={count} />
      </Suspense>
    </>
  );
}
