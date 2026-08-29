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
export function AdminSidebar({ session }: { session: { role: AppRole; name: string } }) {
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
      className={`fixed inset-y-0 left-0 z-[300] flex flex-col border-r border-admin-border bg-white transition-[width] duration-200 ${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
      aria-label="প্রশাসন সাইডবার"
    >
      {/* Logo row */}
      <div className="flex h-14 items-center border-b border-admin-border px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          V
        </div>
        {!collapsed && (
          <span className="ml-2 truncate text-admin-h2 text-neutral-900">Vytanexa Admin</span>
        )}
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
            {!collapsed && (
              <p className="px-3 pb-1 pt-2 text-admin-small uppercase tracking-wide text-neutral-400">
                {t(group.labelKey)}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? t(item.labelKey) : undefined}
                      className={`flex h-9 items-center gap-3 rounded-md px-3 text-admin-body transition-colors ${
                        isActive
                          ? 'bg-brand-50 font-semibold text-brand-700'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="shrink-0 text-[16px]" aria-hidden>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="truncate">
                          {t(item.labelKey)}
                          {item.badgeCount !== undefined && item.badgeCount > 0 && (
                            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emergency-600 px-1 text-[11px] font-bold text-white">
                              {item.badgeCount > 99 ? '99+' : item.badgeCount}
                            </span>
                          )}
                        </span>
                      )}
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
        {!collapsed && (
          <div className="px-2 pb-2">
            <p className="truncate text-admin-body font-medium text-neutral-900">{session.name}</p>
            <p className="truncate text-admin-small text-neutral-500">{session.role}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-admin-body text-neutral-600 hover:bg-neutral-50"
        >
          <span aria-hidden>🚪</span>
          {!collapsed && t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}