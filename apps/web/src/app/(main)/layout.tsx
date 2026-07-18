import { BottomNav } from '@/components/layout/BottomNav';
import { FirstRunGate } from '@/components/layout/FirstRunGate';
import dynamic from 'next/dynamic';

// Code-split: EmergencyFAB pulls in the browser Supabase client for its
// on-demand sheet queries, which pushed the home page's first-load JS
// past S22's 150KB budget (measured: 175KB with a static import).
// The FAB button itself doesn't need to be part of the critical
// first-paint bundle -- it loads asynchronously right after, which is
// imperceptible to the user but keeps the initial bundle lean.
const EmergencyFAB = dynamic(
  () => import('@/components/layout/EmergencyFAB').then((m) => m.EmergencyFAB),
  { ssr: false }
);

/**
 * (main) route group layout — VYTANEXA-BLUEPRINT.md § S02 § 3.1
 * Wraps every screen that has the bottom nav + top bar chrome: Home,
 * Search, Doctors, Hospitals, Symptoms, Community, More, etc.
 * TopBar is intentionally NOT injected here — its variant differs per
 * page (S02 § 2.2), so each page renders its own.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FirstRunGate />
      <div className="pb-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <EmergencyFAB />
      <BottomNav />
    </>
  );
}
