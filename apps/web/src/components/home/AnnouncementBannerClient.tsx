'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { safeHref } from '@/lib/safe-url';

export type BannerItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  target_url: string | null;
};

const DISMISS_KEY = 'vytanexa_dismissed_banners';

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

/**
 * Dismissible announcement banners — VYTANEXA-BLUEPRINT.md § S04 SEC-01
 * "dismissible". Dismissed IDs persist in localStorage so a closed
 * banner stays closed across reloads. Pure presentational client
 * wrapper: data still comes from the server component.
 */
export function AnnouncementBannerClient({ banners }: { banners: BannerItem[] }) {
  const tc = useT('common');
  // Start empty and read localStorage after mount: reading it in the
  // initializer made the first client render differ from the server HTML
  // (hydration mismatch) for anyone who had dismissed a banner.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    setDismissed(getDismissed());
  }, []);

  const visible = banners.filter((b) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      // Merge with what's stored (other tabs) and keep the list bounded.
      const merged = new Set([...getDismissed(), ...next]);
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...merged].slice(-100)));
    } catch {
      // storage full/blocked — banner just reappears next visit
    }
  };

  return (
    <section className="flex flex-col gap-2 px-4 pt-2">
      {visible.map((banner) => {
        const isEmergency = banner.type === 'emergency';
        const href = safeHref(banner.target_url);
        const isExternal = !!href && /^https?:/i.test(href);
        const body = (
          <>
            {isEmergency ? (
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emergency-600" />
            ) : (
              <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-neutral-900">{banner.title}</p>
              <p className="line-clamp-2 text-[13px] text-neutral-600">{banner.body}</p>
            </div>
          </>
        );
        // The close button is a sibling of the link (a <button> nested in
        // an <a> is invalid HTML and unreliable for keyboard/AT users).
        return (
          <div
            key={banner.id}
            role={isEmergency ? 'alert' : undefined}
            className={`flex items-start gap-1 rounded-md border-l-4 p-3 ${
              isEmergency
                ? 'border-emergency-600 bg-emergency-50'
                : 'border-brand-600 bg-brand-50'
            }`}
          >
            {href ? (
              <Link
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="flex min-w-0 flex-1 items-start gap-2"
              >
                {body}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-2">{body}</div>
            )}
            <button
              type="button"
              onClick={() => dismiss(banner.id)}
              aria-label={tc('close')}
              className="shrink-0 rounded p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
