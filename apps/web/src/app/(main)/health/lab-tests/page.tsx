import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { LabTestsClient } from '@/components/lab-tests/LabTestsClient';
import { createClient } from '@/lib/supabase/server';
import { getPopularTests } from '@/lib/queries/test-search';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('labTests');
  return {
    title: `${t('pageTitle')} | Vytanexa`,
    description: t('metaDescription'),
  };
}

/**
 * Lab & Diagnostic Tests — VYTANEXA-BLUEPRINT.md § S10
 * (`/health/lab-tests`). Popular-test chips are fetched server-side
 * for the initial paint (spec's "critical for low-literacy UX" empty
 * state); the search itself is client-side + debounced against
 * `/api/test-search`.
 */
export default async function LabTestsPage() {
  const supabase = createClient();
  const [popularTests, t] = await Promise.all([getPopularTests(supabase), getT('labTests')]);

  return (
    <>
      <TopBarSection title={t('pageTitle')} />
      <LabTestsClient popularTests={popularTests} />
    </>
  );
}
