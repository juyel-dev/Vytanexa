'use client';

import { useTranslations } from 'next-intl';
import { Bell, Search } from 'lucide-react';

/**
 * Admin TopBar — ADMIN-PANEL-SPEC.md § A01 "Layout Shell":
 * breadcrumb-style page title (left), primary action button (right),
 * admin avatar + name/role (far right). 64px tall, desktop-first.
 *
 * The search + bell icons are honest placeholders for now — real search
 * binding and the badge count wiring (A03 attention counts) are separate
 * screens' scope; neither pretends to be functional yet.
 */
export function TopBar({
  session,
}: {
  session: { name: string; role: string };
}) {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const initials = session.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex h-14 items-center border-b border-admin-border bg-white px-6">
      <div className="flex items-center gap-2 text-admin-small text-neutral-500">
        <span>Vytanexa</span>
        <span aria-hidden>›</span>
        <span className="font-medium text-neutral-800">{tNav('dashboardHome')}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-md border border-admin-border px-3 text-admin-body text-neutral-600 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Search className="h-4 w-4" /> {tCommon('search')}
        </button>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-admin-border text-neutral-600 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          aria-label={tNav('notifications')}
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          className="ml-1 flex h-9 items-center gap-2 pl-1 pr-3"
          aria-label={session.name}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-admin-small font-semibold text-brand-700" aria-hidden>
            {initials}
          </span>
          <span className="flex flex-col">
            <span className="text-admin-small font-medium leading-4 text-neutral-800">{session.name}</span>
            <span className="text-[11px] leading-4 text-neutral-500">{session.role}</span>
          </span>
        </div>
      </div>
    </header>
  );
}