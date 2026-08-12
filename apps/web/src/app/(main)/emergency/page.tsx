import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { NationalNumbersSection } from '@/components/emergency/NationalNumbersSection';
import { EmergencyPageViewTracker } from '@/components/emergency/EmergencyPageViewTracker';
import { EmergencyDataSections } from '@/components/emergency/EmergencyDataSections';

export const metadata: Metadata = {
  title: 'জরুরি সেবা | Vytanexa',
  description: 'জাতীয় জরুরি নম্বর, নিকটবর্তী হাসপাতাল, ব্লাড ব্যাংক ও অ্যাম্বুলেন্স সেবা — এক জায়গায়।',
};

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
export default function EmergencyPage() {
  return (
    <div className="pb-6">
      <TopBarSection title="জরুরি সেবা" />
      <EmergencyPageViewTracker />
      <NationalNumbersSection />
      <EmergencyDataSections />
    </div>
  );
}
