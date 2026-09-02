'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { NAV_GROUPS } from '@/lib/nav-config';
import type { AppRole } from '@/lib/supabase/auth-verify';

/**
 * Admin Sidebar — ADMIN-PANEL-SPEC.md § A01 "Layout Shell" + § A02
 * "Sidebar Navigation Map". 240px expanded, collapsible to 64px
 * icon-only mode for smaller laptop screens (desktop-first per A01).
 * Role-based item visibility: items with `roles` render only for
 * those roles — the UX-level half of defense in depth (the other half
 * is `requireRole()` on every server mutation route).
 *
 * Collapse state is local (`useState`) — deliberate: it's ephemeral
 * chrome state, and keeping it here avoids threading it through the
 * (server) layout as props.
 */
export function AdminSidebar({
  session,
  badgeCounts,
}: {
  session: { role: AppRole; name: string };
  // TODO.md Phase 9.4: live counts keyed by href, merged over
  // NAV_GROUPS' static badgeCount at render time — see
  // lib/moderation-counts.ts for why the static field alone could
  // never actually show anything.
  badgeCounts?: Record<string, number>;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const toggle = () => setCollapsed((c) => !c);

  // Sign-out goes through a POST Route Handler — a plain client-side
  // fetch so no navigation/frame interop is needed from the sidebar.
  const handleSignOut = async () => {
    await fetch('/api/admin/sign-out', { method: 'POST' }).catch(() => {});
    router.push('/login');
    router.refresh();
  };

  const visibleGroups = NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || i.roles.includes(session.role)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={`sticky top-0 z-[300] flex h-dvh shrink-0 flex-col border-r border-admin-border bg-white transition-[width] duration-200 ${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
      aria-label="প্রশাসন সাইডবার"
    >
      {/* Logo row */}
      <div className="flex h-14 items-center overflow-hidden border-b border-admin-border px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          V
        </div>
        {/* TODO.md Phase 10: these used to be `{!collapsed && <span>...}`
            — conditionally mounting/unmounting DOM nodes on every
            toggle instead of a CSS transition. That's what was
            crashing with a React removeChild NotFoundError: a browser
            extension (visible in the reported console log —
            chext_loader.js is not part of this app's bundle) injects
            its own nodes into the page, and React's insert/remove
            churn on every collapse toggle collided with it. Using
            width+opacity CSS instead of add/remove means React never
            touches these nodes' presence in the DOM at all — the
            crash class is gone regardless of what extensions are
            installed, and the collapse is now an actual smooth
            transition instead of an abrupt pop. */}
        <span
          className={`ml-2 truncate text-admin-h2 text-neutral-900 transition-[opacity,width] duration-200 ${
            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}
        >
          Vytanexa Admin
        </span>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        aria-label={collapsed ? 'সাইডবার সম্প্রসারিত করুন' : 'সাইডবার সংকুচিত করুন'}
        className="absolute -right-3 top-[58px] flex h-6 w-6 items-center justify-center rounded-full border border-admin-border bg-white text-neutral-500 hover:text-neutral-800"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3">
        {visibleGroups.map((group) => (
          <div key={group.labelKey} className="px-2">
            <p
              className={`overflow-hidden whitespace-nowrap px-3 pt-2 text-admin-small uppercase tracking-wide text-neutral-400 transition-[height,opacity] duration-200 ${
                collapsed ? 'h-0 opacity-0' : 'h-6 pb-1 opacity-100'
              }`}
            >
              {t(group.labelKey)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const liveCount = badgeCounts?.[item.href] ?? item.badgeCount;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? t(item.labelKey) : undefined}
                      className={`flex h-9 items-center gap-3 overflow-hidden rounded-md px-3 text-admin-body transition-colors ${
                        isActive
                          ? 'bg-brand-50 font-semibold text-brand-700'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="shrink-0 text-[16px]" aria-hidden>
                        {item.icon}
                      </span>
                      <span
                        className={`truncate transition-[opacity,width] duration-200 ${
                          collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                        }`}
                      >
                        {t(item.labelKey)}
                        {liveCount !== undefined && liveCount > 0 && (
                          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emergency-600 px-1 text-[11px] font-bold text-white">
                            {liveCount > 99 ? '99+' : liveCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: session + sign-out */}
      <div className="border-t border-admin-border p-2">
        <div
          className={`overflow-hidden px-2 transition-[height,opacity] duration-200 ${
            collapsed ? 'h-0 opacity-0' : 'h-11 pb-2 opacity-100'
          }`}
        >
          <p className="truncate text-admin-body font-medium text-neutral-900">{session.name}</p>
          <p className="truncate text-admin-small text-neutral-500">{session.role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex h-9 w-full items-center gap-3 overflow-hidden rounded-md px-3 text-admin-body text-neutral-600 hover:bg-neutral-50"
        >
          <span aria-hidden>🚪</span>
          <span
            className={`whitespace-nowrap transition-[opacity,width] duration-200 ${
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            }`}
          >
            {t('nav.signOut')}
          </span>
        </button>
      </div>
    </aside>
  );
}