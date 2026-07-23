'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';

/**
 * Conditional Main Chrome — VYTANEXA-BLUEPRINT.md § S07 "Sticky Bottom
 * Action Bar": "Detail pages hide bottom nav, this bar takes its
 * place — full width." Doctor/hospital/symptom detail pages replace
 * the global nav with their own full-width sticky action bar instead
 * of stacking both, which would overlap and waste vertical space on
 * exactly the small screens this app targets. The reserved bottom
 * padding is skipped too on those routes — each detail page manages
 * its own spacing for its own sticky bar (see DoctorProfileClient's
 * `pb-24` wrapper).
 */
const DETAIL_PAGE_PATTERNS = [/^\/doctors\/[^/]+$/, /^\/hospitals\/[^/]+$/, /^\/symptoms\/[^/]+$/];

export function MainChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDetailPage = DETAIL_PAGE_PATTERNS.some((pattern) => pattern.test(pathname));

  return (
    <>
      <div
        className={
          isDetailPage ? '' : 'pb-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))]'
        }
      >
        {children}
      </div>
      {!isDetailPage && <BottomNav />}
    </>
  );
}
