'use client';

import { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

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
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());

  const visible = banners.filter((b) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    } catch {
      // storage full/blocked — banner just reappears next visit
    }
  };

  return (
    <section className="flex flex-col gap-2 px-4 pt-2">
      {visible.map((banner) => {
        const isEmergency = banner.type === 'emergency';
        const content = (
          <div
            className={`flex items-start gap-2 rounded-md border-l-4 p-3 ${
              isEmergency
                ? 'border-emergency-600 bg-emergency-50'
                : 'border-brand-600 bg-brand-50'
            }`}
          >
            {isEmergency ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-emergency-600" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-neutral-900">{banner.title}</p>
              <p className="line-clamp-2 text-[13px] text-neutral-600">{banner.body}</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss(banner.id);
              }}
              aria-label="বন্ধ করুন"
              className="shrink-0 rounded p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
        return banner.target_url ? (
          <a key={banner.id} href={banner.target_url}>
            {content}
          </a>
        ) : (
          <div key={banner.id}>{content}</div>
        );
      })}
    </section>
  );
}
