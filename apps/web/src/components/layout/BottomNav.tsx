'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Stethoscope, Search, Building2, Menu, type LucideIcon } from 'lucide-react';

/**
 * Bottom Navigation — VYTANEXA-BLUEPRINT.md § S02 § 2.1
 *
 * 5 tabs: Home · Doctors · Search (center pill) · Hospitals · More.
 * Always visible — never hides on scroll (intentional accessibility
 * decision, documented in S02 § 8 "Scroll & Interaction Behavior").
 *
 * Icon note: the spec calls for separate filled/outline icon variants
 * per active state. Lucide (single-weight icon set) doesn't ship that
 * distinction, so active state is instead communicated via color
 * (brand-600) + a heavier stroke-width — a deliberate, documented
 * adaptation of the spec to the actual icon library in use, not a
 * missed detail.
 */

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  isCenter?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.home', icon: Home },
  { href: '/doctors', labelKey: 'nav.doctors', icon: Stethoscope },
  { href: '/search', labelKey: 'nav.search', icon: Search, isCenter: true },
  { href: '/hospitals', labelKey: 'nav.hospitals', icon: Building2 },
  { href: '/more', labelKey: 'nav.more', icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-navbar flex h-navbar items-stretch border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      aria-label="প্রধান নেভিগেশন"
    >
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon, isCenter }) => {
        const label = t(labelKey);
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-transform duration-100 active:scale-90"
            aria-current={isActive ? 'page' : undefined}
          >
            {isCenter ? (
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-brand-50' : ''
                }`}
              >
                <Icon
                  className={isActive ? 'text-brand-600' : 'text-neutral-400'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </span>
            ) : (
              <Icon
                className={`h-6 w-6 ${isActive ? 'text-brand-600' : 'text-neutral-400'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
            )}
            <span
              className={`text-[11px] ${
                isActive ? 'font-semibold text-brand-600' : 'font-normal text-neutral-400'
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
