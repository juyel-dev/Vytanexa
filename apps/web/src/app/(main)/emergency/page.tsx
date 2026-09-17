import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { NationalNumbersSection } from '@/components/emergency/NationalNumbersSection';
import { EmergencyPageViewTracker } from '@/components/emergency/EmergencyPageViewTracker';
import { EmergencyDataSections } from '@/components/emergency/EmergencyDataSections';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('emergency');
  return {
    title: `${t('pageTitle')} | Vytanexa`,
    description: t('pageDescription'),
  };
}

/**
 * Emergency Page — VYTANEXA-BLUEPRINT.md § S12. "This is the one page
 * in the app that must work offline" — the page shell + national
 * numbers render with zero Supabase dependency (`NationalNumbersSection`
 * is pure hardcoded content), so they're available the instant the
 * shell paints, before any network request resolves, regardless of
 * how the (heavier, genuinely data-dependent) sections below load.
 * Full offline service-worker precaching is S22 PWA scope.
 *
 * `EmergencyDataSections` fetches via `/api/emergency-data` rather
 * than the browser Supabase client — see that route's comment for
 * why (bundle-size measurement, not a style preference).
 */
export default async function EmergencyPage() {
  const t = await getT('emergency');
  return (
    <div className="pb-6">
      <TopBarSection title={t('pageTitle')} />
      <EmergencyPageViewTracker />
      <NationalNumbersSection />
      <EmergencyDataSections />
    </div>
  );
}
