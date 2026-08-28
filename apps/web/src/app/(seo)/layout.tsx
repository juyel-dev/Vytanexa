import { MainChrome } from '@/components/layout/MainChrome';
import { FirstRunGate } from '@/components/layout/FirstRunGate';
import dynamic from 'next/dynamic';

const EmergencyFAB = dynamic(
  () => import('@/components/layout/EmergencyFAB').then((m) => m.EmergencyFAB),
  { ssr: false }
);

/**
 * (seo) route group layout — VYTANEXA-BLUEPRINT.md § S21.
 * Mirrors (main)/layout.tsx chrome: standard app nav + FAB, since the
 * spec's S21 wireframe shows "[Standard app chrome: topbar + bottom nav]".
 * FirstRunGate (onboarding redirect) is included for human visitors but
 * does not affect SSR-serialized content crawled by Googlebot.
 */
export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FirstRunGate />
      <MainChrome>{children}</MainChrome>
      <EmergencyFAB />
    </>
  );
}
