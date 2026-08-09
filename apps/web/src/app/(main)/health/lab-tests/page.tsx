import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { LabTestsClient } from '@/components/lab-tests/LabTestsClient';
import { createClient } from '@/lib/supabase/server';
import { getPopularTests } from '@/lib/queries/test-search';

export const metadata: Metadata = {
  title: 'ল্যাব ও ডায়াগনস্টিক টেস্ট | Vytanexa',
  description: 'CBC, X-Ray, USG সহ যেকোনো টেস্টের জন্য নিকটবর্তী ডায়াগনস্টিক সেন্টার খুঁজুন।',
};

/**
 * Lab & Diagnostic Tests — VYTANEXA-BLUEPRINT.md § S10
 * (`/health/lab-tests`). Popular-test chips are fetched server-side
 * for the initial paint (spec's "critical for low-literacy UX" empty
 * state); the search itself is client-side + debounced against
 * `/api/test-search`.
 */
export default async function LabTestsPage() {
  const supabase = createClient();
  const popularTests = await getPopularTests(supabase);

  return (
    <>
      <TopBarSection title="ল্যাব ও ডায়াগনস্টিক টেস্ট" />
      <LabTestsClient popularTests={popularTests} />
    </>
  );
}
