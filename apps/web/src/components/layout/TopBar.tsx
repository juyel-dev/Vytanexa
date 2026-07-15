'use client';

import Link from 'next/link';
import { Search, Bell, ChevronLeft } from 'lucide-react';

/**
 * Top App Bar — VYTANEXA-BLUEPRINT.md § S02 § 2.2
 * Only Variant A (Home) and Variant B (List/Section) implemented in
 * this pass — Variant C (scroll-reactive detail), D (search input),
 * and E (modal/sheet) get built alongside the screens that need them
 * (S07 Doctor Profile, S05 Search) rather than speculatively now.
 */

export function TopBarHome() {
  return (
    <header className="sticky top-0 z-topbar flex h-topbar items-center justify-between border-b border-neutral-100 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
          V
        </div>
        <span className="font-sans text-lg font-bold text-brand-600">Vytanexa</span>
      </div>
      <div className="flex items-center">
        <Link
          href="/search"
          aria-label="সার্চ"
          className="flex h-11 w-11 items-center justify-center text-neutral-600"
        >
          <Search className="h-6 w-6" />
        </Link>
        <Link
          href="/notifications"
          aria-label="নোটিফিকেশন"
          className="relative flex h-11 w-11 items-center justify-center text-neutral-600"
        >
          <Bell className="h-6 w-6" />
          {/* Unread badge wires up once the notifications table has
              real read-state tracking (S20) — intentionally omitted
              for now rather than faked. */}
        </Link>
      </div>
    </header>
  );
}

export function TopBarSection({
  title,
  backHref = '/',
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-topbar flex h-topbar items-center border-b border-neutral-100 bg-white px-2 shadow-sm">
      <Link
        href={backHref}
        aria-label="পেছনে যান"
        className="flex h-11 w-11 items-center justify-center text-neutral-700"
      >
        <ChevronLeft className="h-6 w-6" />
      </Link>
      <h1 className="flex-1 text-center font-sans text-[17px] font-semibold text-neutral-900">
        {title}
      </h1>
      {/* Right-side spacer keeps the title visually centered against
          the fixed-width back button on the left */}
      <div className="h-11 w-11" />
    </header>
  );
}
