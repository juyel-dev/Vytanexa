'use client';

import { useEffect } from 'react';
import Image from 'next/image';

type Ad = {
  id: string;
  image_url: string;
  target_url: string;
  sponsor_name: string;
};

function track(event_type: 'ad_impression' | 'ad_click', adId: string) {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ event_type, entity_type: 'ads', entity_id: adId }),
  }).catch(() => {
    // Analytics failures should never block the user's navigation — fire-and-forget by design.
  });
}

/**
 * Native Ad (interactive part) — VYTANEXA-BLUEPRINT.md § S04 SEC-07:
 * "impression+click tracked." The parent NativeAd.tsx does the server-
 * side pick; this client wrapper exists only because tracking needs
 * `useEffect` (impression, once on mount) and `onClick` (a Server
 * Component `<a>` can't carry an event handler) — matches
 * HeroBannerSliderClient's split for the same reason.
 */
export function NativeAdClient({ ad, label }: { ad: Ad; label: string }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per ad shown, not on every render
  useEffect(() => {
    track('ad_impression', ad.id);
  }, [ad.id]);

  return (
    <section className="px-4 py-2">
      <p className="mb-1 text-right text-[11px] text-neutral-400">{label}</p>
      <a
        href={ad.target_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => track('ad_click', ad.id)}
        className="block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
      >
        <div className="relative aspect-[16/6] w-full">
          <Image src={ad.image_url} alt={ad.sponsor_name} fill sizes="100vw" className="object-cover" />
        </div>
      </a>
    </section>
  );
}
