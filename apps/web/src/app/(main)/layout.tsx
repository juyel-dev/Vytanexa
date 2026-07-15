import { BottomNav } from '@/components/layout/BottomNav';

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
      <div className="pb-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
